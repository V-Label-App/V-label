import { Request, Response } from 'express';
import { ReviewerService } from '../services/reviewer.service.js';
import { AssignmentStatus } from '@prisma/client';
import logger from '../utils/logger.js';

export class ReviewerController {
    /**
     * GET /api/v1/reviewer/projects
     * Get all projects where user is a member as Reviewer
     */
    static async getMyProjects(req: Request, res: Response) {
        try {
            const userId = (req as any).user.sub || (req as any).user.id;
            const projects = await ReviewerService.getMyProjects(userId);
            return res.json(projects);
        } catch (error) {
            logger.error('API', 'Get reviewer projects failed', { error });
            return res.status(500).json({ error: 'Failed to fetch projects' });
        }
    }

    /**
     * GET /api/v1/reviewer/queue
     * Get review queue (tasks submitted for review)
     */
    static async getReviewQueue(req: Request, res: Response) {
        try {
            const userId = (req as any).user.sub || (req as any).user.id;
            const projectId = req.query.projectId as string | undefined;
            const statusParam = req.query.status as string | undefined;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            // Only pass status if it's valid
            const status = statusParam ? (statusParam as AssignmentStatus) : undefined;

            const result = await ReviewerService.getReviewQueue(userId, {
                ...(projectId && { projectId }),
                ...(status && { status }),
                page,
                limit
            });

            return res.json(result);
        } catch (error) {
            logger.error('API', 'Get review queue failed', { error });
            return res.status(500).json({ error: 'Failed to fetch review queue' });
        }
    }

    /**
     * GET /api/v1/reviewer/assignments/:assignmentId
     * Get assignment detail for review
     */
    static async getAssignmentDetail(req: Request, res: Response) {
        try {
            const userId = (req as any).user.sub || (req as any).user.id;
            const assignmentId = req.params.assignmentId as string;

            if (!assignmentId) {
                return res.status(400).json({ error: 'Assignment ID is required' });
            }

            const result = await ReviewerService.getAssignmentDetail(assignmentId, userId);
            return res.json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            if (message.includes('not found')) {
                return res.status(404).json({ error: message });
            }
            logger.error('API', 'Get assignment detail failed', { error });
            return res.status(500).json({ error: 'Failed to fetch assignment detail' });
        }
    }

    /**
     * POST /api/v1/reviewer/assignments/:assignmentId/approve
     * Approve a task assignment
     */
    static async approveTask(req: Request, res: Response) {
        try {
            const userId = (req as any).user.sub || (req as any).user.id;
            const assignmentId = req.params.assignmentId as string;
            const { reviewComment } = req.body;

            if (!assignmentId) {
                return res.status(400).json({ error: 'Assignment ID is required' });
            }

            const result = await ReviewerService.approveTask(
                assignmentId,
                userId,
                reviewComment
            );

            logger.info('API', 'Task approved', { assignmentId, reviewerId: userId });
            return res.json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            if (message.includes('not found') || message.includes('not submitted')) {
                return res.status(404).json({ error: message });
            }
            logger.error('API', 'Approve task failed', { error });
            return res.status(500).json({ error: 'Failed to approve task' });
        }
    }

    /**
     * POST /api/v1/reviewer/assignments/:assignmentId/reject
     * Reject a task assignment
     */
    static async rejectTask(req: Request, res: Response) {
        try {
            const userId = (req as any).user.sub || (req as any).user.id;
            const assignmentId = req.params.assignmentId as string;
            const { reviewComment } = req.body;

            if (!assignmentId) {
                return res.status(400).json({ error: 'Assignment ID is required' });
            }

            if (!reviewComment || reviewComment.trim() === '') {
                return res.status(400).json({ error: 'Review comment is required when rejecting a task' });
            }

            const result = await ReviewerService.rejectTask(assignmentId, userId, reviewComment);

            logger.info('API', 'Task rejected', { assignmentId, reviewerId: userId });
            return res.json(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            if (message.includes('not found') || message.includes('not submitted')) {
                return res.status(404).json({ error: message });
            }
            if (message.includes('required')) {
                return res.status(400).json({ error: message });
            }
            logger.error('API', 'Reject task failed', { error });
            return res.status(500).json({ error: 'Failed to reject task' });
        }
    }

    /**
     * GET /api/v1/reviewer/stats
     * Get reviewer statistics
     */
    static async getStats(req: Request, res: Response) {
        try {
            const userId = (req as any).user.sub || (req as any).user.id;
            const stats = await ReviewerService.getStats(userId);
            return res.json(stats);
        } catch (error) {
            logger.error('API', 'Get reviewer stats failed', { error });
            return res.status(500).json({ error: 'Failed to fetch reviewer stats' });
        }
    }
}
