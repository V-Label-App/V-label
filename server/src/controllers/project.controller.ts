import { Request, Response } from 'express'
import { z, ZodError } from 'zod'
import { ProjectService } from '../services/project.service.js'
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

const updateProjectSchema = createProjectSchema.partial().extend({
    status: z.nativeEnum(ProjectStatus).optional(),
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
     */
    static async getAll(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1
            const limit = parseInt(req.query.limit as string) || 10
            const search = req.query.search as string | undefined
            const categoryId = req.query.categoryId as string | undefined
            const status = req.query.status as ProjectStatus | undefined

            const result = await ProjectService.getAll({
                page,
                limit,
                ...(search !== undefined && { search }),
                ...(categoryId !== undefined && { categoryId }),
                ...(status !== undefined && { status }),
            })

            return res.json(result)
        } catch (error) {
            logger.error('API', 'Get all projects failed', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * GET /api/v1/projects/:id
     */
    static async getById(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const project = await ProjectService.getById(id)

            if (!project) {
                return res.status(404).json({ error: 'Project not found' })
            }

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
            })

            logger.info('API', `Project updated: ${id}`, { actorId: (req as any).user?.sub || (req as any).user?.id })
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

            await ProjectService.delete(id)

            logger.info('API', `Project soft-deleted: ${id}`, { actorId: (req as any).user?.sub || (req as any).user?.id })
            return res.json({ message: 'Project archived successfully' })
        } catch (error) {
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
}
