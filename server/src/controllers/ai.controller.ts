import { Request, Response } from 'express';
import { geminiService } from '../services/gemini.service.js';
import { SystemConfigService } from '../services/system.config.service.js';
import { FunctionRegistry } from '../services/ai/function.registry.js';

export class AIController {
  
  static async chatCompletion(req: Request, res: Response) {
    try {
      const { message, history } = req.body;

      // 1. Get Config
      const config = await SystemConfigService.getChatConfig();

      // 2. Check if enabled (Bypass for Admin to allow live testing)
      const user = (req as any).user;
      const isAdmin = user?.role === 'ADMIN';

      if (!config.enabled && !isAdmin) {
        return res.status(403).json({ error: 'AI Chat is currently disabled by the administrator.' });
      }

      // 3. Extract user role for role-based prompts
      const userRole = user?.role || 'ANNOTATOR'; // Fallback to ANNOTATOR role

      // Filter functions available for this role
      const availableFunctions = (config.functions || []).filter(fn => 
        fn.enabled && 
        fn.roles.includes(userRole)
      );

      // 4. Call Gemini with role-based prompt, knowledge base, custom role prompts, and functions
      const responseText = await geminiService.chatCompletion(
        config.modelName,
        config.systemPrompt,   // Global prompt (lower priority than custom role prompts)
        history || [],
        message,
        config.temperature,
        userRole,
        config.knowledgeBase,
        config.rolePrompts,     // Custom role-specific prompts
        availableFunctions      // NEW: Enabled functions for this role
      );

      return res.json({ text: responseText });

    } catch (error: any) {
      console.error('[AI] Chat completion error:', error);
      
      // Better error message for model not found
      if (error.message?.includes('404') || error.message?.includes('not found')) {
         return res.status(400).json({ error: 'The configured AI model was not found. Please contact Admin.' });
      }

      return res.status(500).json({ error: 'Failed to generate response' });
    }
  }

  /**
   * Get public/user-facing config
   */
  static async getConfig(req: Request, res: Response) {
    try {
        const config = await SystemConfigService.getChatConfig();
        // Return only safe fields
        return res.json({
            enabled: config.enabled,
            ui: config.ui
            // Exclude modelName, systemPrompt, temperature, etc.
        });
    } catch (error) {
        console.error('[AI] Get config error:', error);
        return res.status(500).json({ error: 'Failed to fetch config' });
    }
  }

  /**
   * Get all registered backend functions metadata
   */
  static async getRegistry(req: Request, res: Response) {
    try {
        const definitions = FunctionRegistry.getDefinitions();
        return res.json(definitions);
    } catch (error) {
        console.error('[AI] Get registry error:', error);
        return res.status(500).json({ error: 'Failed to fetch function registry' });
    }
  }
}
