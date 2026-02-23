import { Request, Response } from 'express'
import { z, ZodError } from 'zod'
import { ProjectService } from '../services/project.service.js'
import { ProjectHealthService } from '../services/project-health.service.js'
import logger from '../utils/logger.js'
import { ProjectStatus } from '@prisma/client'

// Zod Schemas
const createProjectSchema = z.object({
    name: z.string().min(1, 'Project name is required').max(255),
    description: z.string().optional(),
    categoryId: z.string().uuid().optional().or(z.literal('')), // specific UUID or empty for null
    deadline: z.string().datetime().optional(), // Expect ISO string
    labelConfig: z.array(z.any()).optional(), // Basic check: array
    enableAiAssistance: z.boolean().optional(),
})

// Assignment Rule Schema
const assignmentRuleSchema = z.object({
    isAutoAssignEnabled: z.boolean().optional(),
    assignmentStrategy: z.string().optional(),
    autoAssignReviewer: z.boolean().optional(),
    reviewerDelayHours: z.number().int().min(0).optional(),
    maxTasksPerAnnotator: z.number().int().min(1).optional(),
    maxTasksPerReviewer: z.number().int().min(1).optional(),
    minAnnotatorReputation: z.number().min(0).max(100).optional(),
    minReviewerReputation: z.number().min(0).max(100).optional(),
    maxRejectionsBeforeReassign: z.number().int().min(1).optional(),
    autoReassignOnSkip: z.boolean().optional(),
})

const updateProjectSchema = createProjectSchema.partial().extend({
    status: z.nativeEnum(ProjectStatus).optional(),
    assignmentRule: assignmentRuleSchema.optional(),
})

const addMemberSchema = z.object({
    userId: z.string().uuid('Invalid user ID'),
    role: z.enum(['MANAGER', 'REVIEWER', 'ANNOTATOR']).optional(),
})

export class ProjectController {
    /**
     * POST /api/v1/projects
     */
    static async create(req: Request, res: Response) {
        try {
            const validatedData = createProjectSchema.parse(req.body)
            const user = (req as any).user
            const userId = user?.sub || user?.id

            // Clean up categoryId (if empty string, make it undefined)
            const categoryId =
                validatedData.categoryId === '' ? undefined : validatedData.categoryId

            // Convert date string to Date object
            const deadline = validatedData.deadline
                ? new Date(validatedData.deadline)
                : undefined

            const project = await ProjectService.create({
                name: validatedData.name,
                creatorId: userId,
                // STRICT FIX: Only spread valid values, do NOT pass undefined
                ...(validatedData.description !== undefined && { description: validatedData.description }),
                ...(categoryId !== undefined && { categoryId }),
                ...(deadline !== undefined && { deadline }),
                ...(validatedData.labelConfig !== undefined && { labelConfig: validatedData.labelConfig }),
                ...(validatedData.enableAiAssistance !== undefined && { enableAiAssistance: validatedData.enableAiAssistance }),
            })

            logger.info('API', `Project created: ${project.id}`, { actorId: userId })
            return res.status(201).json(project)
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({ error: 'Validation failed', details: (error as any).errors })
            }
            logger.error('API', 'Create project failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * GET /api/v1/projects
     * Logic:
     * - ADMIN: view all
     * - MANAGER / ANNOTATOR: view only projects they are member of
     */
    static async getAll(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1
            const limit = parseInt(req.query.limit as string) || 10
            const search = req.query.search as string | undefined
            const categoryId = req.query.categoryId as string | undefined
            const status = req.query.status as ProjectStatus | undefined

            const user = (req as any).user
            // ADMIN sees all. Others see only their projects.
            const userId = user.role === 'ADMIN' ? undefined : (user.sub || user.id)

            const result = await ProjectService.getAll({
                page,
                limit,

                ...(search !== undefined && { search }),
                ...(categoryId !== undefined && { categoryId }),
                ...(status !== undefined && { status }),
                ...(userId !== undefined && { userId }),
            })

            logger.info('API', `Get all projects (User: ${userId || 'ADMIN'})`)
            return res.json(result)
        } catch (error) {
            logger.error('API', 'Get all projects failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * GET /api/v1/projects/:id
     * Logic:
     * - ADMIN: view details
     * - MANAGER / ANNOTATOR: view details only if member
     */
    static async getById(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const user = (req as any).user
            const userId = user.role === 'ADMIN' ? undefined : (user.sub || user.id)

            // Pass userId to Service. If Service takes userId, it enforces membership check.
            const project = await ProjectService.getById(id, userId)

            if (!project) {
                // Determine if it really doesn't exist or just forbidden
                // Actually Service.getById returns null if not found (or filtered out)
                return res.status(404).json({ error: 'Project not found' })
            }

            // Security Check: If not ADMIN, must be a member or the creator


            return res.json(project)
        } catch (error) {
            logger.error('API', 'Get project by id failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * PUT /api/v1/projects/:id
     */
    static async update(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const validatedData = updateProjectSchema.parse(req.body)

            // Clean up categoryId
            // If empty string -> null (remove category)
            const categoryId =
                validatedData.categoryId === '' ? null : validatedData.categoryId

            const deadline = validatedData.deadline
                ? new Date(validatedData.deadline)
                : undefined

            const project = await ProjectService.update(id, {
                ...(validatedData.name !== undefined && { name: validatedData.name }),
                ...(validatedData.description !== undefined && { description: validatedData.description }),
                ...(categoryId !== undefined && { categoryId: categoryId }),
                ...(deadline !== undefined && { deadline }),
                ...(validatedData.labelConfig !== undefined && { labelConfig: validatedData.labelConfig }),
                ...(validatedData.enableAiAssistance !== undefined && { enableAiAssistance: validatedData.enableAiAssistance }),
                ...(validatedData.status !== undefined && { status: validatedData.status }),
                ...(validatedData.assignmentRule && { assignmentRule: validatedData.assignmentRule }),
            })

            logger.info('API', `Project updated: ${project.name}`, { actorId: (req as any).user?.sub || (req as any).user?.fullName })
            return res.json(project)
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({ error: 'Validation failed', details: (error as any).errors })
            }

            const message = error instanceof Error ? error.message : 'Unknown error'
            if (message.includes('Cannot update Label Configuration')) {
                return res.status(409).json({ error: message }) // Conflict
            }

            logger.error('API', 'Update project failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * DELETE /api/v1/projects/:id
     */
    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const user = (req as any).user
            const userId = user.sub || user.id
            const userRole = user.role

            await ProjectService.delete(id, userId, userRole)

            logger.info('API', `Project soft-deleted: ${id}`, { actorId: userId })
            return res.json({ message: 'Project archived successfully' })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            if (message.includes('Unauthorized')) {
                return res.status(403).json({ error: message })
            }
            if (message.includes('Cannot delete project')) {
                return res.status(409).json({ error: message }) // Conflict
            }
            if (message.includes('Project not found')) {
                return res.status(404).json({ error: 'Project not found' })
            }
            logger.error('API', 'Delete project failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * GET /api/v1/projects/:id/potential-members
     */
    static async getPotentialMembers(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const search = req.query.search as string || ''

            const users = await ProjectService.getPotentialMembers(id, search)
            return res.json(users)
        } catch (error) {
            logger.error('API', 'Get potential members failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * POST /api/v1/projects/:id/members
     */
    static async addMember(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const validatedData = addMemberSchema.parse(req.body)

            const member = await ProjectService.addMember(id, validatedData.userId, validatedData.role)

            logger.info('API', `Member added to project ${id}: ${validatedData.userId}`, { actorId: (req as any).user?.id })
            return res.status(201).json(member)
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({ error: 'Validation failed', details: (error as any).errors })
            }
            if (error instanceof Error && error.message.includes('already a member')) {
                return res.status(409).json({ error: error.message })
            }
            logger.error('API', 'Add project member failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * DELETE /api/v1/projects/:id/members/:userId
     */
    static async removeMember(req: Request, res: Response) {
        try {
            const { id, userId } = req.params as { id: string, userId: string }

            await ProjectService.removeMember(id, userId)

            logger.info('API', `Member removed from project ${id}: ${userId}`, { actorId: (req as any).user?.id })
            return res.json({ message: 'Member removed successfully' })
        } catch (error) {
            logger.error('API', 'Remove project member failed', { error })

            // Check if error is about active tasks
            if (error instanceof Error && error.message.includes('Cannot remove member')) {
                return res.status(400).json({ error: error.message })
            }

            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * PATCH /api/v1/projects/:id/members/:userId
     */
    static async updateMemberRole(req: Request, res: Response) {
        try {
            const { id, userId } = req.params as { id: string, userId: string }
            const { role } = req.body

            if (!role) {
                return res.status(400).json({ error: 'Role is required' })
            }

            const member = await ProjectService.updateMemberRole(id, userId, role)

            logger.info('API', `Member role updated in project ${id}: ${userId} -> ${role}`, { actorId: (req as any).user?.id })
            return res.json(member)
        } catch (error) {
            logger.error('API', 'Update member role failed', { error })
            if (error instanceof Error && error.message === 'Invalid role') {
                return res.status(400).json({ error: 'Invalid role' })
            }
            return res.status(500).json({ error: 'Internal server error' })
        }
    }


    /**
     * POST /api/v1/projects/:id/images
     * Upload image to project (and optional dataset)
     */
    static async uploadImage(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const { datasetId } = req.body
            const user = (req as any).user

            if (!req.file) {
                return res.status(400).json({ error: 'No image file uploaded' })
            }

            // Calculate Checksum (MD5) to detect duplicates
            const crypto = await import('crypto')
            const checksum = crypto.createHash('md5').update(req.file.buffer).digest('hex')

            const { prisma } = await import('../utils/database.js')

            // Check for existing duplicate in this project
            const existingImage = await prisma.image.findFirst({
                where: {
                    projectId: id,
                    checksum: checksum
                }
            })

            if (existingImage) {
                logger.warn('API', `Duplicate image skipped: ${req.file.originalname}`, { projectId: id, checksum })
                return res.status(409).json({
                    error: 'Duplicate image detected',
                    message: `The image "${req.file.originalname}" already exists in this project.`,
                    existingImageId: existingImage.id,
                    existingImageUrl: existingImage.storageUrl,
                    existingImageName: existingImage.originalFilename
                })
            }

            // 1. Verify project access
            // (Assuming middleware already checked basic auth, but we should check if user can upload to this project)
            // Ideally: Manager/Admin only? Or Annotator too? Spec says Manager uploads datasets.

            // 2. Upload to Cloudinary
            // Folder structure: v-label/{project_id}/{dataset_id or 'general'}/filename
            const folderPath = `v-label/projects/${id}/${datasetId || 'general'}`

            // We need ImageService here. Let's import it effectively or use it directly if ready.
            // Assumption: ImageService.uploadImage is available from previous phase.
            const { ImageService } = await import('../services/image.service.js')

            const uploadResult = await ImageService.uploadImage(
                req.file.buffer,
                folderPath
            )

            // 3. Save to Database
            const image = await prisma.image.create({
                data: {
                    projectId: id,
                    datasetId: datasetId || null,
                    originalFilename: req.file.originalname,
                    storageUrl: uploadResult.secure_url,
                    publicId: uploadResult.public_id,
                    width: uploadResult.width,
                    height: uploadResult.height,
                    format: uploadResult.format,
                    fileSizeBytes: BigInt(uploadResult.bytes),
                    uploadedBy: user.id || user.sub,
                    checksum: checksum, // Save checksum
                }
            })

            logger.info('API', `Image uploaded to project ${id}: ${image.id}`, { actorId: user.id })

            // Auto-assign task to annotator if enabled
            try {
                const { TaskService } = await import('../services/task.service.js')

                // Create task from image
                const taskId = await TaskService.createTaskFromImage(image.id, id)

                // Auto-assign to annotator if enabled
                await TaskService.autoAssignTask(taskId, id, 'ANNOTATOR')

                logger.info('API', `Task created and auto-assigned for image ${image.id}`, { taskId })
            } catch (taskError) {
                // Log error but don't fail the upload
                logger.error('API', 'Failed to create/assign task for image', {
                    error: taskError,
                    imageId: image.id
                })
            }

            // Return JSON compatible with BigInt handling (BigInt to string)
            return res.status(201).json({
                ...image,
                fileSizeBytes: image.fileSizeBytes?.toString()
            })

        } catch (error) {
            logger.error('API', 'Project image upload failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }
    /**
     * GET /api/v1/projects/:id/images
     */
    static async getImages(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const page = parseInt(req.query.page as string) || 1
            const limit = parseInt(req.query.limit as string) || 20

            // Handle datasetId:
            // - undefined/missing: fetch ALL images
            // - 'null': fetch images with datasetId = null (General)
            // - 'some-uuid': fetch images for that dataset
            let datasetId: string | null | undefined = req.query.datasetId as string | undefined
            const search = req.query.search as string | undefined

            if (datasetId === 'null') {
                datasetId = null
            } else if (!datasetId) {
                datasetId = undefined
            }

            const result = await ProjectService.getImages(id, {
                page,
                limit,
                ...(datasetId !== undefined && { datasetId }),
                ...(search && { search })
            })

            // Serialize BigInt
            const serializedData = result.data.map(img => ({
                ...img,
                fileSizeBytes: img.fileSizeBytes?.toString()
            }))

            return res.json({
                ...result,
                data: serializedData
            })
        } catch (error) {
            logger.error('API', 'Get project images failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }
    /**
     * DELETE /api/v1/projects/:id/images/:imageId
     */
    static async deleteImage(req: Request, res: Response) {
        try {
            const { id, imageId } = req.params as { id: string, imageId: string }

            await ProjectService.deleteImage(id, imageId)

            logger.info('API', `Image deleted from project ${id}: ${imageId}`, { actorId: (req as any).user?.id })

            return res.json({ message: 'Image deleted successfully' })
        } catch (error) {
            if (error instanceof Error && error.message === 'Image not found in project') {
                return res.status(404).json({ error: 'Image not found' })
            }
            logger.error('API', 'Delete project image failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * DELETE /api/v1/projects/:id/images/batch
     * Body: { imageIds: string[] }
     */
    static async deleteImagesBatch(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const { imageIds } = req.body

            if (!Array.isArray(imageIds) || imageIds.length === 0) {
                return res.status(400).json({ error: 'imageIds array is required' })
            }

            const result = await ProjectService.deleteImages(id, imageIds)

            logger.info('API', `Batch images deleted from project ${id}: ${result.count} images`, { actorId: (req as any).user?.id })

            return res.json({ message: `Successfully deleted ${result.count} images` })
        } catch (error) {
            logger.error('API', 'Batch delete project images failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }
    /**
 * GET /api/v1/projects/:id/health
 * Get project health statistics
 */
    static async getHealthStats(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const stats = await ProjectHealthService.getProjectHealthStats(id)
            return res.json(stats)
        } catch (error) {
            console.error('Get health stats error:', error)
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * GET /api/v1/projects/:id/rescue
     * Get rescue tasks by type
     */
    static async getRescueTasks(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const { type } = req.query as { type: 'STUCK' | 'PROBLEMATIC' | 'ORPHANED' }

            let tasks: any[] = []

            switch (type) {
                case 'STUCK':
                    tasks = await ProjectHealthService.getStuckTasks(id)
                    break
                case 'PROBLEMATIC':
                    tasks = await ProjectHealthService.getProblematicTasks(id)
                    break
                case 'ORPHANED':
                    tasks = await ProjectHealthService.getOrphanedTasks(id)
                    break
                default:
                    return res.status(400).json({ error: 'Invalid rescue type' })
            }

            return res.json(tasks)
        } catch (error) {
            console.error('Get rescue tasks error:', error)
            return res.status(500).json({ error: 'Internal server error' })

        }
    }

    /**
     * GET /api/v1/projects/:id/tasks
     * Get all tasks for a project with assignment status
     */
    static async getTasks(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const page = parseInt(req.query.page as string) || 1
            const limit = parseInt(req.query.limit as string) || 20
            const status = req.query.status as string | undefined
            const assigneeId = req.query.assigneeId as string | undefined

            const { prisma } = await import('../utils/database.js')

            const where: any = { projectId: id }

            // Build where clause for filtering
            const assignmentWhere: any = {}

            if (status) {
                assignmentWhere.status = status
            }

            if (assigneeId) {
                assignmentWhere.annotatorId = assigneeId
            }

            // Only apply assignment filter if we have conditions
            if (Object.keys(assignmentWhere).length > 0) {
                where.assignments = {
                    some: assignmentWhere
                }
            }

            const skip = (page - 1) * limit

            const [tasks, total] = await Promise.all([
                prisma.task.findMany({
                    where,
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
                        assignments: {
                            include: {
                                annotator: {
                                    select: {
                                        id: true,
                                        fullName: true,
                                        email: true,
                                        avatarUrl: true
                                    }
                                },
                                reviewer: {
                                    select: {
                                        id: true,
                                        fullName: true,
                                        email: true,
                                        avatarUrl: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { id: 'desc' },
                    skip,
                    take: limit
                }),
                prisma.task.count({ where })
            ])

            return res.json({
                data: tasks,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            })
        } catch (error) {
            logger.error('API', 'Get project tasks failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * POST /api/v1/projects/:id/tasks/:taskId/assign
     * Manually assign a task to an annotator
     */
    static async assignTask(req: Request, res: Response) {
        try {
            const { id, taskId } = req.params as { id: string; taskId: string }
            const { annotatorId, deadline } = req.body
            const user = (req as any).user
            const userId = user.sub || user.id

            if (!annotatorId) {
                return res.status(400).json({ error: 'annotatorId is required' })
            }

            const { prisma } = await import('../utils/database.js')
            const { AssignmentMethod, AssignmentStatus, ProjectRole } = await import('@prisma/client')

            // Verify task belongs to project
            const task = await prisma.task.findFirst({
                where: {
                    id: taskId,
                    projectId: id
                }
            })

            if (!task) {
                return res.status(404).json({ error: 'Task not found in this project' })
            }

            // Verify annotator is a member of this project with ANNOTATOR role
            const member = await prisma.projectMember.findFirst({
                where: {
                    projectId: id,
                    userId: annotatorId,
                    projectRole: ProjectRole.ANNOTATOR
                }
            })

            if (!member) {
                return res.status(400).json({ error: 'User is not an annotator in this project' })
            }

            // Check if task already has an active assignment for this annotator
            const existingAssignment = await prisma.taskAssignment.findFirst({
                where: {
                    taskId,
                    annotatorId,
                    status: {
                        in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
                    }
                }
            })

            if (existingAssignment) {
                return res.status(409).json({ error: 'Task already assigned to this annotator' })
            }

            // Use TaskService to create assignment with auto-calculated deadline
            const { TaskService } = await import('../services/task.service.js')
            const customDeadline = deadline ? new Date(deadline) : undefined

            await TaskService.assignToUser(
                taskId,
                annotatorId,
                'ANNOTATOR',
                AssignmentMethod.MANUAL,
                userId,
                customDeadline
            )

            // Fetch the created assignment to return
            const assignment = await prisma.taskAssignment.findFirst({
                where: {
                    taskId,
                    annotatorId
                },
                orderBy: { createdAt: 'desc' },
                include: {
                    annotator: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            avatarUrl: true
                        }
                    },
                    task: {
                        include: {
                            image: {
                                select: {
                                    id: true,
                                    storageUrl: true,
                                    originalFilename: true
                                }
                            }
                        }
                    }
                }
            })

            logger.info('API', `Task ${taskId} manually assigned to ${annotatorId}`, {
                actorId: userId,
                projectId: id
            })

            return res.status(201).json(assignment)
        } catch (error) {
            logger.error('API', 'Manual task assignment failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * DELETE /api/v1/projects/:id/tasks/:taskId/unassign
     * Unassign a task (remove assignment)
     */
    static async unassignTask(req: Request, res: Response) {
        try {
            const { id, taskId } = req.params as { id: string; taskId: string }
            const user = (req as any).user
            const userId = user.sub || user.id

            const { prisma } = await import('../utils/database.js')
            const { AssignmentStatus } = await import('@prisma/client')

            // Verify task belongs to project
            const task = await prisma.task.findFirst({
                where: {
                    id: taskId,
                    projectId: id
                }
            })

            if (!task) {
                return res.status(404).json({ error: 'Task not found in this project' })
            }

            // Find active assignment for this task
            const assignment = await prisma.taskAssignment.findFirst({
                where: {
                    taskId,
                    status: {
                        in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
                    }
                }
            })

            if (!assignment) {
                return res.status(404).json({ error: 'No active assignment found for this task' })
            }

            const previousAnnotatorId = assignment.annotatorId;
            const assignmentStatus = assignment.status;

            // Delete the assignment and clear task deadline in a transaction
            await prisma.$transaction([
                prisma.taskAssignment.delete({
                    where: { id: assignment.id }
                }),
                prisma.task.update({
                    where: { id: taskId },
                    data: { deadline: null }
                })
            ])

            // Update user workload based on assignment status
            if (previousAnnotatorId) {
                const { UserWorkloadService } = await import('../services/user-workload.service.js');

                if (assignmentStatus === AssignmentStatus.ASSIGNED) {
                    await UserWorkloadService.decrementAssignedTasks(previousAnnotatorId, id);
                } else if (assignmentStatus === AssignmentStatus.IN_PROGRESS) {
                    // Decrement inProgressTasks
                    const workload = await UserWorkloadService.getWorkload(previousAnnotatorId, id);
                    await prisma.userWorkload.update({
                        where: {
                            userId_projectId: {
                                userId: previousAnnotatorId,
                                projectId: id
                            }
                        },
                        data: {
                            inProgressTasks: { decrement: 1 }
                        }
                    });
                    await UserWorkloadService.updateAvailabilityStatus(previousAnnotatorId, id);
                }
            }

            logger.info('API', `Task ${taskId} unassigned, deadline cleared, and workload updated`, {
                actorId: userId,
                projectId: id,
                previousAnnotatorId
            })

            return res.json({ message: 'Task unassigned successfully' })
        } catch (error) {
            logger.error('API', 'Unassign task failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * PATCH /api/v1/projects/:id/tasks/:taskId/deadline
     * Update deadline for an existing task assignment
     */
    static async updateTaskDeadline(req: Request, res: Response) {
        try {
            const { id, taskId } = req.params as { id: string; taskId: string }
            const { deadline } = req.body
            const user = (req as any).user
            const userId = user.sub || user.id

            if (!deadline) {
                return res.status(400).json({ error: 'deadline is required' })
            }

            const { prisma } = await import('../utils/database.js')
            const { AssignmentStatus } = await import('@prisma/client')

            // Verify task belongs to project
            const task = await prisma.task.findFirst({
                where: {
                    id: taskId,
                    projectId: id
                }
            })

            if (!task) {
                return res.status(404).json({ error: 'Task not found in this project' })
            }

            // Find active assignment for this task
            const assignment = await prisma.taskAssignment.findFirst({
                where: {
                    taskId,
                    status: {
                        in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
                    }
                }
            })

            if (!assignment) {
                return res.status(404).json({ error: 'No active assignment found for this task' })
            }

            // Update the deadline in both task_assignments and tasks tables
            const deadlineDate = new Date(deadline)

            const [updatedAssignment] = await prisma.$transaction([
                // Update task assignment deadline
                prisma.taskAssignment.update({
                    where: { id: assignment.id },
                    data: { deadline: deadlineDate },
                    include: {
                        annotator: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                                avatarUrl: true
                            }
                        }
                    }
                }),
                // Also update task deadline
                prisma.task.update({
                    where: { id: taskId },
                    data: { deadline: deadlineDate }
                })
            ])

            logger.info('API', `Task ${taskId} deadline updated in both task and assignment`, {
                actorId: userId,
                projectId: id,
                newDeadline: deadline
            })

            return res.json(updatedAssignment)
        } catch (error) {
            logger.error('API', 'Update task deadline failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * GET /api/v1/projects/:id/workloads
     * Get user workloads for a project
     */
    static async getWorkloads(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }

            const { UserWorkloadService } = await import('../services/user-workload.service.js')
            const workloads = await UserWorkloadService.getProjectWorkloads(id)

            return res.json(workloads)
        } catch (error) {
            logger.error('API', 'Get workloads failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }
}
