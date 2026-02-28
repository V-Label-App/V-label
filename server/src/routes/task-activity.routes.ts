import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { TaskActivityService } from '../services/task-activity.service.js';
import { TaskAction } from '@prisma/client';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/v1/projects/:projectId/activities
 * Get all activities for a project (paginated)
 */
router.get('/projects/:projectId/activities', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params as { projectId: string };
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const action = req.query.action as TaskAction | undefined;
    const userId = req.query.userId as string | undefined;

    const result = await TaskActivityService.getProjectActivities(projectId, {
      page,
      limit,
      ...(action && { action }),
      ...(userId && { userId }),
    });

    return res.json(result);
  } catch (error) {
    logger.error('API', 'Get project activities failed', { error });
    return res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * GET /api/v1/projects/:projectId/activities/recent
 * Get recent activities for dashboard feed
 */
router.get('/projects/:projectId/activities/recent', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params as { projectId: string };
    const limit = parseInt(req.query.limit as string) || 10;

    const activities = await TaskActivityService.getRecentActivities(projectId, limit);

    return res.json(activities);
  } catch (error) {
    logger.error('API', 'Get recent activities failed', { error });
    return res.status(500).json({ error: 'Failed to fetch recent activities' });
  }
});

/**
 * GET /api/v1/projects/:projectId/activities/stats
 * Get activity statistics for a project
 */
router.get('/projects/:projectId/activities/stats', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params as { projectId: string };

    const stats = await TaskActivityService.getActivityStats(projectId);

    return res.json(stats);
  } catch (error) {
    logger.error('API', 'Get activity stats failed', { error });
    return res.status(500).json({ error: 'Failed to fetch activity stats' });
  }
});

/**
 * GET /api/v1/tasks/:taskId/activities
 * Get all activities for a specific task
 */
router.get('/tasks/:taskId/activities', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params as { taskId: string };
    const limit = parseInt(req.query.limit as string) || 50;

    const activities = await TaskActivityService.getTaskActivities(taskId, limit);

    return res.json(activities);
  } catch (error) {
    logger.error('API', 'Get task activities failed', { error });
    return res.status(500).json({ error: 'Failed to fetch task activities' });
  }
});

export default router;
