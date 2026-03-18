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

/**
 * GET /api/config/image-quality
 * Public endpoint for all authenticated users to read image quality config
 * Used by UploadImageDialog to apply quality gates
 */
router.get('/image-quality', authMiddleware, async (req, res) => {
    try {
        const config = await SystemConfigService.getImageQualityConfig();
        return res.json(config);
    } catch (error) {
        console.error('[Config] Get image quality config error:', error);
        return res.status(500).json({ error: 'Failed to fetch config' });
    }
});

/**
 * GET /api/config/otp
 * Public endpoint (no auth) — frontend checks if OTP is enabled before login
 */
router.get('/otp', async (req, res) => {
    try {
        const config = await SystemConfigService.getOtpConfig();
        return res.json({ enabled: config.enabled });
    } catch (error) {
        console.error('[Config] Get OTP config error:', error);
        return res.status(500).json({ error: 'Failed to fetch config' });
    }
});

export default router;
