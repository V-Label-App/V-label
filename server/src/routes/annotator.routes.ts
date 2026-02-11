import { Router } from 'express';
import { AnnotatorController } from '../controllers/annotator.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// All routes require authentication AND Annotator role
router.use(authMiddleware);
router.use(requireRole(['ANNOTATOR']));

// Get my projects
router.get('/projects', AnnotatorController.getMyProjects);

// Get my tasks with filters
router.get('/tasks', AnnotatorController.getMyTasks);

// Get single task assignment
router.get('/tasks/:assignmentId', AnnotatorController.getTaskAssignment);

// Update task assignment (submit, add note, etc.)
router.patch('/tasks/:assignmentId', AnnotatorController.updateTaskAssignment);

export default router;
