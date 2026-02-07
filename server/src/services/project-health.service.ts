
import { prisma } from '../utils/database.js';
import { TaskStatus, AssignmentStatus } from '@prisma/client';

export class ProjectHealthService {
    /**
     * Get Stuck Tasks: IN_PROGRESS > 24 hours
     */
    static async getStuckTasks(projectId: string) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        return await prisma.taskAssignment.findMany({
            where: {
                task: { projectId },
                status: AssignmentStatus.IN_PROGRESS,
                updatedAt: { lt: twentyFourHoursAgo },
            },
            include: {
                task: true,
                annotator: {
                    select: { id: true, fullName: true, email: true, avatarUrl: true },
                },
            },
            orderBy: { updatedAt: 'asc' }, // Oldest first
        });
    }

    /**
     * Get Problematic Tasks: Rejected >= 2 times
     */
    static async getProblematicTasks(projectId: string) {
        return await prisma.taskAssignment.findMany({
            where: {
                task: { projectId },
                rejectionCount: { gte: 2 },
                status: { not: AssignmentStatus.APPROVED }, // Still not resolved
            },
            include: {
                task: true,
                annotator: {
                    select: { id: true, fullName: true, email: true, avatarUrl: true },
                },
                reviewer: {
                    select: { id: true, fullName: true, email: true, avatarUrl: true },
                }
            },
            orderBy: { rejectionCount: 'desc' },
        });
    }

    /**
     * Get Orphaned Tasks: TODO status but meaningful deadline or old age
     * Definition:
     * 1. Status is TODO
     * 2. AND (Deadline is within 24h OR Created > 7 days ago)
     */
    static async getOrphanedTasks(projectId: string) {
        const twentyFourHoursFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        // Task model doesn't have createdAt, so we can only filter by deadline for now
        // or add createdAt to Task model (out of scope for quick breakthrough)

        return await prisma.task.findMany({
            where: {
                projectId,
                status: TaskStatus.TODO,
                assignments: { none: {} }, // confirm no active assignments
                deadline: { lte: twentyFourHoursFromNow }, // Near deadline
            },
            // orderBy: { createdAt: 'asc' }, // Removed: createdAt missing on Task
        });
    }

    /**
     * Get Aggregated Health Stats
     */
    static async getProjectHealthStats(projectId: string) {
        const [stuckCount, problematicCount, orphanedCount] = await Promise.all([
            this.getStuckTasks(projectId).then((r) => r.length),
            this.getProblematicTasks(projectId).then((r) => r.length),
            this.getOrphanedTasks(projectId).then((r) => r.length),
        ]);

        return {
            stuck: stuckCount,
            problematic: problematicCount,
            orphaned: orphanedCount,
            totalIssues: stuckCount + problematicCount + orphanedCount,
            status:
                stuckCount + problematicCount + orphanedCount === 0
                    ? 'HEALTHY'
                    : stuckCount + problematicCount + orphanedCount < 5
                        ? 'WARNING'
                        : 'CRITICAL',
        };
    }
}
