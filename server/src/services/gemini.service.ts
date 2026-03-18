import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { getRolePrompt, DEFAULT_SYSTEM_PROMPT } from '../config/rolePrompts.js';
import { ChatFunctionDefinition } from './system.config.service.js';
import { FunctionRegistry } from './ai/function.registry.js';

// Fallback model chain: if primary model is overloaded, try these in order
const FALLBACK_MODELS = ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash'];

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function is503(error: any): boolean {
    return (
        error?.status === 503 ||
        error?.statusText === 'Service Unavailable' ||
        error?.message?.includes('503') ||
        error?.message?.includes('Service Unavailable') ||
        error?.message?.includes('high demand')
    );
}

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
     * Retry a function up to maxRetries times on 503 errors,
     * with exponential backoff (1s → 2s → 4s).
     */
    private async withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
        let lastError: any;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await fn();
            } catch (err: any) {
                lastError = err;
                if (is503(err) && attempt < maxRetries - 1) {
                    const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
                    console.warn(`[Gemini] 503 on attempt ${attempt + 1}, retrying in ${delay}ms...`);
                    await sleep(delay);
                } else {
                    throw err;
                }
            }
        }
        throw lastError;
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
        functions?: ChatFunctionDefinition[],
        userId?: string
    ) {
        try {
            // Build combined system prompt with priority logic
            const finalSystemPrompt = this.buildSystemPrompt(userRole, globalSystemPrompt, customRolePrompts, knowledgeBase);

            // Add warning if no functions available
            const noFunctionsWarning = functions && functions.length === 0 ? `

# ⚠️ PERMISSION WARNING (CRITICAL)
**You currently have NO functions available to call.**
This means you CANNOT perform actions like:
- Creating users, labels, or categories
- Sending announcements
- Modifying system data

If user asks you to perform an action (create, update, delete, send, etc.), you MUST respond:
"Xin lỗi, bạn không có quyền sử dụng chức năng này. Các tính năng này hiện chưa được kích hoạt cho vai trò của bạn. Vui lòng liên hệ Admin để được cấp quyền truy cập."

DO NOT:
- Generate code or examples
- Pretend you can perform the action
- Say "I will do X" when you cannot

You CAN:
- Answer questions about the system
- Provide guidance and explanations
- Help users understand features
` : '';

            // Force append Quick Replies instruction to ensure it works even with custom prompts
            const SYSTEM_INJECTION = noFunctionsWarning + `
# Quick Replies (CRITICAL)
At the end of EVERY response, provide 1 to 3 short follow-up options RELEVANT to the immediate context.
- Prioritize the next logical steps for the current workflow.
- If the user is mid-task, suggestions should be specific to completing that task.
- Format strictly as a JSON array wrapped in \`<<<REPLIES>>>\`.
Example: <<<REPLIES>>>["Next Step", "Alternative"]<<<REPLIES>>>

# Function Calling (CRITICAL - CONFIRMATION REQUIRED)
**IMPORTANT: ALWAYS ask for confirmation BEFORE calling any function (except read-only functions)!**

READ-ONLY FUNCTIONS (No confirmation needed):
- get_all_labels, get_label_categories, get_users, get_user_count
- These functions only READ data, safe to call immediately

WRITE FUNCTIONS (Confirmation required):
- create_labels_auto, create_user, send_system_announcement, etc.
- These functions CREATE/UPDATE/DELETE data

WORKFLOW FOR WRITE FUNCTIONS:
1. User requests an action (e.g., "tạo 10 label cá")
2. YOU MUST PREPARE THE DETAILS FIRST:
   - Generate the EXACT list of items (don't say "sẽ tạo các label về cá" - list them: "Cá hồi, Cá ngừ, Cá rô...")
   - Determine target category
   - Count total items
3. THEN ASK FOR CONFIRMATION:
   - Show the detailed plan to user
   - Ask: "Bạn có muốn tôi thực hiện không?"
   - Provide Quick Replies: ["Xác nhận", "Hủy", "Sửa lại"]
4. Wait for user confirmation
5. ONLY call function if user confirms with: "xác nhận", "ok", "yes", "đồng ý", "tiếp tục", "✅"

**CRITICAL**: You MUST generate the actual label names BEFORE asking for confirmation. Do not ask for confirmation with vague descriptions.

CONFIRMATION DETECTION:
- Check conversation history to see if user already confirmed
- **CONFIRM** keywords: "xác nhận", "ok", "có", "yes", "đồng ý", "tiếp tục", "chắc chắn", "✅"
- **CANCEL** keywords: "hủy", "không", "thôi", "cancel", "no", "❌"
- If user cancels, respond: "Đã hủy thao tác. Bạn cần tôi giúp gì khác không?" with appropriate Quick Replies
- If user says "sửa lại" or "thay đổi", ask what they want to change

EXAMPLE:
User: "Tạo 10 label cá phổ biến"
AI: "Tôi sẽ tạo 10 labels về các loại cá phổ biến trong category Animals:
1. Cá hồi, 2. Cá ngừ, 3. Cá rô, 4. Cá chép, 5. Cá trê, 6. Cá basa, 7. Cá thu, 8. Cá mú, 9. Cá hồng, 10. Cá bơn

**Bạn có muốn tôi thực hiện không?**"
<<<REPLIES>>>["Xác nhận", "Hủy", "Sửa lại"]<<<REPLIES>>>

[Wait for user response]

User clicks: "Xác nhận"
AI: [NOW call create_labels_auto function]
"Đã tạo thành công 10 labels! ✓"

**NEVER call functions immediately without confirmation!**

- **IMPORTANT**: If you don't have a function available to perform the requested action, tell the user:
  "Xin lỗi, bạn không có quyền sử dụng chức năng này. Vui lòng liên hệ Admin để được cấp quyền."
- DO NOT generate code or pretend to perform the action if the function is not available.

# After Function Execution (CRITICAL)
- After calling a function, ALWAYS provide a brief summary or confirmation message.
- Describe what was done and the result in 1-2 sentences.
- Add Quick Replies for next steps.
- Example: "Tôi đã tạo thành công 10 labels cá phổ biến trong category Animals. Các label đã được thêm vào hệ thống."

# Labels are GLOBAL (CRITICAL for MANAGER/ADMIN)
- Labels are GLOBAL system resources, NOT tied to specific projects!
- When user asks about labels (view, create, list), NEVER ask "which project?"
- Labels can be used in ANY project after creation
- Functions: get_all_labels, create_labels_auto, get_label_categories work at SYSTEM level`;

            const augmentedSystemPrompt = finalSystemPrompt + SYSTEM_INJECTION;

            const tools = functions && functions.length > 0 ? [{
                functionDeclarations: functions.map(f => ({
                    name: f.name,
                    description: f.description,
                    parameters: f.parameters
                }))
            }] : undefined;

            // Sanitize history: Google Gemini requires history to start with 'user' role.
            // If the first message is from 'model' (e.g., welcome message), we must remove it.
            let validHistory = history;
            if (validHistory && validHistory.length > 0 && validHistory[0]?.role === 'model') {
                validHistory = validHistory.slice(1);
            }

            const buildChat = (name: string) => {
                const m = this.genAI.getGenerativeModel({
                    model: name,
                    systemInstruction: augmentedSystemPrompt,
                    tools: tools as any,
                });
                return m.startChat({
                    history: validHistory.map(msg => ({
                        role: msg.role,
                        parts: [{ text: msg.parts || '' }]
                    })),
                    generationConfig: { temperature },
                });
            };

            // Try primary model with retry, then fallback models
            const modelsToTry = [modelName, ...FALLBACK_MODELS];
            let result: any;
            let chat: any;
            let usedModel = modelName;

            for (const candidateModel of modelsToTry) {
                try {
                    const candidateChat = buildChat(candidateModel);
                    result = await this.withRetry(() => candidateChat.sendMessage(message));
                    chat = candidateChat;
                    usedModel = candidateModel;
                    if (candidateModel !== modelName) {
                        console.warn(`[Gemini] Fell back to model: ${candidateModel}`);
                    }
                    break;
                } catch (err: any) {
                    if (is503(err) && candidateModel !== modelsToTry[modelsToTry.length - 1]) {
                        console.warn(`[Gemini] Model ${candidateModel} unavailable, trying next fallback...`);
                        continue;
                    }
                    throw err;
                }
            }

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

                // Get list of available function names for validation
                const availableFunctionNames = functions?.map(f => f.name) || [];

                for (const call of functionCalls) {
                    console.log(`[Gemini] Executing function: ${call.name}`);
                    try {
                        // Check if function is available (enabled and role-permitted)
                        if (!availableFunctionNames.includes(call.name)) {
                            console.warn(`[Gemini] Function ${call.name} is not available (disabled or not permitted for this role)`);
                            parts.push({
                                functionResponse: {
                                    name: call.name,
                                    response: {
                                        error: `Function "${call.name}" is currently disabled or not available for your role. Please contact an administrator to enable this feature.`,
                                        disabled: true
                                    }
                                }
                            });
                            continue;
                        }

                        // Execute function via Registry
                        console.log(`[Gemini] Calling Registry with params:`, call.args);
                        const apiResponse = await FunctionRegistry.execute(call.name, call.args, { userRole, userId });
                        console.log(`[Gemini] Registry execution result:`, apiResponse);

                        // Store raw result for potential structured response
                        lastFunctionResult = apiResponse;
                        console.log('[Gemini] Function result type:', typeof apiResponse);
                        console.log('[Gemini] Function result has type property:', apiResponse?.type || 'NO TYPE');
                        console.log('[Gemini] Function result keys:', apiResponse && typeof apiResponse === 'object' ? Object.keys(apiResponse) : 'N/A');

                        // Capture message for fallback
                        if (apiResponse && typeof apiResponse === 'object' && apiResponse.message) {
                            lastFunctionMessage = apiResponse.message;
                        }

                        // Create a response that includes both structured data and a text hint for the model
                        const functionResponsePayload: any = { ...apiResponse };

                        // Add a text hint to help the model understand what to say
                        if (apiResponse && typeof apiResponse === 'object' && apiResponse.type) {
                            if (apiResponse.type === 'card' && apiResponse.content) {
                                const cardTitle = apiResponse.content.title || '';
                                const cardFields = apiResponse.content.fields || {};
                                const fieldSummary = Object.entries(cardFields)
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join(', ');
                                functionResponsePayload._textHint = `${cardTitle}. ${fieldSummary}`;
                            } else if (apiResponse.type === 'table' && apiResponse.content) {
                                const rowCount = apiResponse.content.rows?.length || 0;
                                functionResponsePayload._textHint = `Retrieved ${rowCount} items in table format`;
                            }
                        }

                        parts.push({
                            functionResponse: {
                                name: call.name,
                                response: functionResponsePayload
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

                // Extract Quick Replies from Gemini's text if present (only if text exists)
                if (text && text.trim()) {
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
                } else {
                    console.log('[Gemini] No text response from model, structured response will be returned without Quick Replies');
                }

                console.log('[Gemini] Returning structured AIResponse:', JSON.stringify(lastFunctionResult));
                return JSON.stringify(lastFunctionResult);
            }


            // Fallback: If text is empty but we executed functions successfully
            if (!text || text.trim() === '') {
                console.warn('[Gemini] Model returned empty text after function execution');

                // If we have a function result with a message property, use it
                if (lastFunctionMessage) {
                    console.log('[Gemini] Using lastFunctionMessage as fallback:', lastFunctionMessage);
                    return lastFunctionMessage;
                }

                // If we have any function result, try to extract meaningful message
                if (lastFunctionResult && typeof lastFunctionResult === 'object') {
                    // If it's a structured response with content, generate a summary
                    if (lastFunctionResult.type && lastFunctionResult.content) {
                        console.log('[Gemini] Generating summary from structured response');

                        // Return a default success message based on response type
                        switch (lastFunctionResult.type) {
                            case 'card':
                                const cardContent = lastFunctionResult.content as any;
                                const summaryMessage = cardContent.title || 'Action completed successfully';
                                return `${summaryMessage}\n\nCác chi tiết đã được cập nhật vào hệ thống.`;

                            case 'table':
                                return 'Dữ liệu đã được tải thành công. Vui lòng xem bảng bên dưới.';

                            case 'form':
                                return 'Vui lòng điền thông tin vào form bên dưới.';

                            default:
                                return 'Thao tác đã được thực hiện thành công.';
                        }
                    }

                    // Check for message property
                    if (lastFunctionResult.message) {
                        return lastFunctionResult.message;
                    }
                }

                // Last resort: generic fallback
                if (history.length > 0) {
                    console.warn('[Gemini] Using generic fallback message');
                    return "Tôi đã thực hiện thao tác, nhưng gặp lỗi khi tạo câu trả lời. Vui lòng kiểm tra lại hoặc thử lại.";
                }
            }

            console.log('[Gemini] Final response text:', text.replace(/\n/g, '\\n'));
            return text;
        } catch (error) {
            console.error('[GeminiService] Error generating content:', error);
            throw error;
        }
    }

    /**
     * Suggest bounding box annotations for an image using Gemini Vision
     */
    async suggestAnnotations(
        imageUrl: string,
        labels: Array<{ name: string; color?: string }>,
        imageWidth: number,
        imageHeight: number
    ): Promise<Array<{ label: string; x: number; y: number; width: number; height: number; confidence: number }>> {
        const labelNames = labels.map(l => l.name).join(', ');

        // Gemini Vision returns bounding boxes as normalized values 0-1000
        // Format: [ymin, xmin, ymax, xmax] normalized to 0-1000
        const prompt = `You are a precise image annotation expert. Your task is to detect objects in this image that match the given labels and draw tight bounding boxes around them.

Target labels: ${labelNames}

Rules:
- Only detect objects you are highly confident about (confidence >= 0.6)
- SKIP objects that are blurry, partially hidden, or too ambiguous to clearly identify
- SKIP objects where the bounding box cannot be drawn accurately
- Draw the box as tight as possible around the object boundary
- If the same label appears multiple times, include each instance separately
- label must be exactly one of: ${labelNames}
- box_2d format: [ymin, xmin, ymax, xmax] normalized to 0-1000

Return ONLY a valid JSON array, no markdown, no explanation.
Return [] if no objects qualify.

Example: [{"label":"cat","box_2d":[120,180,450,520],"confidence":0.91}]`;

        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0] as string;

        const model = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-pro',
            generationConfig: { thinkingConfig: { thinkingBudget: 5000 } } as any,
        });
        const result = await model.generateContent([
            prompt,
            { inlineData: { mimeType, data: base64 } }
        ]);

        const text = result.response.text().trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];

        try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(parsed)) return [];

            // Filter out low confidence and invalid items
            const valid = parsed.filter((item: any) =>
                item.box_2d && Array.isArray(item.box_2d) &&
                item.label && labelNames.includes(item.label) &&
                (item.confidence ?? 1) >= 0.6
            );

            // Convert normalized 0-1000 coords to pixel coordinates
            return valid.map((item: any) => {
                const [ymin, xmin, ymax, xmax] = item.box_2d || [0, 0, 0, 0];
                const x = Math.round((xmin / 1000) * imageWidth);
                const y = Math.round((ymin / 1000) * imageHeight);
                const width = Math.round(((xmax - xmin) / 1000) * imageWidth);
                const height = Math.round(((ymax - ymin) / 1000) * imageHeight);
                return {
                    label: item.label,
                    x,
                    y,
                    width,
                    height,
                    confidence: item.confidence ?? 0.8,
                };
            });
        } catch {
            return [];
        }
    }
}

export const geminiService = new GeminiService();
