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
}
