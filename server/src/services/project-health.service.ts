
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
     * Get Orphaned Tasks: Tasks without any active assignment
     * Definition: Tasks that don't have ANY active assignment (ASSIGNED or IN_PROGRESS)
     */
    static async getOrphanedTasks(projectId: string) {
        // Find all tasks in the project
        const allTasks = await prisma.task.findMany({
            where: { projectId },
            include: {
                assignments: {
                    where: {
                        status: {
                            in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
                        }
                    }
                }
            }
        });

        // Filter tasks that have no active assignments
        const orphanedTasks = allTasks.filter(task => task.assignments.length === 0);

        return orphanedTasks;
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
