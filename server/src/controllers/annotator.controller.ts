import { Request, Response } from 'express'
import { z } from 'zod'
import { AnnotatorService } from '../services/annotator.service.js'
import { AssignmentStatus } from '@prisma/client'
import logger from '../utils/logger.js'

// Validation Schema
const updateAssignmentSchema = z.object({
  status: z.nativeEnum(AssignmentStatus).optional(),
  annotations: z.any().optional(),
  annotatorNote: z.string().max(1000).optional(),
  actualTimeSeconds: z.number().int().nonnegative().optional(),
})

const saveDraftSchema = z.object({
  annotations: z.any().optional(),
  annotatorNote: z.string().max(1000).optional(),
  actualTimeSeconds: z.number().int().nonnegative().optional(),
})

export class AnnotatorController {
  /**
   * GET /api/v1/annotator/projects
   * Get all projects where user is a member as Annotator
   */
  static async getMyProjects(req: Request, res: Response) {
    try {
      const userId = (req as any).user.sub || (req as any).user.id
      const projects = await AnnotatorService.getMyProjects(userId)
      return res.json(projects)
    } catch (error) {
      logger.error('API', 'Get annotator projects failed', { error })
      return res.status(500).json({ error: 'Failed to fetch projects' })
    }
  }

  /**
   * GET /api/v1/annotator/tasks
   * Get task assignments for current user with filters
   */
  static async getMyTasks(req: Request, res: Response) {
    try {
      const userId = (req as any).user.sub || (req as any).user.id
      const projectId = req.query.projectId as string | undefined
      const statusParam = req.query.status as string | undefined
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20

      // Only pass status if it's valid
      const status = statusParam ? (statusParam as AssignmentStatus) : undefined

      const result = await AnnotatorService.getMyTasks(userId, {
        ...(projectId && { projectId }),
        ...(status && { status }),
        page,
        limit,
      })

      return res.json(result)
    } catch (error) {
      logger.error('API', 'Get annotator tasks failed', { error })
      return res.status(500).json({ error: 'Failed to fetch tasks' })
    }
  }

  /**
   * GET /api/v1/annotator/tasks/:assignmentId
   * Get single task assignment with full details
   */
  static async getTaskAssignment(req: Request, res: Response) {
    try {
      const userId = (req as any).user.sub || (req as any).user.id
      const assignmentId = req.params.assignmentId as string

      if (!assignmentId) {
        return res.status(400).json({ error: 'Assignment ID is required' })
      }

      const assignment = await AnnotatorService.getTaskAssignment(
        assignmentId,
        userId,
      )
      return res.json(assignment)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('not found') || message.includes('access denied')) {
        return res.status(404).json({ error: 'Task assignment not found' })
      }
      logger.error('API', 'Get task assignment failed', { error })
      return res.status(500).json({ error: 'Failed to fetch task assignment' })
    }
  }

  /**
   * PATCH /api/v1/annotator/tasks/:assignmentId
   * Update task assignment (submit, add note, mark in progress)
   */
  static async updateTaskAssignment(req: Request, res: Response) {
    try {
      const userId = (req as any).user.sub || (req as any).user.id
      const assignmentId = req.params.assignmentId as string

      if (!assignmentId) {
        return res.status(400).json({ error: 'Assignment ID is required' })
      }

      const validatedData = updateAssignmentSchema.parse(req.body)

      // Build update object with only defined values
      const updateData: {
        status?: AssignmentStatus
        annotations?: any
        annotatorNote?: string
        actualTimeSeconds?: number
      } = {}

      if (validatedData.status !== undefined) {
        updateData.status = validatedData.status
      }
      if (validatedData.annotations !== undefined) {
        updateData.annotations = validatedData.annotations
      }
      if (validatedData.annotatorNote !== undefined) {
        updateData.annotatorNote = validatedData.annotatorNote
      }
      if (validatedData.actualTimeSeconds !== undefined) {
        updateData.actualTimeSeconds = validatedData.actualTimeSeconds
      }

      const updated = await AnnotatorService.updateTaskAssignment(
        assignmentId,
        userId,
        updateData,
      )

      logger.info('API', `Task assignment updated: ${assignmentId}`, { userId })
      return res.json(updated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: 'Validation failed', details: error.issues })
      }

      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('not found') || message.includes('access denied')) {
        return res.status(404).json({ error: 'Task assignment not found' })
      }
      if (message.includes('Invalid status transition')) {
        return res.status(400).json({ error: message })
      }

      logger.error('API', 'Update task assignment failed', { error })
      return res.status(500).json({ error: 'Failed to update task assignment' })
    }
  }

  /**
   * PUT /api/v1/annotator/tasks/:assignmentId/draft
   * Save draft annotations without transitioning to SUBMITTED
   */
  static async saveDraft(req: Request, res: Response) {
    try {
      const userId = (req as any).user.sub || (req as any).user.id
      const assignmentId = req.params.assignmentId as string

      if (!assignmentId) {
        return res.status(400).json({ error: 'Assignment ID is required' })
      }

      const validatedData = saveDraftSchema.parse(req.body)

      const draftData: {
        annotations?: any
        annotatorNote?: string
        actualTimeSeconds?: number
      } = {}

      if (validatedData.annotations !== undefined) {
        draftData.annotations = validatedData.annotations
      }
      if (validatedData.annotatorNote !== undefined) {
        draftData.annotatorNote = validatedData.annotatorNote
      }
      if (validatedData.actualTimeSeconds !== undefined) {
        draftData.actualTimeSeconds = validatedData.actualTimeSeconds
      }

      const updated = await AnnotatorService.saveDraft(
        assignmentId,
        userId,
        draftData,
      )

      logger.info('API', `Task draft saved: ${assignmentId}`, { userId })
      return res.json(updated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('API', 'Save task draft validation failed', {
          issues: error.issues,
          body: req.body,
        })
        return res
          .status(400)
          .json({ error: 'Validation failed', details: error.issues })
      }

      const message = error instanceof Error ? error.message : 'Unknown error'
      if (message.includes('not found') || message.includes('access denied')) {
        return res.status(404).json({ error: 'Task assignment not found' })
      }
      if (message.includes('Cannot save draft when task is')) {
        logger.warn('API', 'Save task draft rejected: invalid status', {
          message,
        })
        return res.status(400).json({ error: message })
      }

      logger.error('API', 'Save task draft failed', { error })
      return res.status(500).json({ error: 'Failed to save task draft' })
    }
  }
}
