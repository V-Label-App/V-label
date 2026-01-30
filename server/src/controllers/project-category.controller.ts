import { Request, Response } from 'express'
import { z } from 'zod'
import { ProjectCategoryService } from '../services/project-category.service.js'
import logger from '../utils/logger.js'

// Validation Schemas
const createCategorySchema = z.object({
    name: z.string().min(1, 'Category name is required').max(100),
    description: z.string().optional(),
})

const updateCategorySchema = createCategorySchema.partial()

export class ProjectCategoryController {
    /**
     * GET /api/v1/project-categories
     */
    static async getAll(req: Request, res: Response) {
        try {
            const categories = await ProjectCategoryService.getAll()
            return res.json(categories)
        } catch (error) {
            logger.error('API', 'Failed to get categories', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * POST /api/v1/project-categories
     */
    static async create(req: Request, res: Response) {
        try {
            const validatedData = createCategorySchema.parse(req.body)

            const category = await ProjectCategoryService.create({
                name: validatedData.name,
                // STRICT FIX: Only pass if defined
                ...(validatedData.description !== undefined && { description: validatedData.description })
            })

            logger.info('API', `Category created: ${category.name}`, {
                actorId: (req as any).user?.id
            })

            return res.status(201).json(category)
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: (error as any).errors,
                })
            }

            const message = error instanceof Error ? error.message : 'Unknown error'
            if (message.includes('already exists')) {
                return res.status(409).json({ error: message })
            }

            logger.error('API', 'Failed to create category', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * PUT /api/v1/project-categories/:id
     */
    static async update(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }
            const validatedData = updateCategorySchema.parse(req.body)

            const category = await ProjectCategoryService.update(id, {
                ...(validatedData.name !== undefined && { name: validatedData.name }),
                ...(validatedData.description !== undefined && { description: validatedData.description }),
            })

            logger.info('API', `Category updated: ${id}`, {
                actorId: (req as any).user?.id
            })

            return res.json(category)
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    error: 'Validation failed',
                    details: (error as any).errors,
                })
            }

            const message = error instanceof Error ? error.message : 'Unknown error'
            if (message.includes('already exists')) {
                return res.status(409).json({ error: message })
            }
            if (message.includes('Record to update does not exist')) {
                return res.status(404).json({ error: 'Category not found' })
            }

            logger.error('API', 'Failed to update category', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }

    /**
     * DELETE /api/v1/project-categories/:id
     */
    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params as { id: string }

            await ProjectCategoryService.delete(id)

            logger.info('API', `Category deleted: ${id}`, {
                actorId: (req as any).user?.sub || (req as any).user?.id
            })

            return res.json({ message: 'Category deleted successfully' })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'

            if (message.includes('used by')) {
                return res.status(400).json({ error: message })
            }

            if (message.includes('Record to delete does not exist')) {
                return res.status(404).json({ error: 'Category not found' })
            }

            logger.error('API', 'Failed to delete category', { error })
            return res.status(500).json({ error: 'Internal server error' })
        }
    }
}
