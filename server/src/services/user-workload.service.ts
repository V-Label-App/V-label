import { prisma } from '../utils/database.js';
import logger from '../utils/logger.js';

export class UserWorkloadService {
    /**
     * Initialize or get user workload for a project
     */
    static async initializeWorkload(userId: string, projectId: string) {
        try {
            const existing = await prisma.userWorkload.findUnique({
                where: {
                    userId_projectId: {
                        userId,
                        projectId
                    }
                }
            });

            if (existing) {
                return existing;
            }

            return await prisma.userWorkload.create({
                data: {
                    userId,
                    projectId,
                    assignedTasks: 0,
                    inProgressTasks: 0,
                    pendingReviewTasks: 0,
                    maxConcurrentTasks: 10,
                    availabilityStatus: 'AVAILABLE'
                }
            });
        } catch (error) {
            logger.error('USER_WORKLOAD_SERVICE', 'Failed to initialize workload', { error, userId, projectId });
            throw error;
        }
    }

    /**
     * Increment assigned tasks count
     */
    static async incrementAssignedTasks(userId: string, projectId: string) {
        try {
            // Ensure workload record exists
            await this.initializeWorkload(userId, projectId);

            const updated = await prisma.userWorkload.update({
                where: {
                    userId_projectId: {
                        userId,
                        projectId
                    }
                },
                data: {
                    assignedTasks: { increment: 1 },
                    lastAssignedAt: new Date()
                }
            });

            // Update availability status if needed
            await this.updateAvailabilityStatus(userId, projectId);

            logger.info('USER_WORKLOAD_SERVICE', 'Incremented assigned tasks', { userId, projectId, newCount: updated.assignedTasks });
            return updated;
        } catch (error) {
            logger.error('USER_WORKLOAD_SERVICE', 'Failed to increment assigned tasks', { error, userId, projectId });
            throw error;
        }
    }

    /**
     * Decrement assigned tasks count
     */
    static async decrementAssignedTasks(userId: string, projectId: string) {
        try {
            const updated = await prisma.userWorkload.update({
                where: {
                    userId_projectId: {
                        userId,
                        projectId
                    }
                },
                data: {
                    assignedTasks: { decrement: 1 }
                }
            });

            await this.updateAvailabilityStatus(userId, projectId);

            logger.info('USER_WORKLOAD_SERVICE', 'Decremented assigned tasks', { userId, projectId, newCount: updated.assignedTasks });
            return updated;
        } catch (error) {
            logger.error('USER_WORKLOAD_SERVICE', 'Failed to decrement assigned tasks', { error, userId, projectId });
            throw error;
        }
    }

    /**
     * Move task from ASSIGNED to IN_PROGRESS
     */
    static async taskStarted(userId: string, projectId: string) {
        try {
            const updated = await prisma.userWorkload.update({
                where: {
                    userId_projectId: {
                        userId,
                        projectId
                    }
                },
                data: {
                    assignedTasks: { decrement: 1 },
                    inProgressTasks: { increment: 1 }
                }
            });

            logger.info('USER_WORKLOAD_SERVICE', 'Task started', { userId, projectId });
            return updated;
        } catch (error) {
            logger.error('USER_WORKLOAD_SERVICE', 'Failed to mark task started', { error, userId, projectId });
            throw error;
        }
    }

    /**
     * Move task from IN_PROGRESS to SUBMITTED (pending review)
     */
    static async taskSubmitted(userId: string, projectId: string) {
        try {
            const updated = await prisma.userWorkload.update({
                where: {
                    userId_projectId: {
                        userId,
                        projectId
                    }
                },
                data: {
                    inProgressTasks: { decrement: 1 },
                    pendingReviewTasks: { increment: 1 }
                }
            });

            await this.updateAvailabilityStatus(userId, projectId);

            logger.info('USER_WORKLOAD_SERVICE', 'Task submitted', { userId, projectId });
            return updated;
        } catch (error) {
            logger.error('USER_WORKLOAD_SERVICE', 'Failed to mark task submitted', { error, userId, projectId });
            throw error;
        }
    }

    /**
     * Task approved or rejected (removed from pending review)
     */
    static async taskReviewed(userId: string, projectId: string) {
        try {
            const updated = await prisma.userWorkload.update({
                where: {
                    userId_projectId: {
                        userId,
                        projectId
                    }
                },
                data: {
                    pendingReviewTasks: { decrement: 1 }
                }
            });

            await this.updateAvailabilityStatus(userId, projectId);

            logger.info('USER_WORKLOAD_SERVICE', 'Task reviewed', { userId, projectId });
            return updated;
        } catch (error) {
            logger.error('USER_WORKLOAD_SERVICE', 'Failed to mark task reviewed', { error, userId, projectId });
            throw error;
        }
    }

    /**
     * Update availability status based on current workload
     */
    static async updateAvailabilityStatus(userId: string, projectId: string) {
        try {
            const workload = await prisma.userWorkload.findUnique({
                where: {
                    userId_projectId: {
                        userId,
                        projectId
                    }
                }
            });

            if (!workload) return;

            const totalActiveTasks = workload.assignedTasks + workload.inProgressTasks;
            let newStatus = 'AVAILABLE';

            if (totalActiveTasks >= workload.maxConcurrentTasks) {
                newStatus = 'BUSY';
            } else if (totalActiveTasks >= workload.maxConcurrentTasks * 0.8) {
                newStatus = 'LIMITED';
            }

            if (newStatus !== workload.availabilityStatus) {
                await prisma.userWorkload.update({
                    where: {
                        userId_projectId: {
                            userId,
                            projectId
                        }
                    },
                    data: {
                        availabilityStatus: newStatus
                    }
                });

                logger.info('USER_WORKLOAD_SERVICE', 'Availability status updated', {
                    userId,
                    projectId,
                    oldStatus: workload.availabilityStatus,
                    newStatus
                });
            }
        } catch (error) {
            logger.error('USER_WORKLOAD_SERVICE', 'Failed to update availability status', { error, userId, projectId });
        }
    }

    /**
     * Get workload for a user in a project
     */
    static async getWorkload(userId: string, projectId: string) {
        try {
            const workload = await prisma.userWorkload.findUnique({
                where: {
                    userId_projectId: {
                        userId,
                        projectId
                    }
                }
            });

            if (!workload) {
                return await this.initializeWorkload(userId, projectId);
            }

            return workload;
        } catch (error) {
            logger.error('USER_WORKLOAD_SERVICE', 'Failed to get workload', { error, userId, projectId });
            throw error;
        }
    }

    /**
     * Get all workloads for a project (for displaying in UI)
     */
    static async getProjectWorkloads(projectId: string) {
        try {
            return await prisma.userWorkload.findMany({
                where: { projectId },
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            avatarUrl: true
                        }
                    }
                },
                orderBy: {
                    assignedTasks: 'asc' // Users with fewer tasks first
                }
            });
        } catch (error) {
            logger.error('USER_WORKLOAD_SERVICE', 'Failed to get project workloads', { error, projectId });
            throw error;
        }
    }

    /**
     * Recalculate workload from actual task assignments (for maintenance/sync)
     */
    static async recalculateWorkload(userId: string, projectId: string) {
        try {
            const { AssignmentStatus } = await import('@prisma/client');

            const assignments = await prisma.taskAssignment.findMany({
                where: {
                    annotatorId: userId,
                    task: {
                        projectId
                    }
                },
                select: {
                    status: true
                }
            });

            const assignedTasks = assignments.filter(a => a.status === AssignmentStatus.ASSIGNED).length;
            const inProgressTasks = assignments.filter(a => a.status === AssignmentStatus.IN_PROGRESS).length;
            const pendingReviewTasks = assignments.filter(a => a.status === AssignmentStatus.SUBMITTED).length;

            await this.initializeWorkload(userId, projectId);

            const updated = await prisma.userWorkload.update({
                where: {
                    userId_projectId: {
                        userId,
                        projectId
                    }
                },
                data: {
                    assignedTasks,
                    inProgressTasks,
                    pendingReviewTasks
                }
            });

            await this.updateAvailabilityStatus(userId, projectId);

            logger.info('USER_WORKLOAD_SERVICE', 'Workload recalculated', {
                userId,
                projectId,
                assignedTasks,
                inProgressTasks,
                pendingReviewTasks
            });

            return updated;
        } catch (error) {
            logger.error('USER_WORKLOAD_SERVICE', 'Failed to recalculate workload', { error, userId, projectId });
            throw error;
        }
    }
}
