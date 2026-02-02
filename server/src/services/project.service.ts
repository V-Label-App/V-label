import { prisma } from '../utils/database.js'
import logger from '../utils/logger.js'
import { Prisma, ProjectStatus, ProjectRole } from '@prisma/client'

export class ProjectService {
    /**
     * Create a new project
     */
    static async create(data: {
        name: string
        description?: string
        categoryId?: string
        deadline?: Date
        labelConfig?: any
        enableAiAssistance?: boolean
        creatorId: string
    }) {
        try {
            // Create project and add creator as member in one transaction
            const project = await prisma.project.create({
                data: {
                    name: data.name,
                    description: data.description ?? null,
                    categoryId: data.categoryId ?? null,
                    deadline: data.deadline ?? null,
                    labelConfig: data.labelConfig ?? [],
                    enableAiAssistance: data.enableAiAssistance ?? false,
                    status: ProjectStatus.ACTIVE,
                    members: {
                        create: {
                            userId: data.creatorId,
                            projectRole: ProjectRole.MANAGER,
                        },
                    },
                },
                include: {
                    category: true,
                    _count: {
                        select: { tasks: true, members: true },
                    },
                },
            })

            return project
        } catch (error) {
            logger.error('SERVICE', 'Error creating project', { error })
            throw error
        }
    }

    /**
     * Get all projects with filters
     */
    static async getAll(filters: {
        search?: string
        categoryId?: string
        status?: ProjectStatus
        userId?: string // To filter projects user is member of
        page?: number
        limit?: number
    }) {
        try {
            const { search, categoryId, status, userId, page = 1, limit = 10 } = filters
            const skip = (page - 1) * limit

            const where: Prisma.ProjectWhereInput = {
                AND: [
                    // Search by name
                    search ? { name: { contains: search, mode: 'insensitive' } } : {},
                    // Filter by category
                    categoryId ? { categoryId } : {},
                    // Filter by status (default to not ARCHIVED if not specified, or whatever logic)
                    // Usually we don't show ARCHIVED unless asked
                    status ? { status } : { status: { not: ProjectStatus.ARCHIVED } },
                    // Filter by membership
                    userId ? { members: { some: { userId } } } : {},
                ],
            }

            const [projects, total] = await Promise.all([
                prisma.project.findMany({
                    where,
                    include: {
                        category: true,
                        _count: {
                            select: { tasks: true, members: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.project.count({ where }),
            ])

            return {
                data: projects,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            }
        } catch (error) {
            logger.error('SERVICE', 'Error getting projects', { error })
            throw error
        }
    }

    /**
     * Get project by ID
     */
    static async getById(id: string) {
        try {
            const project = await prisma.project.findUnique({
                where: { id },
                include: {
                    category: true,
                    assignmentRule: true, // Include Assignment Rules
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    email: true,
                                    avatarUrl: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: { tasks: true, members: true },
                    },
                },
            })

            return project
        } catch (error) {
            logger.error('SERVICE', 'Error getting project by id', { id, error })
            throw error
        }
    }

    /**
     * Update project
     * RULE: Cannot update labelConfig if tasks exist
     */
    static async update(
        id: string,
        data: {
            name?: string
            description?: string
            categoryId?: string | null // Allow null to unset
            deadline?: Date
            labelConfig?: any
            enableAiAssistance?: boolean
            status?: ProjectStatus
            assignmentRule?: {
                isAutoAssignEnabled?: boolean | undefined
                assignmentStrategy?: string | undefined
                autoAssignReviewer?: boolean | undefined
                reviewerDelayHours?: number | undefined
                maxTasksPerAnnotator?: number | undefined
                maxTasksPerReviewer?: number | undefined
                minAnnotatorReputation?: number | undefined
                minReviewerReputation?: number | undefined
                maxRejectionsBeforeReassign?: number | undefined
                autoReassignOnSkip?: boolean | undefined
            }
        },
    ) {
        try {
            // If labelConfig is being updated, check strict rule
            if (data.labelConfig) {
                const taskCount = await prisma.task.count({
                    where: { projectId: id },
                })

                if (taskCount > 0) {
                    // Check if labelConfig actually changed deeply?
                    // For simplicity, we just block ANY update to labelConfig if tasks exist
                    // Or we could compare current vs new.
                    // Let's first fetch the current project to compare.
                    const currentProject = await prisma.project.findUnique({
                        where: { id },
                        select: { labelConfig: true },
                    })

                    if (
                        currentProject &&
                        JSON.stringify(currentProject.labelConfig) !==
                        JSON.stringify(data.labelConfig)
                    ) {
                        throw new Error(
                            'Cannot update Label Configuration because this project already has tasks. Please delete all tasks first.',
                        )
                    }
                }
            }

            const project = await prisma.project.update({
                where: { id },
                data: {
                    ...(data.name && { name: data.name }),
                    // Allow setting to null explicitly if passed as null, or not updating if undefined
                    ...(data.description !== undefined && { description: data.description }),
                    ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
                    ...(data.deadline !== undefined && { deadline: data.deadline }),
                    ...(data.labelConfig && { labelConfig: data.labelConfig }),
                    ...(data.enableAiAssistance !== undefined && { enableAiAssistance: data.enableAiAssistance }),
                    ...(data.status && { status: data.status }),

                    // Handle Assignment Rules Upsert
                    ...(data.assignmentRule && {
                        assignmentRule: {
                            upsert: {
                                create: data.assignmentRule,
                                update: data.assignmentRule
                            }
                        }
                    })
                },
                include: {
                    assignmentRule: true // Return the updated rules
                }
            })

            return project
        } catch (error) {
            logger.error('SERVICE', 'Error updating project', { id, error })
            throw error
        }
    }

    /**
     * Delete project (Soft Delete)
     */
    static async delete(id: string) {
        try {
            // Soft delete: status = ARCHIVED
            return await prisma.project.update({
                where: { id },
                data: {
                    status: ProjectStatus.ARCHIVED,
                },
            })
        } catch (error) {
            logger.error('SERVICE', 'Error deleting project', { id, error })
            throw error
        }
    }

    /**
     * Get potential members (users not yet in project)
     */
    static async getPotentialMembers(projectId: string, search: string) {
        try {
            const users = await prisma.user.findMany({
                where: {
                    AND: [
                        {
                            OR: [
                                { email: { contains: search, mode: 'insensitive' } },
                                { fullName: { contains: search, mode: 'insensitive' } },
                            ],
                        },
                        {
                            role: {
                                notIn: ['ADMIN', 'MANAGER']
                            }
                        },
                        {
                            projectsJoined: {
                                none: {
                                    projectId: projectId,
                                },
                            },
                        },
                    ],
                },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    avatarUrl: true,
                },
                take: 20,
            })

            return users
        } catch (error) {
            logger.error('SERVICE', 'Error getting potential members', { projectId, search, error })
            throw error
        }
    }

    /**
     * Add member to project
     */
    static async addMember(projectId: string, userId: string, role: string = 'ANNOTATOR') {
        try {
            // Check if already a member
            const existingMember = await prisma.projectMember.findUnique({
                where: {
                    projectId_userId: {
                        projectId,
                        userId,
                    },
                },
            })

            if (existingMember) {
                throw new Error('User is already a member of this project')
            }

            // Add member
            const member = await prisma.projectMember.create({
                data: {
                    projectId,
                    userId,
                    projectRole: role as any,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            avatarUrl: true,
                        },
                    },
                    project: {
                        select: {
                            name: true
                        }
                    }
                },
            })

            // Send persistent notification & emit real-time event (Unified Logic)
            const { broadcastService } = await import('../websocket/events/broadcast.service.js');
            const io = broadcastService.getIO();

            if (io) {
                const { sendNotification } = await import('../websocket/handlers/notification.handler.js');
                const { NotificationType } = await import('@prisma/client');

                await sendNotification(io, {
                    userId,
                    type: NotificationType.PROJECT_INVITATION,
                    title: 'Project Invitation',
                    message: `You have been added to project "${member.project.name}" as ${role}`,
                    metadata: {
                        projectId,
                        projectName: member.project.name,
                        role,
                        invitedBy: 'System'
                    }
                });
            } else {
                // Fallback: If socket server not valid, just persist to DB
                console.warn('[ProjectService] Socket.IO not ready, using fallback persistence');
                const { NotificationService } = await import('./notification.service.js');
                const { NotificationType } = await import('@prisma/client');

                await NotificationService.createNotification({
                    userId,
                    type: NotificationType.PROJECT_INVITATION,
                    title: 'Project Invitation',
                    message: `You have been added to project "${member.project.name}" as ${role}`,
                    metadata: {
                        projectId,
                        projectName: member.project.name,
                        role,
                        invitedBy: 'System'
                    }
                });
            }

            // Special event for Toast (keep this for now as client relies on it for the "View" action)
            broadcastService.broadcastToUser(userId, 'project:invitation' as any, {
                projectId,
                projectName: member.project.name,
                role,
                invitedBy: 'System'
            });

            return member
        } catch (error) {
            logger.error('SERVICE', 'Error adding member', { projectId, userId, error })
            throw error
        }
    }

    /**
     * Remove member from project
     */
    static async removeMember(projectId: string, userId: string) {
        try {
            await prisma.projectMember.delete({
                where: {
                    projectId_userId: {
                        projectId,
                        userId,
                    },
                },
            })
            return true
        } catch (error) {
            logger.error('SERVICE', 'Error removing member', { projectId, userId, error })
            throw error
        }
    }

    /**
     * Update member role
     */
    static async updateMemberRole(projectId: string, userId: string, role: string) {
        // Ensure valid role
        const validRoles = ['MANAGER', 'REVIEWER', 'ANNOTATOR'];
        if (!validRoles.includes(role)) {
            throw new Error('Invalid role');
        }

        const updatedMember = await prisma.projectMember.update({
            where: {
                projectId_userId: { projectId, userId }
            },
            data: {
                projectRole: role as any
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        avatarUrl: true
                    }
                },
                project: {
                    select: {
                        name: true
                    }
                }
            }
        });

        // Notify user about role change (Unified Logic)
        const { broadcastService } = await import('../websocket/events/broadcast.service.js');
        const io = broadcastService.getIO();

        if (io) {
            const { sendNotification } = await import('../websocket/handlers/notification.handler.js');
            const { NotificationType } = await import('@prisma/client');

            // Use SYSTEM or create a specific type if needed. Using SYSTEM for now or check if we can reuse
            const notifType = NotificationType.SYSTEM_USER_ROLE_CHANGE;

            await sendNotification(io, {
                userId,
                type: notifType as any,
                title: 'Project Role Updated',
                message: `Your role in project "${updatedMember.project.name}" has been updated to ${role}`,
                metadata: {
                    projectId,
                    projectName: updatedMember.project.name,
                    role
                }
            });
        }

        return updatedMember;
    }
}
