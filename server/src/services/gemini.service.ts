import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

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
   * Generate text from a prompt (Chat Mode)
   */
  async chatCompletion(
    modelName: string, 
    systemPrompt: string, 
    history: { role: 'user' | 'model'; parts: string }[], 
    message: string,
    temperature: number = 0.7
  ) {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: systemPrompt 
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
