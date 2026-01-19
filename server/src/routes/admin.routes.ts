import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// Base path will be defined in index.ts, likely /api/v1/admin

// Config Routes
router.get('/config/chat', authMiddleware, requireRole(['ADMIN']), AdminController.getChatConfig);
router.put('/config/chat', authMiddleware, requireRole(['ADMIN']), AdminController.updateChatConfig);

// Audit Log Config Routes
router.get('/config/audit-log', authMiddleware, requireRole(['ADMIN']), AdminController.getAuditLogConfig);
router.put('/config/audit-log', authMiddleware, requireRole(['ADMIN']), AdminController.updateAuditLogConfig);
router.post('/logs/cleanup', authMiddleware, requireRole(['ADMIN']), AdminController.cleanUpLogs);

// Email Config Routes
router.get('/config/email', authMiddleware, requireRole(['ADMIN']), AdminController.getEmailConfig);
router.put('/config/email', authMiddleware, requireRole(['ADMIN']), AdminController.updateEmailConfig);

// Email Template Routes
router.get('/email/templates', authMiddleware, requireRole(['ADMIN']), AdminController.getEmailTemplates);
router.post('/email/templates', authMiddleware, requireRole(['ADMIN']), AdminController.upsertEmailTemplate);
router.delete('/email/templates/:type', authMiddleware, requireRole(['ADMIN']), AdminController.deleteEmailTemplate);

// Email Log Routes
router.get('/email/logs', authMiddleware, requireRole(['ADMIN']), AdminController.getEmailLogs);
router.delete('/email/logs', authMiddleware, requireRole(['ADMIN']), AdminController.clearEmailLogs);
router.delete('/email/logs/:id', authMiddleware, requireRole(['ADMIN']), AdminController.deleteEmailLog);

export default router;
