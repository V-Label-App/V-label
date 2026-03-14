import { Router } from 'express';
import { ReviewerController } from '../controllers/reviewer.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Reviewer routes (only accessible by REVIEWER role)
router.use(requireRole(['REVIEWER','MANAGER']));

router.get('/projects', ReviewerController.getMyProjects);
router.get('/queue', ReviewerController.getReviewQueue);
router.get('/stats', ReviewerController.getStats);
router.get('/assignments/:assignmentId', ReviewerController.getAssignmentDetail);
router.post('/assignments/:assignmentId/approve', ReviewerController.approveTask);
router.post('/assignments/:assignmentId/reject', ReviewerController.rejectTask);

export default router;
