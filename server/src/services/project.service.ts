import { prisma } from '../utils/database.js'
import logger from '../utils/logger.js'
import { Prisma, ProjectStatus, ProjectRole, TaskStatus } from '@prisma/client'

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
                    status: ProjectStatus.PAUSED,
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
                        select: { tasks: true, members: true, images: true },
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
                    // Filter by status (default to ALL if not specified)
                    status ? { status } : {},
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
                            select: {
                                tasks: true,
                                members: {
                                    where: {
                                        projectRole: {
                                            not: ProjectRole.MANAGER
                                        }
                                    }
                                },
                                images: true
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                prisma.project.count({ where }),
            ])

            // Calculate progress for each project and map totalImages
            const mappedProjects = await Promise.all(
                projects.map(async (p) => {
                    const [totalTasks, approvedTasks] = await Promise.all([
                        prisma.task.count({ where: { projectId: p.id } }),
                        prisma.task.count({
                            where: {
                                projectId: p.id,
                                status: TaskStatus.DONE
                            }
                        })
                    ]);

                    const progress = totalTasks > 0 ? (approvedTasks / totalTasks) * 100 : 0;

                    return {
                        ...p,
                        totalImages: p._count.images,
                        progress
                    };
                })
            );

            return {
                data: mappedProjects,
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
     * Optional: Pass userId to check if they are a member
     */
    static async getById(id: string, userId?: string) {
        try {
            const where: Prisma.ProjectWhereInput = { id }
            if (userId) {
                where.members = { some: { userId } }
            }

            // check if userId is provided, usage is strictly for access control -> switch to findFirst
            // If just ID, findUnique is faster/cleaner, but findFirst works for both.
            const project = await prisma.project.findFirst({
                where,
                include: {
                    category: true,
                    assignmentRule: true, // Include Assignment Rules
                    projectLabels: {
                        include: {
                            label: {
                                include: {
                                    category: true
                                }
                            }
                        }
                    },
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
                        select: {
                            tasks: true,
                            members: {
                                where: {
                                    projectRole: {
                                        not: 'MANAGER'
                                    }
                                }
                            },
                            images: true
                        },
                    },
                },
            })

            if (!project) return null

            // Calculate progress for the project
            const [totalTasks, approvedTasks] = await Promise.all([
                prisma.task.count({ where: { projectId: project.id } }),
                prisma.task.count({
                    where: {
                        projectId: project.id,
                        status: TaskStatus.DONE
                    }
                })
            ]);

            const progress = totalTasks > 0 ? (approvedTasks / totalTasks) * 100 : 0;

            // Map _count.images to totalImages for frontend
            const mappedProject = {
                ...project,
                totalImages: project._count.images,
                progress
            }

            return mappedProject
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
                reviewerAssignmentStrategy?: string | undefined
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
            // labelConfig can be updated freely even when tasks exist

            // If status is being updated to COMPLETED, check progress
            if (data.status === ProjectStatus.COMPLETED) {
                const [totalTasks, approvedTasks] = await Promise.all([
                    prisma.task.count({ where: { projectId: id } }),
                    prisma.task.count({ where: { projectId: id, status: TaskStatus.DONE } })
                ])

                if (totalTasks === 0 || approvedTasks < totalTasks) {
                    throw new Error(
                        'Cannot mark project as COMPLETED until all tasks are approved (100% progress).'
                    )
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
     * Authorization: Creator or Admin only
     * Validation: Cannot delete if tasks are IN_PROGRESS
     */
    static async delete(id: string, userId: string, userRole: string) {
        try {
            // 1. Fetch project to check permissions (MANAGER role) and tasks status
            const project = await prisma.project.findUnique({
                where: { id },
                include: {
                    members: {
                        where: { userId }, // Only fetch membership for the requesting user
                        select: { projectRole: true },
                    },
                    _count: {
                        select: {
                            tasks: {
                                where: { status: 'IN_PROGRESS' }, // Check for processing tasks
                            },
                        },
                    },
                },
            })

            if (!project) throw new Error('Project not found')

            // 2. Authorization Check
            // Allow if user is ADMIN or a MANAGER of this project
            const isManager = project.members.length > 0 && project.members[0]?.projectRole === ProjectRole.MANAGER
            const isAdmin = userRole === 'ADMIN'

            if (!isManager && !isAdmin) {
                throw new Error('Unauthorized: Only Project Manager or Admin can delete project')
            }

            // 3. Validation Check (Active Tasks)
            if (project._count.tasks > 0) {
                throw new Error('Cannot delete project with tasks in progress')
            }

            // 4. Soft delete
            return await prisma.project.update({
                where: { id },
                data: { status: ProjectStatus.ARCHIVED },
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
                    role: true,
                    reputationScore: true,
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
            // Check if user has active tasks (ASSIGNED, IN_PROGRESS, or SUBMITTED)
            const { AssignmentStatus } = await import('@prisma/client');
            const activeTasks = await prisma.taskAssignment.findMany({
                where: {
                    annotatorId: userId,
                    task: {
                        projectId
                    },
                    status: {
                        in: [
                            AssignmentStatus.ASSIGNED,
                            AssignmentStatus.IN_PROGRESS,
                            AssignmentStatus.SUBMITTED
                        ]
                    }
                },
                select: {
                    id: true,
                    status: true
                }
            });

            if (activeTasks.length > 0) {
                throw new Error(`Cannot remove member. User has ${activeTasks.length} active task(s). Please unassign or complete all tasks first.`);
            }

            // Also check if user is a reviewer with active tasks
            const activeReviewTasks = await prisma.taskAssignment.findMany({
                where: {
                    reviewerId: userId,
                    task: {
                        projectId
                    },
                    status: AssignmentStatus.SUBMITTED
                },
                select: {
                    id: true
                }
            });

            if (activeReviewTasks.length > 0) {
                throw new Error(`Cannot remove member. User has ${activeReviewTasks.length} task(s) pending review. Please complete all reviews first.`);
            }

            await prisma.projectMember.delete({
                where: {
                    projectId_userId: {
                        projectId,
                        userId,
                    },
                },
            })

            logger.info('SERVICE', 'Member removed successfully', { projectId, userId });
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

    /**
     * Reassign project to a new manager
     * Removes the old manager from the project entirely.
     */
    static async reassignManager(projectId: string, newManagerId: string, reason?: string, adminId?: string) {
        try {
            // Find old manager
            const oldManager = await prisma.projectMember.findFirst({
                where: {
                    projectId,
                    projectRole: ProjectRole.MANAGER
                },
                include: {
                    project: { select: { name: true } }
                }
            });

            if (oldManager && oldManager.userId === newManagerId) {
                throw new Error('This user is already the manager of this project.');
            }

            // Remove old manager if exists
            if (oldManager) {
                await prisma.projectMember.delete({
                    where: { projectId_userId: { projectId, userId: oldManager.userId } }
                });
            }

            // Upsert new manager
            const newMember = await prisma.projectMember.upsert({
                where: {
                    projectId_userId: { projectId, userId: newManagerId }
                },
                update: {
                    projectRole: ProjectRole.MANAGER
                },
                create: {
                    projectId,
                    userId: newManagerId,
                    projectRole: ProjectRole.MANAGER
                },
                include: {
                    project: { select: { name: true } }
                }
            });

            // Handle logging
            if (adminId) {
                await prisma.auditLog.create({
                    data: {
                        action: 'PROJECT_MANAGER_REASSIGNED',
                        actorId: adminId,
                        targetId: projectId,
                        metadata: {
                            oldManagerId: oldManager?.userId,
                            newManagerId,
                            reason
                        }
                    }
                });
            }

            // Notifications
            const { broadcastService } = await import('../websocket/events/broadcast.service.js');
            const io = broadcastService.getIO();
            
            if (io) {
                const { sendNotification } = await import('../websocket/handlers/notification.handler.js');
                const { NotificationType } = await import('@prisma/client');
                
                // Notify old manager
                if (oldManager) {
                    await sendNotification(io, {
                        userId: oldManager.userId,
                        type: NotificationType.PROJECT_UNASSIGNED,
                        title: 'Project Reassigned',
                        message: `Dự án "${oldManager.project.name}" đã được phân công cho quản lý khác. Bạn không còn là quản lý của dự án này nữa.`,
                        metadata: { projectId, projectName: oldManager.project.name, reason }
                    });
                }

                // Notify new manager
                await sendNotification(io, {
                    userId: newManagerId,
                    type: NotificationType.PROJECT_ASSIGNED,
                    title: 'Project Assigned',
                    message: `Bạn vừa được phân công làm quản lý cho dự án "${newMember.project.name}".`,
                    metadata: { projectId, projectName: newMember.project.name, reason }
                });
            }

            return newMember;
        } catch (error) {
            logger.error('SERVICE', 'Error reassigning manager', { projectId, newManagerId, error });
            throw error;
        }
    }
    /**
     * Get images for a project with optional filtering
     */
    static async getImages(projectId: string, options: {
        page?: number
        limit?: number
        datasetId?: string | null // string for strict ID, null for strictly NO dataset (general), undefined for ALL
        search?: string
    }) {
        try {
            const { page = 1, limit = 20, datasetId, search } = options
            const skip = (page - 1) * limit

            const where: Prisma.ImageWhereInput = {
                projectId,
                ...(datasetId !== undefined && { datasetId: datasetId }),
                ...(search && {
                    originalFilename: {
                        contains: search,
                        mode: 'insensitive'
                    }
                })
            }

            const [images, total] = await Promise.all([
                prisma.image.findMany({
                    where,
                    orderBy: { uploadedAt: 'desc' },
                    skip,
                    take: limit,
                    include: {
                        dataset: {
                            select: { name: true }
                        }
                    }
                }),
                prisma.image.count({ where })
            ])

            return {
                data: images,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        } catch (error) {
            logger.error('SERVICE', 'Error getting project images', { projectId, error })
            throw error
        }
    }
    /**
     * Delete an image from project
     */
    static async deleteImage(projectId: string, imageId: string) {
        try {
            // 1. Get image to find publicId
            const image = await prisma.image.findFirst({
                where: {
                    id: imageId,
                    projectId: projectId
                }
            })

            if (!image) {
                throw new Error('Image not found in project')
            }

            // 2. Check if any task for this image has assignments
            const assignedTask = await prisma.task.findFirst({
                where: {
                    imageId: imageId,
                    assignments: {
                        some: {}
                    }
                },
                select: {
                    id: true,
                    assignments: {
                        select: {
                            annotator: {
                                select: { fullName: true, email: true }
                            }
                        },
                        take: 1
                    }
                }
            })

            if (assignedTask) {
                const assignee = assignedTask.assignments[0]?.annotator
                const assigneeName = assignee?.fullName || assignee?.email || 'unknown'
                throw new Error(`Cannot delete image: task is already assigned to ${assigneeName}`)
            }

            // 3. Delete from DB
            await prisma.image.delete({
                where: { id: imageId }
            })

            // 3. Delete from Cloudinary
            if (image.publicId) {
                const { ImageService } = await import('./image.service.js')
                await ImageService.deleteImage(image.publicId)
            }

            return true
        } catch (error) {
            logger.error('SERVICE', 'Error deleting image', { projectId, imageId, error })
            throw error
        }
    }

    /**
     * Bulk delete images
     */
    static async deleteImages(projectId: string, imageIds: string[]) {
        try {
            // 1. Get images to find publicIds
            const images = await prisma.image.findMany({
                where: {
                    id: { in: imageIds },
                    projectId: projectId
                }
            })

            if (images.length === 0) {
                return { count: 0 }
            }

            // 2. Check if any tasks for these images have assignments
            const assignedTasks = await prisma.task.findMany({
                where: {
                    imageId: { in: imageIds },
                    assignments: {
                        some: {}
                    }
                },
                select: {
                    id: true,
                    image: {
                        select: { originalFilename: true }
                    }
                }
            })

            if (assignedTasks.length > 0) {
                const assignedImageNames = assignedTasks
                    .map(t => t.image?.originalFilename || `Task #${t.id.substring(0, 6)}`)
                throw new Error(`Cannot delete images: ${assignedTasks.length} image(s) have assigned tasks (${assignedImageNames.join(', ')})`)
            }

            const publicIds = images.map(img => img.publicId).filter(id => id !== null) as string[]

            // 3. Delete from DB
            await prisma.image.deleteMany({
                where: {
                    id: { in: imageIds },
                    projectId: projectId
                }
            })

            // 3. Delete from Cloudinary (Parallel)
            if (publicIds.length > 0) {
                const { ImageService } = await import('./image.service.js')
                await Promise.all(publicIds.map(id => ImageService.deleteImage(id)))
            }

            return { count: images.length }
        } catch (error) {
            logger.error('SERVICE', 'Error bulk deleting images', { projectId, count: imageIds.length, error })
            throw error
        }
    }
}
