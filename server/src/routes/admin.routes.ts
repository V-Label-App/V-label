import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// Base path will be defined in index.ts, likely /api/v1/admin

// Config Routes
router.get('/config/chat', authMiddleware, requireRole(['ADMIN']), AdminController.getChatConfig);
router.put('/config/chat', authMiddleware, requireRole(['ADMIN']), AdminController.updateChatConfig);

export default router;
