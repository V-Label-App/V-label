import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { getRolePrompt, DEFAULT_SYSTEM_PROMPT } from '../config/rolePrompts.js';
import { ChatFunctionDefinition } from './system.config.service.js';
import { FunctionRegistry } from './ai/function.registry.js';

export class GeminiService {
    private genAI: GoogleGenerativeAI;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not defined in environment variables');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Build system prompt based on user role, custom role prompts, global prompt, and knowledge base
     * Priority: custom role prompt > global prompt > default role prompt
     */
    private buildSystemPrompt(
        userRole: string,
        globalPrompt?: string,
        customRolePrompts?: Record<string, string>,
        knowledgeBase?: string
    ): string {
        // Priority logic:
        // 1. Custom role prompt (from config.rolePrompts[role])
        // 2. Global system prompt (from config.systemPrompt)
        // 3. Default role prompt (from rolePrompts.ts)
        let systemPrompt =
            (customRolePrompts?.[userRole] ??  // Custom role prompt (use ?? to allow empty string)
                globalPrompt) ||                   // Global fallback
            getRolePrompt(userRole) ||         // Default from file
            DEFAULT_SYSTEM_PROMPT;             // Ultimate fallback

        // Append knowledge base if provided
        if (knowledgeBase?.trim()) {
            systemPrompt += `\n\n# Knowledge Base\n${knowledgeBase}`;
        }

        return systemPrompt;
    }

    /**
     * Generate text from a prompt (Chat Mode)
     * @param modelName - Gemini model to use (e.g., 'gemini-2.5-flash')
     * @param globalSystemPrompt - Global system prompt (optional, lower priority than custom role prompts)
     * @param history - Chat history
     * @param message - User message
     * @param temperature - Generation temperature (0.0-1.0)
     * @param userRole - User role for role-based prompts (MANAGER, ANNOTATOR, REVIEWER, ADMIN)
     * @param knowledgeBase - Additional documentation to inject into system prompt
     * @param customRolePrompts - Custom prompts per role (highest priority)
     */
    async chatCompletion(
        modelName: string,
        globalSystemPrompt: string | undefined,
        history: { role: 'user' | 'model'; parts: string }[],
        message: string,
        temperature: number = 0.7,
        userRole: string = 'ANNOTATOR',
        knowledgeBase?: string,
        customRolePrompts?: Record<string, string>,
        functions?: ChatFunctionDefinition[]
    ) {
        try {
            // Build combined system prompt with priority logic
            const finalSystemPrompt = this.buildSystemPrompt(userRole, globalSystemPrompt, customRolePrompts, knowledgeBase);

            // Force append Quick Replies instruction to ensure it works even with custom prompts
            const SYSTEM_INJECTION = `
# Quick Replies (CRITICAL)
At the end of EVERY response, provide 1 to 3 short follow-up options RELEVANT to the immediate context.
- Prioritize the next logical steps for the current workflow.
- If the user is mid-task, suggestions should be specific to completing that task.
- Format strictly as a JSON array wrapped in \`<<<REPLIES>>>\`.
Example: <<<REPLIES>>>["Next Step", "Alternative"]<<<REPLIES>>>

# Function Calling (CRITICAL)
- When user requests an action that has a corresponding function, call the function IMMEDIATELY.
- DO NOT ask for information if the function can handle missing parameters.
- Functions may return interactive forms to collect missing information.
- Example: If user says "create user", call create_user() right away - don't ask for email/password first.`;

            const augmentedSystemPrompt = finalSystemPrompt + SYSTEM_INJECTION;

            const tools = functions && functions.length > 0 ? [{
                functionDeclarations: functions.map(f => ({
                    name: f.name,
                    description: f.description,
                    parameters: f.parameters
                }))
            }] : undefined;

            const model = this.genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: augmentedSystemPrompt,
                tools: tools as any // Cast to avoid strict type issues with SDK versions
            });

            // Sanitize history: Google Gemini requires history to start with 'user' role.
            // If the first message is from 'model' (e.g., welcome message), we must remove it.
            let validHistory = history;
            if (validHistory && validHistory.length > 0 && validHistory[0]?.role === 'model') {
                validHistory = validHistory.slice(1);
            }

            const chat = model.startChat({
                history: validHistory.map(msg => ({
                    role: msg.role,
                    parts: [{ text: msg.parts || '' }]
                })),
                generationConfig: {
                    temperature,
                },
            });

            let result = await chat.sendMessage(message);
            let response = await result.response;
            let text = response.text(); // Attempt to get text. Might fail if only function call.

            // Handle Function Calls (Multi-turn loop)
            // Loop until model returns text (or max turns reached)
            let functionCalls = response.functionCalls();
            let turns = 0;
            const MAX_TURNS = 5;
            let lastFunctionMessage = ''; // Store the last message from a tool execution
            let lastFunctionResult: any = null; // Store raw function result for structured responses

            while (functionCalls && functionCalls.length > 0 && turns < MAX_TURNS) {
                turns++;
                const parts: any[] = [];

                for (const call of functionCalls) {
                    console.log(`[Gemini] Executing function: ${call.name}`);
                    try {
                        // Execute function via Registry
                        console.log(`[Gemini] Calling Registry with params:`, call.args);
                        const apiResponse = await FunctionRegistry.execute(call.name, call.args, { userRole });
                        console.log(`[Gemini] Registry execution result:`, apiResponse);

                        // Store raw result for potential structured response
                        lastFunctionResult = apiResponse;

                        // Capture message for fallback
                        if (apiResponse && typeof apiResponse === 'object' && apiResponse.message) {
                            lastFunctionMessage = apiResponse.message;
                        }

                        parts.push({
                            functionResponse: {
                                name: call.name,
                                response: apiResponse // Send raw object directly, removing { result: ... } wrapper
                            }
                        });
                    } catch (err: any) {
                        console.error(`[Gemini] Function execution failed: ${call.name}`, err);
                        parts.push({
                            functionResponse: {
                                name: call.name,
                                response: { error: err.message }
                            }
                        });
                    }
                }

                // Send function results back to the model
                console.log('[Gemini] Sending function response back to model:', JSON.stringify(parts, null, 2));
                result = await chat.sendMessage(parts);
                response = await result.response;

                // Log finish reason to debug why model might be silent
                console.log('[Gemini] Finish reason:', response.candidates?.[0]?.finishReason);

                functionCalls = response.functionCalls();
                try {
                    text = response.text();
                    console.log('[Gemini] Model response after function call:', text.replace(/\n/g, '\\n'));
                } catch (e) {
                    console.log('[Gemini] No text response yet, checking for more function calls...');
                    text = '';
                }
            }

            // Check if we have a structured AIResponse from function
            if (lastFunctionResult && typeof lastFunctionResult === 'object' && lastFunctionResult.type) {
                console.log('[Gemini] Function returned structured AIResponse');

                // Extract Quick Replies from Gemini's text if present
                const replyRegex = /<<<REPLIES>>>([\s\S]*?)<<<REPLIES>>>/;
                const match = text.match(replyRegex);

                if (match && match[1]) {
                    try {
                        const quickReplies = JSON.parse(match[1]);
                        console.log('[Gemini] Extracted Quick Replies:', quickReplies);

                        // Add Quick Replies to metadata
                        lastFunctionResult.metadata = {
                            ...lastFunctionResult.metadata,
                            quickReplies
                        };
                    } catch (e) {
                        console.error('[Gemini] Failed to parse Quick Replies from structured response:', e);
                    }
                }

                console.log('[Gemini] Returning structured AIResponse:', JSON.stringify(lastFunctionResult));
                return JSON.stringify(lastFunctionResult);
            }


            // Fallback: If text is empty but we executed functions, verify if we can return the raw function message
            if (!text && lastFunctionMessage) {
                console.warn('[Gemini] Model returned empty text. Using last function message as fallback.');
                return lastFunctionMessage;
            }

            if (!text && history.length > 0) {
                console.warn('[Gemini] Model returned empty text. Using generic fallback.');
                return "I executed the action, but I couldn't generate a verbal response. Please check the logs or try again.";
            }

            console.log('[Gemini] Final response text:', text.replace(/\n/g, '\\n'));
            return text;
        } catch (error) {
            console.error('[GeminiService] Error generating content:', error);
            throw error;
        }
    }
}

export const geminiService = new GeminiService();
