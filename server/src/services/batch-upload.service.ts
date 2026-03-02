import logger from '../utils/logger.js';
import { TaskActivityService } from './task-activity.service.js';
import { TaskAction } from '@prisma/client';
import { prisma } from '../utils/database.js';

interface BatchUploadInfo {
    projectId: string;
    userId: string;
    taskIds: string[];
    taskNames: string[];
    assignedTaskIds: Set<string>; // Track which tasks have been assigned
    timer?: NodeJS.Timeout;
}

/**
 * Service to manage batch upload sessions and consolidate activity logs
 */
export class BatchUploadService {
    private static sessions = new Map<string, BatchUploadInfo>();
    private static readonly CONSOLIDATION_DELAY = 3000; // 3 seconds

    /**
     * Add a task to a batch session
     */
    static addTaskToBatch(
        batchSessionId: string,
        projectId: string,
        userId: string,
        taskId: string,
        taskName: string
    ): void {
        let session = this.sessions.get(batchSessionId);

        if (!session) {
            session = {
                projectId,
                userId,
                taskIds: [],
                taskNames: [],
                assignedTaskIds: new Set()
            };
            this.sessions.set(batchSessionId, session);
        }

        // Add task to session
        session.taskIds.push(taskId);
        session.taskNames.push(taskName);

        // Clear existing timer
        if (session.timer) {
            clearTimeout(session.timer);
        }

        // Set new timer to consolidate after delay
        session.timer = setTimeout(() => {
            this.consolidateSession(batchSessionId);
        }, this.CONSOLIDATION_DELAY);

        logger.info('BATCH_UPLOAD', `Task added to batch session`, {
            batchSessionId,
            taskId,
            totalTasks: session.taskIds.length
        });
    }

    /**
     * Consolidate a batch session into bulk activities
     */
    private static async consolidateSession(batchSessionId: string): Promise<void> {
        const session = this.sessions.get(batchSessionId);

        if (!session || session.taskIds.length === 0) {
            this.sessions.delete(batchSessionId);
            return;
        }

        try {
            const { projectId, userId, taskIds, taskNames, assignedTaskIds } = session;

            // Log bulk created activity
            await TaskActivityService.logBulkActivity({
                taskIds,
                projectId,
                userId,
                action: TaskAction.CREATED,
                metadata: {
                    count: taskIds.length,
                    taskNames,
                    batchSessionId
                }
            });

            // Log bulk assigned activities grouped by annotator
            if (assignedTaskIds.size > 0) {
                const assignedTaskIdArray = Array.from(assignedTaskIds);

                // Get assignments and group by annotator
                const assignments = await prisma.taskAssignment.findMany({
                    where: {
                        taskId: { in: assignedTaskIdArray }
                    },
                    include: {
                        annotator: {
                            select: { id: true, fullName: true, email: true }
                        },
                        task: {
                            include: {
                                image: {
                                    select: { originalFilename: true }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                });

                // Group by annotator
                const assignmentsByAnnotator = new Map<string, typeof assignments>();
                for (const assignment of assignments) {
                    const annotatorId = assignment.annotatorId;
                    if (!assignmentsByAnnotator.has(annotatorId)) {
                        assignmentsByAnnotator.set(annotatorId, []);
                    }
                    assignmentsByAnnotator.get(annotatorId)!.push(assignment);
                }

                // Log bulk assigned activity for each annotator
                for (const [annotatorId, annotatorAssignments] of assignmentsByAnnotator.entries()) {
                    if (annotatorAssignments.length === 0) continue;

                    const annotator = annotatorAssignments[0]?.annotator;
                    const assignedTaskNames = annotatorAssignments
                        .map(a => a.task?.image?.originalFilename || `Task #${a.taskId.substring(0, 6)}`)
                        .filter(Boolean);

                    await TaskActivityService.logBulkActivity({
                        taskIds: annotatorAssignments.map(a => a.taskId),
                        projectId,
                        userId,
                        action: TaskAction.BULK_ASSIGNED,
                        metadata: {
                            count: annotatorAssignments.length,
                            targetUserId: annotatorId,
                            targetUserName: annotator?.fullName || annotator?.email || 'Unknown',
                            taskNames: assignedTaskNames,
                            batchSessionId
                        }
                    });
                }

                logger.info('BATCH_UPLOAD', `Batch assignments consolidated`, {
                    batchSessionId,
                    assignedCount: assignedTaskIds.size,
                    annotatorsCount: assignmentsByAnnotator.size
                });
            }

            logger.info('BATCH_UPLOAD', `Batch session consolidated`, {
                batchSessionId,
                taskCount: taskIds.length,
                assignedCount: assignedTaskIds.size,
                projectId
            });
        } catch (error) {
            logger.error('BATCH_UPLOAD', 'Failed to consolidate batch session', {
                error,
                batchSessionId
            });
        } finally {
            // Clean up session
            this.sessions.delete(batchSessionId);
        }
    }

    /**
     * Mark a task as assigned in batch session
     */
    static markTaskAssigned(batchSessionId: string, taskId: string): void {
        const session = this.sessions.get(batchSessionId);
        if (session) {
            session.assignedTaskIds.add(taskId);
            logger.info('BATCH_UPLOAD', `Task marked as assigned in batch`, {
                batchSessionId,
                taskId,
                totalAssigned: session.assignedTaskIds.size
            });
        }
    }

    /**
     * Manually trigger consolidation (for testing or forced completion)
     */
    static async forceConsolidate(batchSessionId: string): Promise<void> {
        const session = this.sessions.get(batchSessionId);
        if (session?.timer) {
            clearTimeout(session.timer);
        }
        await this.consolidateSession(batchSessionId);
    }

    /**
     * Check if a batch session exists
     */
    static hasBatch(batchSessionId: string): boolean {
        return this.sessions.has(batchSessionId);
    }

    /**
     * Get session info (for debugging)
     */
    static getSessionInfo(batchSessionId: string): BatchUploadInfo | undefined {
        return this.sessions.get(batchSessionId);
    }
}
