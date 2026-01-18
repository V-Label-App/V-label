import { Request, Response } from 'express';
import { SystemConfigService } from '../services/system.config.service.js';

export class AdminController {
    /**
     * Get System Configuration (Chat Widget)
     */
    static async getChatConfig(req: Request, res: Response) {
        try {
            const config = await SystemConfigService.getChatConfig();
            return res.json(config);
        } catch (error) {
            console.error('[Admin] Get chat config error:', error);
            return res.status(500).json({ error: 'Failed to fetch config' });
        }
    }

    /**
     * Update System Configuration
     */
    static async updateChatConfig(req: Request, res: Response) {
        try {
            // TODO: Add stricter validation using Zod or similar
            const newConfig = req.body;
            const updated = await SystemConfigService.updateChatConfig(newConfig);
            return res.json(updated.value);
        } catch (error) {
            console.error('[Admin] Update chat config error:', error);
            return res.status(500).json({ error: 'Failed to update config' });
        }
    }
}
