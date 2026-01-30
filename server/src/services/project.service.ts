import { prisma } from '../utils/database.js'
import logger from '../utils/logger.js'
import { Prisma, ProjectStatus } from '@prisma/client'

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
                        select: { tasks: true }, // Add detailed task stats later if needed
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
                },
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
}
