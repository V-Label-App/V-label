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
            const { datasetId, batchSessionId } = req.body
            const user = (req as any).user

            if (!req.file) {
                return res.status(400).json({ error: 'No image file uploaded' })
            }

            // Calculate Checksum (MD5) to detect duplicates
            const crypto = await import('crypto')
            const checksum = crypto.createHash('md5').update(req.file.buffer).digest('hex')

            const { prisma } = await import('../utils/database.js')

            // Check for existing duplicate in same dataset (or project-wide if no dataset)
            const duplicateWhere = datasetId
                ? { projectId: id, datasetId, checksum }
                : { projectId: id, datasetId: null, checksum }

            const existingImage = await prisma.image.findFirst({
                where: duplicateWhere
            })

            if (existingImage) {
                const scope = datasetId ? 'dataset' : 'project'
                logger.warn('API', `Duplicate image skipped: ${req.file.originalname}`, { projectId: id, datasetId, checksum })
                return res.status(409).json({
                    error: 'Duplicate image detected',
                    message: `The image "${req.file.originalname}" already exists in this ${scope}.`,
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
                const userId = user.id || user.sub
                const isBatchUpload = !!batchSessionId

                // Create task from image (skip activity if batch upload)
                const taskId = await TaskService.createTaskFromImage(image.id, id, userId, isBatchUpload)

                // If batch upload, add to batch session for consolidation
                if (batchSessionId) {
                    const { BatchUploadService } = await import('../services/batch-upload.service.js')
                    BatchUploadService.addTaskToBatch(
                        batchSessionId,
                        id,
                        userId,
                        taskId,
                        image.originalFilename
                    )
                }

                // Auto-assign to annotator if enabled (skip activity if batch)
                const wasAssigned = await TaskService.autoAssignTask(taskId, id, 'ANNOTATOR', undefined, isBatchUpload)

                // If batch upload and task was assigned, mark it in batch session
                if (batchSessionId && wasAssigned) {
                    const { BatchUploadService } = await import('../services/batch-upload.service.js')
                    BatchUploadService.markTaskAssigned(batchSessionId, taskId)
                }

                logger.info('API', `Task created and auto-assigned for image ${image.id}`, { taskId, batchSessionId, wasAssigned })
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
     * POST /api/v1/projects/:id/images/batch
     * Batch upload images to project
     */
    static async uploadImagesBatch(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const { datasetId } = req.body
            const user = (req as any).user
            const userId = user.id || user.sub

            if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
                return res.status(400).json({ error: 'No image files uploaded' })
            }

            const files = req.files as Express.Multer.File[]
            const crypto = await import('crypto')
            const { prisma } = await import('../utils/database.js')
            const { ImageService } = await import('../services/image.service.js')
            const { TaskService } = await import('../services/task.service.js')

            const results = {
                successful: [] as any[],
                duplicates: [] as any[],
                failed: [] as any[]
            }

            const uploadedImages: any[] = []
            const createdTaskIds: string[] = []
            const folderPath = `v-label/projects/${id}/${datasetId || 'general'}`

            // Process each file
            for (const file of files) {
                try {
                    // Calculate checksum
                    const checksum = crypto.createHash('md5').update(file.buffer).digest('hex')

                    // Check for duplicate
                    const existingImage = await prisma.image.findFirst({
                        where: {
                            projectId: id,
                            checksum: checksum
                        }
                    })

                    if (existingImage) {
                        logger.warn('API', `Duplicate image skipped: ${file.originalname}`, { projectId: id })
                        results.duplicates.push({
                            filename: file.originalname,
                            existingImageId: existingImage.id,
                            existingImageUrl: existingImage.storageUrl
                        })
                        continue
                    }

                    // Upload to Cloudinary
                    const uploadResult = await ImageService.uploadImage(file.buffer, folderPath)

                    // Save to database
                    const image = await prisma.image.create({
                        data: {
                            projectId: id,
                            datasetId: datasetId || null,
                            originalFilename: file.originalname,
                            storageUrl: uploadResult.secure_url,
                            publicId: uploadResult.public_id,
                            width: uploadResult.width,
                            height: uploadResult.height,
                            format: uploadResult.format,
                            fileSizeBytes: BigInt(uploadResult.bytes),
                            uploadedBy: userId,
                            checksum: checksum,
                        }
                    })

                    uploadedImages.push(image)
                    results.successful.push({
                        filename: file.originalname,
                        imageId: image.id,
                        url: image.storageUrl
                    })

                    // Create task from image (skip individual activity logging)
                    const taskId = await TaskService.createTaskFromImage(image.id, id, userId, true)
                    createdTaskIds.push(taskId)

                } catch (fileError) {
                    logger.error('API', `Failed to upload file: ${file.originalname}`, { error: fileError })
                    results.failed.push({
                        filename: file.originalname,
                        error: 'Upload failed'
                    })
                }
            }

            logger.info('API', `Batch upload completed for project ${id}`, {
                successful: results.successful.length,
                duplicates: results.duplicates.length,
                failed: results.failed.length,
                actorId: userId
            })

            // Log bulk created activity if tasks were created
            if (createdTaskIds.length > 0) {
                try {
                    const { TaskActivityService } = await import('../services/task-activity.service.js')
                    const { TaskAction } = await import('@prisma/client')

                    const taskNames = uploadedImages.map(img => img.originalFilename)

                    await TaskActivityService.logBulkActivity({
                        taskIds: createdTaskIds,
                        projectId: id,
                        userId,
                        action: TaskAction.CREATED,
                        metadata: {
                            count: createdTaskIds.length,
                            taskNames
                        }
                    })
                } catch (activityError) {
                    logger.error('API', 'Failed to log bulk created activity', { error: activityError })
                }

                // Auto-assign tasks if enabled and group by annotator
                try {
                    const project = await prisma.project.findUnique({
                        where: { id },
                        include: { assignmentRule: true }
                    })

                    if (project?.assignmentRule?.isAutoAssignEnabled) {
                        // Map to track assignments by annotator
                        const assignmentsByAnnotator = new Map<string, string[]>()

                        for (const taskId of createdTaskIds) {
                            const assigned = await TaskService.autoAssignTask(taskId, id, 'ANNOTATOR', undefined, true)

                            if (assigned) {
                                // Get the assignment to find annotator
                                const assignment = await prisma.taskAssignment.findFirst({
                                    where: { taskId },
                                    orderBy: { createdAt: 'desc' },
                                    include: {
                                        annotator: {
                                            select: { id: true, fullName: true, email: true }
                                        }
                                    }
                                })

                                if (assignment) {
                                    const annotatorId = assignment.annotatorId
                                    if (!assignmentsByAnnotator.has(annotatorId)) {
                                        assignmentsByAnnotator.set(annotatorId, [])
                                    }
                                    assignmentsByAnnotator.get(annotatorId)!.push(taskId)
                                }
                            }
                        }

                        // Log bulk assigned activities for each annotator
                        const { TaskActivityService } = await import('../services/task-activity.service.js')
                        const { TaskAction } = await import('@prisma/client')

                        for (const [annotatorId, taskIds] of assignmentsByAnnotator.entries()) {
                            if (taskIds.length === 0) continue

                            const annotator = await prisma.user.findUnique({
                                where: { id: annotatorId },
                                select: { fullName: true, email: true }
                            })

                            // Get task names for these tasks
                            const tasks = await prisma.task.findMany({
                                where: { id: { in: taskIds } },
                                include: { image: { select: { originalFilename: true } } }
                            })
                            const taskNames = tasks.map(t => t.image?.originalFilename || `Task #${t.id.substring(0, 6)}`)

                            await TaskActivityService.logBulkActivity({
                                taskIds,
                                projectId: id,
                                userId,
                                action: TaskAction.BULK_ASSIGNED,
                                metadata: {
                                    count: taskIds.length,
                                    targetUserId: annotatorId,
                                    targetUserName: annotator?.fullName || annotator?.email || 'Unknown',
                                    taskNames
                                }
                            })
                        }

                        logger.info('API', `Auto-assigned ${createdTaskIds.length} tasks to annotators`, {
                            projectId: id,
                            annotatorCount: assignmentsByAnnotator.size
                        })
                    }
                } catch (assignError) {
                    logger.error('API', 'Failed to auto-assign tasks', { error: assignError })
                }
            }

            return res.status(201).json({
                message: 'Batch upload completed',
                results: {
                    successful: results.successful.length,
                    duplicates: results.duplicates.length,
                    failed: results.failed.length,
                    total: files.length
                },
                details: results
            })

        } catch (error) {
            logger.error('API', 'Batch image upload failed', { error })
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
     * POST /api/v1/projects/:id/images/check-assignments
     * Check which images have assignments
     * Body: { imageIds: string[] }
     */
    static async checkImageAssignments(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const { imageIds } = req.body

            if (!Array.isArray(imageIds) || imageIds.length === 0) {
                return res.status(400).json({ error: 'imageIds array is required' })
            }

            const { prisma } = await import('../utils/database.js')

            // Get all tasks for these images with their assignments
            const tasks = await prisma.task.findMany({
                where: {
                    imageId: { in: imageIds },
                    projectId: id
                },
                select: {
                    id: true,
                    imageId: true,
                    image: {
                        select: {
                            originalFilename: true,
                            storageUrl: true
                        }
                    },
                    assignments: {
                        where: {
                            status: {
                                in: ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED']
                            }
                        },
                        select: {
                            id: true,
                            status: true,
                            annotator: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    email: true
                                }
                            }
                        }
                    }
                }
            })

            // Separate images into assigned and unassigned
            const assignedImages: any[] = []
            const unassignedImages: string[] = []

            const imageTaskMap = new Map<string, any>()
            tasks.forEach(task => {
                if (task.imageId) {
                    imageTaskMap.set(task.imageId, task)
                }
            })

            imageIds.forEach(imageId => {
                const task = imageTaskMap.get(imageId)
                if (task && task.assignments.length > 0) {
                    assignedImages.push({
                        imageId,
                        taskId: task.id,
                        filename: task.image?.originalFilename,
                        storageUrl: task.image?.storageUrl,
                        assignments: task.assignments.map((a: any) => ({
                            assignmentId: a.id,
                            status: a.status,
                            annotatorId: a.annotator.id,
                            annotatorName: a.annotator.fullName || a.annotator.email
                        }))
                    })
                } else {
                    unassignedImages.push(imageId)
                }
            })

            return res.json({
                assigned: assignedImages,
                unassigned: unassignedImages
            })
        } catch (error) {
            logger.error('API', 'Check image assignments failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * DELETE /api/v1/projects/:id/images/:imageId
     */
    static async deleteImage(req: Request, res: Response) {
        try {
            const { id, imageId } = req.params as { id: string, imageId: string }
            const user = (req as any).user
            const userId = user.sub || user.id

            const { prisma } = await import('../utils/database.js')

            // Get task info BEFORE deletion
            const task = await prisma.task.findFirst({
                where: {
                    imageId: imageId,
                    projectId: id
                },
                select: {
                    id: true,
                    image: {
                        select: {
                            originalFilename: true
                        }
                    }
                }
            })

            // Log activity BEFORE deleting (taskId will be set to NULL after deletion)
            if (task) {
                try {
                    const { TaskActivityService } = await import('../services/task-activity.service.js')
                    const { TaskAction } = await import('@prisma/client')

                    await TaskActivityService.logActivity({
                        taskId: task.id,
                        projectId: id,
                        userId,
                        action: TaskAction.DELETED,
                        metadata: {
                            taskName: task.image?.originalFilename || `Task #${task.id.substring(0, 6)}`
                        }
                    })
                } catch (activityError) {
                    logger.error('API', 'Failed to log delete activity', { error: activityError })
                }
            }

            // Delete image (task will be cascade deleted, taskId in activity will be set to NULL)
            await ProjectService.deleteImage(id, imageId)

            logger.info('API', `Image deleted from project ${id}: ${imageId}`, { actorId: userId })

            return res.json({ message: 'Image deleted successfully' })
        } catch (error) {
            if (error instanceof Error && error.message === 'Image not found in project') {
                return res.status(404).json({ error: 'Image not found' })
            }
            if (error instanceof Error && error.message.includes('Cannot delete image')) {
                return res.status(409).json({ error: error.message })
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
            const user = (req as any).user
            const userId = user.sub || user.id

            if (!Array.isArray(imageIds) || imageIds.length === 0) {
                return res.status(400).json({ error: 'imageIds array is required' })
            }

            // Log activity before deletion (get task IDs first)
            const { prisma } = await import('../utils/database.js')
            try {
                const { TaskActivityService } = await import('../services/task-activity.service.js')
                const { TaskAction } = await import('@prisma/client')

                // Get tasks associated with these images
                const tasks = await prisma.task.findMany({
                    where: {
                        imageId: { in: imageIds },
                        projectId: id
                    },
                    select: {
                        id: true,
                        image: {
                            select: {
                                originalFilename: true
                            }
                        }
                    }
                })

                if (tasks.length > 0) {
                    const taskIds = tasks.map(t => t.id)
                    const taskNames = tasks.map(t => t.image?.originalFilename || `Task #${t.id.substring(0, 6)}`).filter(Boolean)

                    await TaskActivityService.logBulkActivity({
                        taskIds,
                        projectId: id,
                        userId,
                        action: TaskAction.BULK_DELETED,
                        metadata: {
                            count: taskIds.length,
                            taskNames
                        }
                    })
                }
            } catch (activityError) {
                logger.error('API', 'Failed to log bulk delete activity', { error: activityError })
            }

            const result = await ProjectService.deleteImages(id, imageIds)

            logger.info('API', `Batch images deleted from project ${id}: ${result.count} images`, { actorId: userId })

            return res.json({ message: `Successfully deleted ${result.count} images` })
        } catch (error) {
            if (error instanceof Error && error.message.includes('Cannot delete images')) {
                return res.status(409).json({ error: error.message })
            }
            logger.error('API', 'Batch delete project images failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }
    /**
     * GET /api/v1/projects/assignments/:assignmentId
     * Manager/Admin: view any task assignment for review (no ownership check)
     */
    static async getTaskAssignmentForReview(req: Request, res: Response) {
        try {
            const { assignmentId } = req.params as { assignmentId: string }
            const { prisma } = await import('../utils/database.js')

            const assignment = await prisma.taskAssignment.findUnique({
                where: { id: assignmentId },
                include: {
                    task: {
                        include: {
                            image: true,
                            assignments: {
                                where: {
                                    // Include ALL rejected/skipped assignments,
                                    // including the current one if it is rejected.
                                    status: { in: ['REJECTED', 'SKIPPED'] },
                                },
                                include: {
                                    annotator: { select: { fullName: true, email: true } },
                                },
                                orderBy: { createdAt: 'desc' },
                            },
                            project: {
                                include: {
                                    projectLabels: {
                                        include: {
                                            label: {
                                                include: { category: true }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    annotator: {
                        select: { id: true, fullName: true, email: true }
                    },
                    reviewer: {
                        select: { id: true, fullName: true, email: true }
                    }
                }
            })

            if (!assignment) {
                return res.status(404).json({ error: 'Task assignment not found' })
            }

            const result = JSON.parse(JSON.stringify(assignment, (_, value) =>
                typeof value === 'bigint' ? Number(value) : value
            ))

            if (result.task) {
                result.task.history = result.task.assignments || []
                delete result.task.assignments
            }

            return res.json(result)
        } catch (error) {
            logger.error('API', 'Get task assignment for review failed', { error })
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
            const pendingReview = req.query.pendingReview as string | undefined

            const { prisma } = await import('../utils/database.js')

            const where: any = { projectId: id }

            // Filter: tasks SUBMITTED but no reviewer assigned yet
            if (pendingReview === 'true') {
                where.assignments = {
                    some: {
                        status: 'SUBMITTED',
                        reviewerId: null
                    }
                }
            } else {
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
                                },
                                submissionHistory: {
                                    orderBy: { submissionNumber: 'desc' }
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
            const { annotatorId, deadline, reason, force } = req.body
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
                },
                include: {
                    image: {
                        select: {
                            originalFilename: true
                        }
                    }
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

            // Check workload limit (soft block — Manager can override with force: true)
            if (!force) {
                const assignmentRule = await prisma.assignmentRule.findUnique({
                    where: { projectId: id }
                })
                if (assignmentRule) {
                    const { TaskService } = await import('../services/task.service.js')
                    const currentTasks = await TaskService.getActiveTaskCount(annotatorId, 'ANNOTATOR')
                    const maxTasks = assignmentRule.maxTasksPerAnnotator
                    if (currentTasks >= maxTasks) {
                        logger.warn('API', `Manual assign blocked: annotator ${annotatorId} workload limit reached`, {
                            projectId: id, currentTasks, maxTasks
                        })
                        return res.status(400).json({
                            error: 'Workload limit exceeded',
                            currentTasks,
                            maxTasks,
                            message: `Annotator has reached the maximum task limit (${currentTasks}/${maxTasks}). Send force: true to override.`
                        })
                    }
                }
            }

            // Check if task already has an active assignment
            const existingAssignment = await prisma.taskAssignment.findFirst({
                where: {
                    taskId,
                    status: {
                        in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS, AssignmentStatus.REJECTED]
                    }
                },
                include: {
                    annotator: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true
                        }
                    }
                }
            })

            // Check if it's the same annotator
            if (existingAssignment && existingAssignment.annotatorId === annotatorId) {
                return res.status(409).json({ error: 'Task already assigned to this annotator' })
            }

            // Store old assignment info for activity log if needed
            const isReassignment = !!existingAssignment
            const oldAnnotator = existingAssignment?.annotator

            // Note: Old assignments are now automatically cleaned up inside TaskService.assignToUser
            // This ensures centralized logic for both manual and automatic reassignments.

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

            // Log activity
            try {
                const { TaskActivityService } = await import('../services/task-activity.service.js')
                const { TaskAction } = await import('@prisma/client')

                const annotator = await prisma.user.findUnique({
                    where: { id: annotatorId },
                    select: { fullName: true, email: true }
                })

                // Determine action based on whether it's a reassignment
                const action = isReassignment ? TaskAction.REASSIGNED : TaskAction.ASSIGNED
                const metadata: any = {
                    targetUserId: annotatorId,
                    targetUserName: annotator?.fullName || annotator?.email,
                    deadline: assignment?.deadline?.toISOString(),
                }

                // Add old assignee info if reassignment
                if (isReassignment && oldAnnotator) {
                    metadata.oldAssignee = oldAnnotator.fullName || oldAnnotator.email
                    metadata.newAssignee = annotator?.fullName || annotator?.email
                    if (reason) {
                        metadata.reason = reason
                    }
                }

                await TaskActivityService.logActivity({
                    taskId,
                    projectId: id,
                    userId,
                    action,
                    metadata
                })
            } catch (activityError) {
                logger.error('API', 'Failed to log task assignment activity', { error: activityError })
            }

            // Send notification and email to annotator
            try {
                const { NotificationType } = await import('@prisma/client')
                const { NotificationTemplateService } = await import('../services/notification.template.service.js')
                const { NotificationService } = await import('../services/notification.service.js')
                const { broadcastService } = await import('../websocket/events/broadcast.service.js')
                const { SystemEventType } = await import('../websocket/events/types.js')
                const { EmailService } = await import('../services/email/email.service.js')

                // Get project info
                const project = await prisma.project.findUnique({
                    where: { id },
                    select: { id: true, name: true }
                })

                // Get annotator info
                const annotator = await prisma.user.findUnique({
                    where: { id: annotatorId },
                    select: { id: true, email: true, fullName: true }
                })

                if (project && annotator && assignment) {
                    // Render notification template
                    const rendered = await NotificationTemplateService.render(
                        NotificationType.TASK_ASSIGNED,
                        {
                            taskId: task.id,
                            taskName: task.image?.originalFilename || 'Untitled Task',
                            projectId: project.id,
                            projectName: project.name
                        }
                    )

                    if (rendered) {
                        // Create notification in DB
                        const notification = await NotificationService.createNotification({
                            userId: annotatorId,
                            type: NotificationType.TASK_ASSIGNED,
                            title: rendered.title,
                            message: rendered.message,
                            metadata: {
                                taskId: task.id,
                                projectId: project.id,
                                projectName: project.name,
                                deadline: assignment.deadline?.toISOString()
                            }
                        })

                        // Broadcast via WebSocket
                        broadcastService.broadcastToUser(annotatorId, SystemEventType.NOTIFICATION_CREATED, {
                            notification: {
                                id: notification.id,
                                type: notification.type,
                                title: notification.title,
                                message: notification.message,
                                metadata: notification.metadata,
                                isRead: notification.isRead,
                                createdAt: notification.createdAt
                            }
                        })

                        // Send email
                        const emailService = new EmailService()
                        const taskUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/annotator/tasks/${task.id}`
                        const deadlineFormatted = assignment.deadline
                            ? new Date(assignment.deadline).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })
                            : 'No deadline'

                        await emailService.sendEmail({
                            to: annotator.email,
                            templateType: 'TASK_ASSIGNED',
                            variables: {
                                userName: annotator.fullName || annotator.email,
                                projectName: project.name,
                                taskId: task.id.substring(0, 8),
                                deadline: deadlineFormatted,
                                taskUrl
                            }
                        })

                        logger.info('API', `Notification and email sent for task assignment`, {
                            taskId,
                            annotatorId,
                            projectId: id
                        })
                    }
                }
            } catch (notifError) {
                // Don't fail the whole request if notification fails
                logger.error('API', 'Failed to send task assignment notification/email', {
                    error: notifError,
                    taskId,
                    annotatorId
                })
            }

            return res.status(201).json(assignment)
        } catch (error) {
            logger.error('API', 'Manual task assignment failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * POST /api/v1/projects/:id/images/import-zip
     * Import images from ZIP file (max 200 images)
     */
    static async importFromZip(req: Request, res: Response) {
        try {
            const { id: projectId } = req.params as { id: string }
            const user = (req as any).user
            const zipFile = req.file

            if (!zipFile) {
                return res.status(400).json({ error: 'No ZIP file uploaded' })
            }

            logger.info('API', `Starting ZIP import for project ${projectId}`, {
                zipFilename: zipFile.originalname,
                zipSize: zipFile.size
            })

            // Load ZIP
            const JSZip = (await import('jszip')).default
            const zip = await JSZip.loadAsync(zipFile.buffer)

            // Filter image files (skip hidden files and folders)
            const imageFiles = Object.keys(zip.files)
                .filter(filename => {
                    if (filename.startsWith('__MACOSX') ||
                        filename.includes('.DS_Store') ||
                        filename.toLowerCase().includes('thumbs.db') ||
                        filename.endsWith('/')) {
                        return false
                    }
                    return /\.(jpg|jpeg|png|webp)$/i.test(filename)
                })
                .map(filename => zip.files[filename])

            // Limit to 200 images
            if (imageFiles.length > 200) {
                return res.status(400).json({
                    error: 'Too many images in ZIP',
                    message: `ZIP contains ${imageFiles.length} images. Maximum allowed is 200 images.`
                })
            }

            if (imageFiles.length === 0) {
                return res.status(400).json({
                    error: 'No valid images found in ZIP',
                    message: 'ZIP must contain at least one image file (JPG, PNG, or WebP)'
                })
            }

            const crypto = await import('crypto')
            const { prisma } = await import('../utils/database.js')
            const { ImageService } = await import('../services/image.service.js')

            // Process each image
            const results = await Promise.allSettled(
                imageFiles.map(async (file) => {
                    const buffer = await file!.async('nodebuffer')
                    const filename = file!.name.split('/').pop() || file!.name

                    // Calculate checksum
                    const checksum = crypto.createHash('md5').update(buffer).digest('hex')

                    // Check duplicate
                    const existing = await prisma.image.findFirst({
                        where: { projectId, checksum }
                    })

                    if (existing) {
                        return {
                            status: 'duplicate' as const,
                            filename,
                            existingId: existing.id,
                            existingUrl: existing.storageUrl
                        }
                    }

                    // Upload to Cloudinary
                    const uploadResult = await ImageService.uploadImage(
                        buffer,
                        `v-label/projects/${projectId}/zip-imports`
                    )

                    // Save to DB
                    const image = await prisma.image.create({
                        data: {
                            projectId,
                            originalFilename: filename,
                            storageUrl: uploadResult.secure_url,
                            publicId: uploadResult.public_id,
                            width: uploadResult.width,
                            height: uploadResult.height,
                            format: uploadResult.format,
                            fileSizeBytes: BigInt(uploadResult.bytes),
                            checksum,
                            uploadedBy: user.id || user.sub,
                            channels: 3
                        }
                    })

                    return {
                        status: 'success' as const,
                        image
                    }
                })
            )

            // Aggregate results
            const successful: any[] = []
            const duplicates: any[] = []
            const failed: any[] = []

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    if (result.value.status === 'success') {
                        successful.push(result.value.image)
                    } else if (result.value.status === 'duplicate') {
                        duplicates.push({
                            filename: result.value.filename,
                            existingId: result.value.existingId,
                            existingUrl: result.value.existingUrl
                        })
                    }
                } else {
                    failed.push({
                        filename: imageFiles[index]!.name.split('/').pop(),
                        error: result.reason?.message || 'Unknown error'
                    })
                }
            })

            logger.info('API', `ZIP import completed for project ${projectId}`, {
                success: successful.length,
                duplicates: duplicates.length,
                failed: failed.length
            })

            return res.status(200).json({
                zipFilename: zipFile.originalname,
                totalFilesInZip: Object.keys(zip.files).length,
                validImages: imageFiles.length,
                success: successful.length,
                duplicates: duplicates.length,
                failed: failed.length,
                images: successful.map(img => ({
                    ...img,
                    fileSizeBytes: img.fileSizeBytes?.toString()
                })),
                duplicateFiles: duplicates,
                errors: failed
            })

        } catch (error) {
            logger.error('API', 'Import from ZIP failed', { error })
            return res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
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
                },
                include: {
                    image: {
                        select: {
                            originalFilename: true
                        }
                    }
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

            // Log activity
            try {
                const { TaskActivityService } = await import('../services/task-activity.service.js')
                const { TaskAction } = await import('@prisma/client')

                const annotator = await prisma.user.findUnique({
                    where: { id: previousAnnotatorId },
                    select: { fullName: true, email: true }
                })

                await TaskActivityService.logActivity({
                    taskId,
                    projectId: id,
                    userId,
                    action: TaskAction.UNASSIGNED,
                    metadata: {
                        targetUserId: previousAnnotatorId,
                        targetUserName: annotator?.fullName || annotator?.email || 'Unknown',
                    }
                })
            } catch (activityError) {
                logger.error('API', 'Failed to log task unassignment activity', { error: activityError })
            }

            return res.json({ message: 'Task unassigned successfully' })
        } catch (error) {
            logger.error('API', 'Unassign task failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * POST /api/v1/projects/:id/tasks/bulk-assign
     * Assign multiple tasks to an annotator at once
     */
    static async bulkAssignTasks(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const { taskIds, annotatorId, deadline, force } = req.body
            const user = (req as any).user
            const userId = user.sub || user.id

            if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
                return res.status(400).json({ error: 'Task IDs array is required' })
            }

            if (!annotatorId) {
                return res.status(400).json({ error: 'Annotator ID is required' })
            }

            const { prisma } = await import('../utils/database.js')
            const { TaskAction, AssignmentStatus } = await import('@prisma/client')

            // Verify all tasks belong to this project
            const tasks = await prisma.task.findMany({
                where: {
                    id: { in: taskIds },
                    projectId: id
                },
                include: {
                    image: {
                        select: {
                            originalFilename: true
                        }
                    }
                }
            })

            if (tasks.length !== taskIds.length) {
                return res.status(404).json({ error: 'Some tasks not found in this project' })
            }

            // Check annotator exists and is an ANNOTATOR
            const annotator = await prisma.user.findUnique({
                where: { id: annotatorId },
                select: { id: true, fullName: true, email: true, role: true }
            })

            if (!annotator) {
                return res.status(404).json({ error: 'Annotator not found' })
            }

            if (annotator.role !== 'ANNOTATOR') {
                return res.status(400).json({ error: 'User is not an annotator' })
            }

            // Check workload limit (soft block — Manager can override with force: true)
            if (!force) {
                const assignmentRule = await prisma.assignmentRule.findUnique({
                    where: { projectId: id }
                })
                if (assignmentRule) {
                    const { TaskService } = await import('../services/task.service.js')
                    const currentTasks = await TaskService.getActiveTaskCount(annotatorId, 'ANNOTATOR')
                    const maxTasks = assignmentRule.maxTasksPerAnnotator
                    // Check if adding these tasks would exceed the limit
                    if (currentTasks + taskIds.length > maxTasks) {
                        const remainingSlots = Math.max(0, maxTasks - currentTasks)
                        logger.warn('API', `Bulk assign blocked: annotator ${annotatorId} workload limit exceeded`, {
                            projectId: id, currentTasks, maxTasks, requestedTasks: taskIds.length, remainingSlots
                        })
                        return res.status(400).json({
                            error: 'Workload limit exceeded',
                            currentTasks,
                            maxTasks,
                            requestedTasks: taskIds.length,
                            remainingSlots,
                            message: `Annotator has ${currentTasks}/${maxTasks} active tasks. Cannot assign ${taskIds.length} more (only ${remainingSlots} slots available). Send force: true to override.`
                        })
                    }
                }
            }

            const deadlineDate = deadline ? new Date(deadline) : null

            // Delete existing assignments for these tasks, then create new ones
            await prisma.$transaction([
                // Delete existing assignments for these tasks
                prisma.taskAssignment.deleteMany({
                    where: {
                        taskId: { in: taskIds }
                    }
                }),
                // Create new assignments
                ...taskIds.map(taskId =>
                    prisma.taskAssignment.create({
                        data: {
                            taskId,
                            annotatorId,
                            status: AssignmentStatus.ASSIGNED,
                            deadline: deadlineDate
                        }
                    })
                )
            ])

            // Update task deadlines
            await prisma.task.updateMany({
                where: { id: { in: taskIds } },
                data: { deadline: deadlineDate }
            })

            // Update workload
            const { UserWorkloadService } = await import('../services/user-workload.service.js')
            await UserWorkloadService.initializeWorkload(annotatorId, id)
            await prisma.userWorkload.update({
                where: {
                    userId_projectId: {
                        userId: annotatorId,
                        projectId: id
                    }
                },
                data: {
                    assignedTasks: { increment: taskIds.length }
                }
            })
            await UserWorkloadService.updateAvailabilityStatus(annotatorId, id)

            logger.info('API', `Bulk assigned ${taskIds.length} tasks to ${annotatorId}`, {
                actorId: userId,
                projectId: id
            })

            // Log bulk activity
            try {
                const { TaskActivityService } = await import('../services/task-activity.service.js')

                // Get task names
                const taskNames = tasks.map(t => t.image?.originalFilename || `Task #${t.id.substring(0, 6)}`).filter(Boolean)

                await TaskActivityService.logBulkActivity({
                    taskIds,
                    projectId: id,
                    userId,
                    action: TaskAction.BULK_ASSIGNED,
                    metadata: {
                        count: taskIds.length,
                        targetUserId: annotatorId,
                        targetUserName: annotator.fullName || annotator.email,
                        ...(deadlineDate && { deadline: deadlineDate.toISOString() }),
                        taskNames
                    }
                })
            } catch (activityError) {
                logger.error('API', 'Failed to log bulk assign activity', { error: activityError })
            }

            return res.json({
                message: `Successfully assigned ${taskIds.length} tasks`,
                count: taskIds.length
            })
        } catch (error) {
            logger.error('API', 'Bulk assign tasks failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * POST /api/v1/projects/:id/tasks/bulk-unassign
     * Unassign multiple tasks at once
     */
    static async bulkUnassignTasks(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const { taskIds } = req.body
            const user = (req as any).user
            const userId = user.sub || user.id

            if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
                return res.status(400).json({ error: 'Task IDs array is required' })
            }

            const { prisma } = await import('../utils/database.js')
            const { TaskAction, AssignmentStatus } = await import('@prisma/client')

            // Verify all tasks belong to this project
            const tasks = await prisma.task.findMany({
                where: {
                    id: { in: taskIds },
                    projectId: id
                },
                include: {
                    image: {
                        select: {
                            originalFilename: true
                        }
                    }
                }
            })

            if (tasks.length !== taskIds.length) {
                return res.status(404).json({ error: 'Some tasks not found in this project' })
            }

            // Find all active assignments for these tasks
            const assignments = await prisma.taskAssignment.findMany({
                where: {
                    taskId: { in: taskIds },
                    status: {
                        in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
                    }
                },
                include: {
                    annotator: {
                        select: { id: true, fullName: true, email: true }
                    }
                }
            })

            if (assignments.length === 0) {
                return res.status(404).json({ error: 'No active assignments found for these tasks' })
            }

            // Group assignments by annotator for workload updates
            const annotatorGroups = new Map<string, { count: number; hasInProgress: boolean }>()
            assignments.forEach(assignment => {
                const current = annotatorGroups.get(assignment.annotatorId) || { count: 0, hasInProgress: false }
                current.count++
                if (assignment.status === AssignmentStatus.IN_PROGRESS) {
                    current.hasInProgress = true
                }
                annotatorGroups.set(assignment.annotatorId, current)
            })

            // Delete all assignments and clear deadlines in a transaction
            await prisma.$transaction([
                prisma.taskAssignment.deleteMany({
                    where: {
                        taskId: { in: taskIds },
                        status: {
                            in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
                        }
                    }
                }),
                prisma.task.updateMany({
                    where: { id: { in: taskIds } },
                    data: { deadline: null }
                })
            ])

            // Update workload for each affected annotator
            const { UserWorkloadService } = await import('../services/user-workload.service.js')
            for (const [annotatorId, { count, hasInProgress }] of annotatorGroups.entries()) {
                try {
                    // Decrement assigned tasks
                    await prisma.userWorkload.update({
                        where: {
                            userId_projectId: {
                                userId: annotatorId,
                                projectId: id
                            }
                        },
                        data: {
                            assignedTasks: { decrement: count }
                        }
                    })
                    await UserWorkloadService.updateAvailabilityStatus(annotatorId, id)

                    // If any were in progress, handle that separately
                    if (hasInProgress) {
                        const inProgressCount = assignments.filter(
                            a => a.annotatorId === annotatorId && a.status === AssignmentStatus.IN_PROGRESS
                        ).length

                        if (inProgressCount > 0) {
                            await prisma.userWorkload.update({
                                where: {
                                    userId_projectId: {
                                        userId: annotatorId,
                                        projectId: id
                                    }
                                },
                                data: {
                                    inProgressTasks: { decrement: inProgressCount }
                                }
                            })
                        }
                        await UserWorkloadService.updateAvailabilityStatus(annotatorId, id)
                    }
                } catch (workloadError) {
                    logger.error('API', `Failed to update workload for annotator ${annotatorId}`, { error: workloadError })
                }
            }

            logger.info('API', `Bulk unassigned ${assignments.length} tasks`, {
                actorId: userId,
                projectId: id
            })

            // Log bulk activity
            try {
                const { TaskActivityService } = await import('../services/task-activity.service.js')
                const targetUserName = assignments[0]?.annotator?.fullName || assignments[0]?.annotator?.email || 'Annotators'

                // Get task names for the unassigned tasks
                const unassignedTaskIds = assignments.map(a => a.taskId)
                const unassignedTasks = tasks.filter(t => unassignedTaskIds.includes(t.id))
                const taskNames = unassignedTasks.map(t => t.image?.originalFilename || `Task #${t.id.substring(0, 6)}`).filter(Boolean)

                await TaskActivityService.logBulkActivity({
                    taskIds: unassignedTaskIds,
                    projectId: id,
                    userId,
                    action: TaskAction.BULK_UNASSIGNED,
                    metadata: {
                        count: assignments.length,
                        targetUserName,
                        taskNames
                    }
                })
            } catch (activityError) {
                logger.error('API', 'Failed to log bulk unassign activity', { error: activityError })
            }

            return res.json({
                message: `Successfully unassigned ${assignments.length} tasks`,
                count: assignments.length
            })
        } catch (error) {
            logger.error('API', 'Bulk unassign tasks failed', { error })
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
                },
                include: {
                    image: {
                        select: {
                            originalFilename: true
                        }
                    }
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
    /**
     * POST /api/v1/projects/:id/images/import-cloud
     * Import images from Cloudinary folder (max 200 images)
     */
    static async importFromCloud(req: Request, res: Response) {
        try {
            const { id: projectId } = req.params as { id: string }
            const { source, folderPath } = req.body
            const user = (req as any).user

            // Validate
            if (!source || source !== 'cloudinary') {
                return res.status(400).json({
                    error: 'Invalid source',
                    message: 'Only "cloudinary" is supported as source'
                })
            }

            if (!folderPath) {
                return res.status(400).json({
                    error: 'Missing folderPath',
                    message: 'folderPath is required (e.g., "v-label/datasets/batch-001")'
                })
            }

            logger.info('API', `Starting cloud import for project ${projectId}`, {
                source,
                folderPath
            })

            // List all images in Cloudinary folder
            const cloudinary = (await import('../config/cloudinary.js')).default

            let allResources: any[] = []
            let nextCursor: string | undefined = undefined

            // Fetch all resources (handle pagination)
            do {
                const result = await cloudinary.api.resources({
                    type: 'upload',
                    prefix: folderPath,
                    max_results: 500,
                    next_cursor: nextCursor,
                    resource_type: 'image'
                })

                allResources.push(...result.resources)
                nextCursor = result.next_cursor

                // Stop if we already have more than 200
                if (allResources.length > 200) {
                    break
                }
            } while (nextCursor)

            // Limit to 200 images
            if (allResources.length > 200) {
                return res.status(400).json({
                    error: 'Too many images in folder',
                    message: `Folder contains ${allResources.length} images. Maximum allowed is 200 images.`
                })
            }

            if (allResources.length === 0) {
                return res.status(404).json({
                    error: 'No images found',
                    message: `No images found in folder: ${folderPath}`
                })
            }

            const { prisma } = await import('../utils/database.js')

            // Process each image
            const results = await Promise.allSettled(
                allResources.map(async (resource) => {
                    // Check duplicate by publicId (faster than checksum)
                    const existing = await prisma.image.findFirst({
                        where: {
                            projectId,
                            publicId: resource.public_id
                        }
                    })

                    if (existing) {
                        return {
                            status: 'duplicate' as const,
                            filename: resource.public_id,
                            existingId: existing.id,
                            existingUrl: existing.storageUrl
                        }
                    }

                    // Save to DB (image already in Cloudinary, no need to upload)
                    const image = await prisma.image.create({
                        data: {
                            projectId,
                            originalFilename: resource.public_id.split('/').pop() || resource.public_id,
                            storageUrl: resource.secure_url,
                            publicId: resource.public_id,
                            width: resource.width,
                            height: resource.height,
                            format: resource.format,
                            fileSizeBytes: BigInt(resource.bytes),
                            uploadedBy: user.id || user.sub,
                            channels: 3
                        }
                    })

                    return {
                        status: 'success' as const,
                        image
                    }
                })
            )

            // Aggregate results
            const successful: any[] = []
            const duplicates: any[] = []
            const failed: any[] = []

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    if (result.value.status === 'success') {
                        successful.push(result.value.image)
                    } else if (result.value.status === 'duplicate') {
                        duplicates.push({
                            filename: result.value.filename,
                            existingId: result.value.existingId,
                            existingUrl: result.value.existingUrl
                        })
                    }
                } else {
                    failed.push({
                        filename: allResources[index].public_id,
                        error: result.reason?.message || 'Unknown error'
                    })
                }
            })

            logger.info('API', `Cloud import completed for project ${projectId}`, {
                success: successful.length,
                duplicates: duplicates.length,
                failed: failed.length
            })

            return res.status(200).json({
                source,
                folderPath,
                totalFound: allResources.length,
                success: successful.length,
                duplicates: duplicates.length,
                failed: failed.length,
                images: successful.map(img => ({
                    ...img,
                    fileSizeBytes: img.fileSizeBytes?.toString()
                })),
                duplicateFiles: duplicates,
                errors: failed
            })

        } catch (error) {
            logger.error('API', 'Import from cloud failed', { error })
            return res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    /**
     * POST /api/v1/projects/:id/tasks/:taskId/assign-reviewer
     * Manually assign a reviewer to a SUBMITTED task
     */
    static async assignReviewer(req: Request, res: Response) {
        try {
            const { id, taskId } = req.params as { id: string; taskId: string }
            const { reviewerId, deadline, force } = req.body
            const user = (req as any).user
            const userId = user.sub || user.id

            if (!reviewerId) {
                return res.status(400).json({ error: 'reviewerId is required' })
            }

            const { prisma } = await import('../utils/database.js')
            const { AssignmentMethod, AssignmentStatus, ProjectRole } = await import('@prisma/client')

            // Verify task belongs to project
            const task = await prisma.task.findFirst({
                where: { id: taskId, projectId: id },
                include: {
                    image: { select: { originalFilename: true } }
                }
            })

            if (!task) {
                return res.status(404).json({ error: 'Task not found in this project' })
            }

            // Find the SUBMITTED assignment for this task
            const submittedAssignment = await prisma.taskAssignment.findFirst({
                where: {
                    taskId,
                    status: AssignmentStatus.SUBMITTED
                },
                select: { id: true, annotatorId: true, reviewerId: true }
            })

            if (!submittedAssignment) {
                return res.status(400).json({ error: 'Task does not have a SUBMITTED assignment. Only SUBMITTED tasks can be assigned to a reviewer.' })
            }

            // Conflict of Interest: reviewer cannot be the annotator
            if (submittedAssignment.annotatorId === reviewerId) {
                return res.status(400).json({ error: 'Conflict of Interest: Reviewer cannot be the same person who annotated this task.' })
            }

            // Check if reviewer is already assigned
            if (submittedAssignment.reviewerId) {
                return res.status(409).json({ error: 'This task already has a reviewer assigned. Unassign the current reviewer first or use force: true to override.' })
            }

            // Verify reviewer is a member of this project with REVIEWER role
            const member = await prisma.projectMember.findFirst({
                where: {
                    projectId: id,
                    userId: reviewerId,
                    projectRole: ProjectRole.REVIEWER
                }
            })

            if (!member) {
                return res.status(400).json({ error: 'User is not a reviewer in this project' })
            }

            // Check workload limit (soft block — Manager can override with force: true)
            if (!force) {
                const assignmentRule = await prisma.assignmentRule.findUnique({
                    where: { projectId: id }
                })
                if (assignmentRule) {
                    const { TaskService } = await import('../services/task.service.js')
                    const currentTasks = await TaskService.getActiveTaskCount(reviewerId, 'REVIEWER')
                    const maxTasks = assignmentRule.maxTasksPerReviewer
                    if (currentTasks >= maxTasks) {
                        logger.warn('API', `Manual reviewer assign blocked: reviewer ${reviewerId} workload limit reached`, {
                            projectId: id, currentTasks, maxTasks
                        })
                        return res.status(400).json({
                            error: 'Workload limit exceeded',
                            currentTasks,
                            maxTasks,
                            message: `Reviewer has reached the maximum task limit (${currentTasks}/${maxTasks}). Send force: true to override.`
                        })
                    }
                }
            }

            // Calculate deadline
            const { TaskService } = await import('../services/task.service.js')
            const reviewDeadline = deadline
                ? new Date(deadline)
                : TaskService.calculateDeadline(task.difficultyLevel, 'REVIEWER')

            // Update the assignment: set reviewerId and deadline
            await prisma.taskAssignment.update({
                where: { id: submittedAssignment.id },
                data: {
                    reviewerId,
                    deadline: reviewDeadline,
                    assignedBy: userId,
                    assignmentMethod: AssignmentMethod.MANUAL
                }
            })

            // Fetch the updated assignment to return
            const updatedAssignment = await prisma.taskAssignment.findUnique({
                where: { id: submittedAssignment.id },
                include: {
                    annotator: {
                        select: { id: true, fullName: true, email: true, avatarUrl: true }
                    },
                    reviewer: {
                        select: { id: true, fullName: true, email: true, avatarUrl: true }
                    },
                    task: {
                        include: {
                            image: {
                                select: { id: true, storageUrl: true, originalFilename: true }
                            }
                        }
                    }
                }
            })

            logger.info('API', `Reviewer ${reviewerId} manually assigned to task ${taskId}`, {
                actorId: userId, projectId: id, assignmentId: submittedAssignment.id
            })

            // Log activity
            try {
                const { TaskActivityService } = await import('../services/task-activity.service.js')
                const { TaskAction } = await import('@prisma/client')

                const reviewer = await prisma.user.findUnique({
                    where: { id: reviewerId },
                    select: { fullName: true, email: true }
                })

                await TaskActivityService.logActivity({
                    taskId,
                    projectId: id,
                    userId,
                    action: TaskAction.ASSIGNED,
                    metadata: {
                        targetUserId: reviewerId,
                        targetUserName: reviewer?.fullName || reviewer?.email || 'Unknown',
                        targetRole: 'REVIEWER',
                        deadline: reviewDeadline.toISOString(),
                        method: 'MANUAL'
                    }
                })
            } catch (activityError) {
                logger.error('API', 'Failed to log reviewer assignment activity', { error: activityError })
            }

            // Send notification to reviewer
            try {
                const { NotificationType } = await import('@prisma/client')
                const { NotificationTemplateService } = await import('../services/notification.template.service.js')
                const { NotificationService } = await import('../services/notification.service.js')
                const { broadcastService } = await import('../websocket/events/broadcast.service.js')
                const { SystemEventType } = await import('../websocket/events/types.js')

                const project = await prisma.project.findUnique({
                    where: { id },
                    select: { id: true, name: true }
                })

                if (project) {
                    const rendered = await NotificationTemplateService.render(
                        NotificationType.TASK_ASSIGNED,
                        {
                            taskId: task.id,
                            taskName: task.image?.originalFilename || 'Untitled Task',
                            projectId: project.id,
                            projectName: project.name
                        }
                    )

                    if (rendered) {
                        const notification = await NotificationService.createNotification({
                            userId: reviewerId,
                            type: NotificationType.TASK_ASSIGNED,
                            title: rendered.title,
                            message: rendered.message,
                            metadata: {
                                taskId: task.id,
                                projectId: project.id,
                                projectName: project.name,
                                role: 'REVIEWER'
                            }
                        })

                        broadcastService.broadcastToUser(reviewerId, SystemEventType.NOTIFICATION_CREATED, {
                            notification: {
                                id: notification.id,
                                type: notification.type,
                                title: notification.title,
                                message: notification.message,
                                metadata: notification.metadata,
                                isRead: notification.isRead,
                                createdAt: notification.createdAt
                            }
                        })
                    }
                }
            } catch (notifError) {
                logger.error('API', 'Failed to send reviewer assignment notification', { error: notifError })
            }

            return res.json({
                message: 'Reviewer assigned successfully',
                assignment: updatedAssignment
            })
        } catch (error) {
            logger.error('API', 'Assign reviewer failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * POST /api/v1/projects/:id/tasks/bulk-assign-reviewer
     * Bulk assign a reviewer to multiple SUBMITTED tasks
     */
    static async bulkAssignReviewer(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const { taskIds, reviewerId, deadline, force } = req.body
            const user = (req as any).user
            const userId = user.sub || user.id

            if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
                return res.status(400).json({ error: 'taskIds array is required' })
            }

            if (!reviewerId) {
                return res.status(400).json({ error: 'reviewerId is required' })
            }

            const { prisma } = await import('../utils/database.js')
            const { AssignmentMethod, AssignmentStatus, ProjectRole } = await import('@prisma/client')

            // Verify reviewer is a REVIEWER member of this project
            const member = await prisma.projectMember.findFirst({
                where: {
                    projectId: id,
                    userId: reviewerId,
                    projectRole: ProjectRole.REVIEWER
                },
                include: {
                    user: { select: { id: true, fullName: true, email: true } }
                }
            })

            if (!member) {
                return res.status(400).json({ error: 'User is not a reviewer in this project' })
            }

            // Find all SUBMITTED assignments for these tasks that have no reviewer
            const assignments = await prisma.taskAssignment.findMany({
                where: {
                    task: { projectId: id },
                    taskId: { in: taskIds },
                    status: AssignmentStatus.SUBMITTED,
                    reviewerId: null
                },
                include: {
                    task: {
                        include: { image: { select: { originalFilename: true } } }
                    }
                }
            })

            if (assignments.length === 0) {
                return res.status(400).json({ error: 'No eligible SUBMITTED tasks without reviewer found for the given task IDs.' })
            }

            // Conflict of Interest check: filter out tasks where reviewer is the annotator
            const eligible = assignments.filter(a => a.annotatorId !== reviewerId)
            const conflicted = assignments.filter(a => a.annotatorId === reviewerId)

            if (eligible.length === 0) {
                return res.status(400).json({
                    error: 'All matching tasks have Conflict of Interest (reviewer is the annotator).',
                    conflictedTaskIds: conflicted.map(a => a.taskId)
                })
            }

            // Check workload limit
            if (!force) {
                const assignmentRule = await prisma.assignmentRule.findUnique({
                    where: { projectId: id }
                })
                if (assignmentRule) {
                    const { TaskService } = await import('../services/task.service.js')
                    const currentTasks = await TaskService.getActiveTaskCount(reviewerId, 'REVIEWER')
                    const maxTasks = assignmentRule.maxTasksPerReviewer
                    if (currentTasks + eligible.length > maxTasks) {
                        const remainingSlots = Math.max(0, maxTasks - currentTasks)
                        return res.status(400).json({
                            error: 'Workload limit exceeded',
                            currentTasks,
                            maxTasks,
                            requestedTasks: eligible.length,
                            remainingSlots,
                            message: `Reviewer has ${currentTasks}/${maxTasks} active tasks. Cannot assign ${eligible.length} more (only ${remainingSlots} slots available). Send force: true to override.`
                        })
                    }
                }
            }

            // Calculate deadline
            const { TaskService } = await import('../services/task.service.js')
            const reviewDeadline = deadline ? new Date(deadline) : null

            // Update all eligible assignments in a transaction
            await prisma.$transaction(
                eligible.map(a => {
                    const taskDeadline = reviewDeadline ||
                        TaskService.calculateDeadline(a.task.difficultyLevel, 'REVIEWER')
                    return prisma.taskAssignment.update({
                        where: { id: a.id },
                        data: {
                            reviewerId,
                            deadline: taskDeadline,
                            assignedBy: userId,
                            assignmentMethod: AssignmentMethod.MANUAL
                        }
                    })
                })
            )

            logger.info('API', `Bulk assigned reviewer ${reviewerId} to ${eligible.length} tasks`, {
                actorId: userId, projectId: id
            })

            // Log bulk activity
            try {
                const { TaskActivityService } = await import('../services/task-activity.service.js')
                const { TaskAction } = await import('@prisma/client')

                const taskNames = eligible.map(a =>
                    a.task.image?.originalFilename || `Task #${a.taskId.substring(0, 6)}`
                )

                await TaskActivityService.logBulkActivity({
                    taskIds: eligible.map(a => a.taskId),
                    projectId: id,
                    userId,
                    action: TaskAction.BULK_ASSIGNED,
                    metadata: {
                        count: eligible.length,
                        targetUserId: reviewerId,
                        targetUserName: member.user.fullName || member.user.email,
                        targetRole: 'REVIEWER',
                        taskNames
                    }
                })
            } catch (activityError) {
                logger.error('API', 'Failed to log bulk reviewer assign activity', { error: activityError })
            }

            return res.json({
                message: `Successfully assigned reviewer to ${eligible.length} tasks`,
                assigned: eligible.length,
                skippedConflict: conflicted.length,
                conflictedTaskIds: conflicted.map(a => a.taskId)
            })
        } catch (error) {
            logger.error('API', 'Bulk assign reviewer failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }
}
