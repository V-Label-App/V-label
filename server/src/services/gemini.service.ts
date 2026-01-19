import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { getRolePrompt, DEFAULT_SYSTEM_PROMPT } from '../config/rolePrompts.js';

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
    customRolePrompts?: Record<string, string>
  ) {
    try {
      // Build combined system prompt with priority logic
      const finalSystemPrompt = this.buildSystemPrompt(userRole, globalSystemPrompt, customRolePrompts, knowledgeBase);
      
      const model = this.genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: finalSystemPrompt
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
            // maxOutputTokens: 1000,
        },
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('[GeminiService] Error generating content:', error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
