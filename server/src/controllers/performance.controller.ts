import { Request, Response } from 'express';
import { PerformanceService } from '../services/performance.service.js';
import logger from '../utils/logger.js';

export class PerformanceController {
    /**
     * GET /api/v1/performance/weekly-activity
     * Get weekly task activity (completed vs rejected)
     */
    static async getWeeklyActivity(req: Request, res: Response) {
        try {
            const userId = (req as any).user.sub || (req as any).user.id;
            const data = await PerformanceService.getWeeklyActivity(userId);
            return res.json(data);
        } catch (error) {
            logger.error('API', 'Get weekly activity failed', { error });
            return res.status(500).json({ error: 'Failed to fetch weekly activity' });
        }
    }

    /**
     * GET /api/v1/performance/task-distribution
     * Get task status distribution
     */
    static async getTaskDistribution(req: Request, res: Response) {
        try {
            const userId = (req as any).user.sub || (req as any).user.id;
            const data = await PerformanceService.getTaskStatusDistribution(userId);
            return res.json(data);
        } catch (error) {
            logger.error('API', 'Get task distribution failed', { error });
            return res.status(500).json({ error: 'Failed to fetch task distribution' });
        }
    }

    /**
     * GET /api/v1/performance/today-progress
     * Get today's hourly progress
     */
    static async getTodayProgress(req: Request, res: Response) {
        try {
            const userId = (req as any).user.sub || (req as any).user.id;
            const data = await PerformanceService.getTodayProgress(userId);
            return res.json(data);
        } catch (error) {
            logger.error('API', 'Get today progress failed', { error });
            return res.status(500).json({ error: 'Failed to fetch today progress' });
        }
    }
}
