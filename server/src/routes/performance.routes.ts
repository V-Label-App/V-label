import { Router } from 'express';
import { PerformanceController } from '../controllers/performance.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Performance routes (available for ANNOTATOR and REVIEWER)
router.use(requireRole(['ANNOTATOR', 'REVIEWER']));

router.get('/weekly-activity', PerformanceController.getWeeklyActivity);
router.get('/task-distribution', PerformanceController.getTaskDistribution);
router.get('/today-progress', PerformanceController.getTodayProgress);

export default router;
