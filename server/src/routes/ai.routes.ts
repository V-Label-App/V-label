import { Router } from 'express';
import { AIController } from '../controllers/ai.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// POST /api/v1/ai/chat/completion
router.post('/chat/completion', authMiddleware, AIController.chatCompletion);

// GET /api/v1/ai/config (For user widget, restricted data)
router.get('/config', authMiddleware, AIController.getConfig);

// GET /api/v1/ai/functions/registry (For admin function discovery)
router.get('/functions/registry', authMiddleware, AIController.getRegistry);

// POST /api/v1/ai/suggest-annotations (AI bounding box suggestions)
router.post('/suggest-annotations', authMiddleware, AIController.suggestAnnotations);

// POST /api/v1/ai/refactor-text (Refactor/improve text)
router.post('/refactor-text', authMiddleware, AIController.refactorText);

// POST /api/v1/ai/annotation-tips (Generate tips for annotator after AI suggest)
router.post('/annotation-tips', authMiddleware, AIController.generateAnnotationTips);

export default router;
