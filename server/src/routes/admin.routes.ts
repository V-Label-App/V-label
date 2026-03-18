import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';
import notificationTemplateRoutes from './admin/notification-template.routes.js';

const router = Router();

// Notification Template Routes
router.use('/notifications/templates', notificationTemplateRoutes);

// Base path will be defined in index.ts, likely /api/v1/admin

// Dashboard Stats Route
router.get('/dashboard/stats', authMiddleware, requireRole(['ADMIN']), AdminController.getDashboardStats);

// Config Routes
router.get('/config/chat', authMiddleware, requireRole(['ADMIN']), AdminController.getChatConfig);
router.put('/config/chat', authMiddleware, requireRole(['ADMIN']), AdminController.updateChatConfig);
router.get('/config/chat/defaults', authMiddleware, requireRole(['ADMIN']), AdminController.getDefaultRolePrompts);

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

// Cloudinary Usage
router.get('/cloudinary-usage', authMiddleware, requireRole(['ADMIN']), AdminController.getCloudinaryUsage);
router.get('/cloudinary-resources', authMiddleware, requireRole(['ADMIN']), AdminController.getCloudinaryResources);

// Image Quality Config
router.get('/config/image-quality', authMiddleware, requireRole(['ADMIN']), AdminController.getImageQualityConfig);
router.put('/config/image-quality', authMiddleware, requireRole(['ADMIN']), AdminController.updateImageQualityConfig);

// OTP Login Config
router.get('/config/otp', authMiddleware, requireRole(['ADMIN']), AdminController.getOtpConfig);
router.put('/config/otp', authMiddleware, requireRole(['ADMIN']), AdminController.updateOtpConfig);

export default router;
