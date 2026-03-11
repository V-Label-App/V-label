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

      // Get ALL function names from database config (to check what's been configured)
      const allConfigFunctionNames = (config.functions || []).map(fn => fn.name);

      // Get enabled functions from database config (filtered by role)
      const enabledConfigFunctions = (config.functions || []).filter(fn =>
        fn.enabled &&
        fn.roles.includes(userRole)
      );

      // Get functions from FunctionRegistry that are NOT in config
      // (new functions that haven't been synced yet)
      const registryFunctions = FunctionRegistry.getDefinitions()
        .filter(fn => !allConfigFunctionNames.includes(fn.name))
        .map(fn => ({
          ...fn,
          enabled: true,
          roles: ['ADMIN', 'MANAGER', 'REVIEWER', 'ANNOTATOR']
        }));

      // Merge: enabled config functions + new registry functions
      const availableFunctions = [...enabledConfigFunctions, ...registryFunctions];

      // DEBUG: Log available functions
      console.log('[AI] ========== DEBUG INFO ==========');
      console.log('[AI] Model name:', config.modelName);
      console.log('[AI] User role:', userRole);
      console.log('[AI] Total config functions:', allConfigFunctionNames.length);
      console.log('[AI] Config function names:', allConfigFunctionNames);
      console.log('[AI] Enabled config functions:', enabledConfigFunctions.map(f => `${f.name} (roles: ${f.roles.join(',')})`));
      console.log('[AI] New registry functions:', registryFunctions.map(f => f.name));
      console.log('[AI] Total available functions:', availableFunctions.map(f => f.name));
      console.log('[AI] ====================================');

      // Warning: If no functions available, log it
      if (availableFunctions.length === 0 && allConfigFunctionNames.length > 0) {
        console.warn(`[AI] ⚠️  WARNING: User ${userRole} has NO available functions!`);
      }

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
        availableFunctions,     // NEW: Enabled functions for this role
        user?.sub               // User ID for function context
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

  /**
   * Suggest bounding box annotations for an image
   */
  static async suggestAnnotations(req: Request, res: Response) {
    try {
      const { imageUrl, labels, imageWidth, imageHeight } = req.body;

      if (!imageUrl || !labels || !Array.isArray(labels) || labels.length === 0) {
        return res.status(400).json({ error: 'imageUrl and labels array are required' });
      }

      const suggestions = await geminiService.suggestAnnotations(
        imageUrl,
        labels,
        imageWidth || 1000,
        imageHeight || 1000
      );

      return res.json({ suggestions });
    } catch (error: any) {
      console.error('[AI] Suggest annotations error:', error);
      return res.status(500).json({ error: 'Failed to generate annotation suggestions' });
    }
  }

  /**
   * Refactor/improve text using AI
   */
  static async refactorText(req: Request, res: Response) {
    try {
      const { text, context } = req.body;

      if (!text || text.trim() === '') {
        return res.status(400).json({ error: 'Text is required' });
      }

      // Get AI config
      const config = await SystemConfigService.getChatConfig();

      // Create a prompt to refactor the text
      const prompt = context
        ? `Please refine the following ${context} (e.g., reviewer feedback, annotator note, or labeling guideline). Make it more professional, constructive, and technically precise so the team can take accurate action, while preserving the original meaning:\n\n${text}`
        : `Please refine the following text for our data labeling workflow. Make it professional, clear, and actionable while preserving the original technical meaning:\n\n${text}`;

      const systemPrompt = `You are an AI Quality Assurance Assistant integrated into VLabel, an enterprise data labeling platform.
                            Your task is to refine user inputs to make them professional, constructive, clear, and concise.
                            If it is a Reviewer's rejection comment, make it constructive and actionable without sounding aggressive.
                            If it is an Annotator's note, make it clear and easy for the Reviewer to understand the issue.
                            Preserve all original technical details, intent, and object names.
                            Return ONLY the improved text without any explanations, formatting tags, Quick Replies, or additional commentary.
                            DO NOT include <<<REPLIES>>> markers in your response.`;

      // Call Gemini with simple prompt
      let refactoredText = await geminiService.chatCompletion(
        config.modelName || 'gemini-2.0-flash-exp',
        systemPrompt,
        [],
        prompt,
        0.7,
        'MANAGER',
        undefined,
        undefined,
        [],
        (req as any).user?.sub
      );

      // Remove Quick Replies if present (format: <<<REPLIES>>>["option1", "option2"]<<<REPLIES>>>)
      const repliesPattern = /<<<REPLIES>>>.*?<<<REPLIES>>>/gs;
      refactoredText = refactoredText.replace(repliesPattern, '').trim();

      return res.json({ refactoredText });

    } catch (error: any) {
      console.error('[AI] Refactor text error:', error);

      if (error.message?.includes('404') || error.message?.includes('not found')) {
        return res.status(400).json({ error: 'The configured AI model was not found. Please contact Admin.' });
      }

      return res.status(500).json({ error: 'Failed to refactor text' });
    }
  }
}
