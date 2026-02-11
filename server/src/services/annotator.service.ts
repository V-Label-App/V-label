import { prisma } from '../utils/database.js';
import { ProjectRole, AssignmentStatus } from '@prisma/client';
import logger from '../utils/logger.js';

export class AnnotatorService {
    /**
     * Get all projects where the user is a member as Annotator
     */
    static async getMyProjects(userId: string) {
        try {
            const projects = await prisma.project.findMany({
                where: {
                    members: {
                        some: {
                            userId,
                            projectRole: ProjectRole.ANNOTATOR
                        }
                    }
                },
                include: {
                    category: true,
                    _count: {
                        select: {
                            // Count only tasks assigned to this user
                            tasks: {
                                where: {
                                    assignments: {
                                        some: { annotatorId: userId }
                                    }
                                }
                            },
                            members: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // Calculate progress for each project
            const projectsWithProgress = await Promise.all(
                projects.map(async (project) => {
                    const [totalTasks, doneTasks] = await Promise.all([
                        prisma.task.count({ where: { projectId: project.id } }),
                        prisma.task.count({
                            where: {
                                projectId: project.id,
                                status: 'DONE'
                            }
                        })
                    ]);

                    const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

                    return {
                        ...project,
                        progress
                    };
                })
            );

            return projectsWithProgress;
        } catch (error) {
            logger.error('SERVICE', 'Error getting annotator projects', { error, userId });
            throw error;
        }
    }

    /**
     * Get task assignments for the current user with filters
     */
    static async getMyTasks(
        userId: string,
        filters: {
            projectId?: string;
            status?: AssignmentStatus;
            page: number;
            limit: number;
        }
    ) {
        try {
            const { projectId, status, page, limit } = filters;
            const skip = (page - 1) * limit;

            const where: any = {
                annotatorId: userId
            };

            if (projectId) {
                where.task = { projectId };
            }

            if (status) {
                where.status = status;
            }

            const [assignments, total] = await Promise.all([
                prisma.taskAssignment.findMany({
                    where,
                    include: {
                        task: {
                            include: {
                                image: {
                                    select: {
                                        id: true,
                                        storageUrl: true,
                                        originalFilename: true,
                                        width: true,
                                        height: true
                                    }
                                },
                                project: {
                                    select: {
                                        id: true,
                                        name: true,
                                        labelConfig: true,
                                        projectLabels: {
                                            include: {
                                                label: {
                                                    include: {
                                                        category: true
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    orderBy: [
                        { status: 'asc' }, // ASSIGNED first
                        { deadline: 'asc' } // Urgent tasks first
                    ],
                    skip,
                    take: limit
                }),
                prisma.taskAssignment.count({ where })
            ]);

            // Calculate task counts by status
            const statusCounts = await prisma.taskAssignment.groupBy({
                by: ['status'],
                where: { annotatorId: userId },
                _count: true
            });

            const taskCounts = {
                assigned: statusCounts.find(s => s.status === AssignmentStatus.ASSIGNED)?._count || 0,
                submitted: statusCounts.find(s => s.status === AssignmentStatus.SUBMITTED)?._count || 0,
                rejected: statusCounts.find(s => s.status === AssignmentStatus.REJECTED)?._count || 0,
                inProgress: statusCounts.find(s => s.status === AssignmentStatus.IN_PROGRESS)?._count || 0,
                total
            };

            return {
                data: assignments,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    taskCounts
                }
            };
        } catch (error) {
            logger.error('SERVICE', 'Error getting annotator tasks', { error, userId });
            throw error;
        }
    }

    /**
     * Get single task assignment with full details
     */
    static async getTaskAssignment(assignmentId: string, userId: string) {
        try {
            const assignment = await prisma.taskAssignment.findFirst({
                where: {
                    id: assignmentId,
                    annotatorId: userId // Ensure ownership
                },
                include: {
                    task: {
                        include: {
                            image: true,
                            project: {
                                include: {
                                    projectLabels: {
                                        include: {
                                            label: {
                                                include: {
                                                    category: true
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    reviewer: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true
                        }
                    }
                }
            });

            if (!assignment) {
                throw new Error('Task assignment not found or access denied');
            }

            return assignment;
        } catch (error) {
            logger.error('SERVICE', 'Error getting task assignment', { error, assignmentId, userId });
            throw error;
        }
    }

    /**
     * Update task assignment (submit, add note, mark in progress)
     */
    static async updateTaskAssignment(
        assignmentId: string,
        userId: string,
        updates: {
            status?: AssignmentStatus;
            annotations?: any;
            annotatorNote?: string;
        }
    ) {
        try {
            // Verify ownership
            const existing = await prisma.taskAssignment.findFirst({
                where: {
                    id: assignmentId,
                    annotatorId: userId
                }
            });

            if (!existing) {
                throw new Error('Task assignment not found or access denied');
            }

            // Validate status transitions
            if (updates.status) {
                const validTransitions: Record<AssignmentStatus, AssignmentStatus[]> = {
                    [AssignmentStatus.ASSIGNED]: [AssignmentStatus.IN_PROGRESS, AssignmentStatus.SKIPPED],
                    [AssignmentStatus.IN_PROGRESS]: [AssignmentStatus.SUBMITTED, AssignmentStatus.SKIPPED],
                    [AssignmentStatus.SUBMITTED]: [], // Cannot change once submitted
                    [AssignmentStatus.REJECTED]: [AssignmentStatus.IN_PROGRESS, AssignmentStatus.SUBMITTED],
                    [AssignmentStatus.APPROVED]: [], // Final state
                    [AssignmentStatus.SKIPPED]: [AssignmentStatus.IN_PROGRESS]
                };

                const allowedNextStates = validTransitions[existing.status] || [];
                if (!allowedNextStates.includes(updates.status)) {
                    throw new Error(`Invalid status transition: ${existing.status} -> ${updates.status}`);
                }
            }

            const updated = await prisma.taskAssignment.update({
                where: { id: assignmentId },
                data: {
                    ...updates,
                    updatedAt: new Date()
                },
                include: {
                    task: {
                        include: {
                            image: true,
                            project: true
                        }
                    }
                }
            });

            logger.info('SERVICE', 'Task assignment updated', { assignmentId, userId, status: updates.status });
            return updated;
        } catch (error) {
            logger.error('SERVICE', 'Error updating task assignment', { error, assignmentId, userId });
            throw error;
        }
    }
}
