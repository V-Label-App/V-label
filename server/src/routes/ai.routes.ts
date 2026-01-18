import { Router } from 'express';
import { AIController } from '../controllers/ai.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// POST /api/v1/ai/chat/completion
router.post('/chat/completion', authMiddleware, AIController.chatCompletion);

// GET /api/v1/ai/config (For user widget, restricted data)
router.get('/config', authMiddleware, AIController.getConfig);

export default router;
