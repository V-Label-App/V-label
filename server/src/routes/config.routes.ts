import { Router } from 'express';
import { SystemConfigService } from '../services/system.config.service.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * GET /api/config/chat
 * Public endpoint for all authenticated users to read chat config
 * This allows sidebar navigation to check fullPageModeEnabled
 */
router.get('/chat', authMiddleware, async (req, res) => {
    try {
        const config = await SystemConfigService.getChatConfig();
        return res.json(config);
    } catch (error) {
        console.error('[Config] Get chat config error:', error);
        return res.status(500).json({ error: 'Failed to fetch config' });
    }
});

export default router;
