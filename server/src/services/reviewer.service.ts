import { prisma } from '../utils/database.js';
import { ProjectRole, AssignmentStatus, TaskStatus } from '@prisma/client';
import logger from '../utils/logger.js';

export class ReviewerService {
    /**
     * Get all projects where the user is a member as Reviewer
     */
    static async getMyProjects(userId: string) {
        try {
            const projects = await prisma.project.findMany({
                where: {
                    members: {
                        some: {
                            userId,
                            projectRole: ProjectRole.REVIEWER
                        }
                    }
                },
                include: {
                    category: true,
                    _count: {
                        select: {
                            // Count tasks assigned to this reviewer
                            tasks: {
                                where: {
                                    assignments: {
                                        some: {
                                            reviewerId: userId,
                                            status: {
                                                in: [AssignmentStatus.SUBMITTED, AssignmentStatus.APPROVED, AssignmentStatus.REJECTED]
                                            }
                                        }
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
            logger.error('SERVICE', 'Error getting reviewer projects', { error, userId });
            throw error;
        }
    }

    /**
     * Get review queue (tasks submitted for review)
     */
    static async getReviewQueue(
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
                reviewerId: userId
            };

            if (projectId) {
                where.task = { projectId };
            }

            if (status) {
                where.status = status;
            } else {
                // Default: show SUBMITTED (pending review)
                where.status = AssignmentStatus.SUBMITTED;
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
                        },
                        annotator: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                avatarUrl: true
                            }
                        }
                    },
                    orderBy: [
                        { deadline: 'asc' }, // Urgent reviews first
                        { createdAt: 'asc' } // Oldest first
                    ],
                    skip,
                    take: limit
                }),
                prisma.taskAssignment.count({ where })
            ]);

            // Calculate counts by status
            const statusCounts = await prisma.taskAssignment.groupBy({
                by: ['status'],
                where: { reviewerId: userId },
                _count: true
            });

            const reviewCounts = {
                pending: statusCounts.find(s => s.status === AssignmentStatus.SUBMITTED)?._count || 0,
                approved: statusCounts.find(s => s.status === AssignmentStatus.APPROVED)?._count || 0,
                rejected: statusCounts.find(s => s.status === AssignmentStatus.REJECTED)?._count || 0,
                total
            };

            return {
                data: assignments,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                    reviewCounts
                }
            };
        } catch (error) {
            logger.error('SERVICE', 'Error getting review queue', { error, userId });
            throw error;
        }
    }
}
