import { Request, Response } from 'express'
import { prisma } from '../utils/database.js'
import logger from '../utils/logger.js'
import { hashPassword } from '../utils/password.utils.js'
import { userCreateSchema, userUpdateSchema, formatZodError } from '../utils/validation.js'
import { z } from 'zod'
import { ImageService } from '../services/image.service.js'

export class UserController {
  /**
   * POST /api/v1/users/me/avatar
   * Upload user avatar
   */
  static async uploadAvatar(req: Request, res: Response) {
    try {
      const userPayload = req.user as any
      const userId = userPayload?.id || userPayload?.sub

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded' })
      }

      // 1. Get current user to check for existing avatar
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarPublicId: true }
      })

      // 2. Upload new avatar to Cloudinary
      const uploadResult = await ImageService.uploadImage(
        req.file.buffer,
        `v-label/avatars/${userId}` // Organized folder structure
      )

      // 3. Update User record
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          avatarUrl: uploadResult.secure_url,
          avatarPublicId: uploadResult.public_id
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          role: true
        }
      })

      // 4. Cleanup old avatar if exists (Asynchronous)
      if (currentUser?.avatarPublicId) {
        ImageService.deleteImage(currentUser.avatarPublicId).catch(err =>
          logger.error('USER', 'Failed to delete old avatar', err)
        )
      }

      logger.info('USER', `User uploaded avatar: ${userId}`)
      return res.json(updatedUser)
    } catch (error) {
      console.error('Upload avatar error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /api/v1/users/me
   * Get current user profile
   */
  static async getMe(req: Request, res: Response) {
    try {
      const userPayload = req.user as any
      const userId = userPayload?.id || userPayload?.sub

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          role: true,
          reputationScore: true,
          totalTasksDone: true,
          createdAt: true,
          isActive: true,
          phoneNumber: true,
        },
      })
      logger.info(
        'USER',
        'User profile:',
        JSON.stringify({ userId, user }, null, 2),
      )

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      return res.json(user)
    } catch (error) {
      console.error('Get profile error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * PUT /api/v1/users/me
   * Update current user profile
   */
  static async updateProfile(req: Request, res: Response) {
    try {
      const userPayload = req.user as any
      const userId = userPayload?.id || userPayload?.sub
      const { fullName, phoneNumber } = req.body

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Simple validation could be added here or via middleware

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          fullName,
          phoneNumber,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          role: true,
          reputationScore: true,
          totalTasksDone: true,
          createdAt: true,
          isActive: true,
          phoneNumber: true,
        },
      })

      logger.info('USER', `User updated profile: ${userId}`)
      return res.json(updatedUser)
    } catch (error) {
      console.error('Update profile error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /api/v1/users
   * Get all users (Admin only)
   */
  static async getAllUsers(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          role: true,
          reputationScore: true,
          totalTasksDone: true,
          createdAt: true,
          isActive: true,
          phoneNumber: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return res.json(users)
    } catch (error) {
      console.error('Get all users error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * POST /api/v1/users
   * Create new user (Admin only)
   */
  /**
   * CREATE USER
   * POST /api/v1/users
   */
  static async createUser(req: Request, res: Response) {
    try {
      const { email, password, fullName, role, phoneNumber } = userCreateSchema.parse(req.body)

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' })
      }

      const hashedPassword = await hashPassword(password)

      const newUser = await prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          fullName,
          phoneNumber: phoneNumber || null,
          role: role || 'ANNOTATOR',
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          phoneNumber: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      })

      logger.info('USER', `Admin created user: ${newUser.email}`)
      return res.status(201).json(newUser)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = formatZodError(error)
        logger.warn('USER', 'Create user validation failed', { errors: validationErrors })
        return res.status(400).json({ error: 'Validation failed', details: validationErrors })
      }

      console.error('Create user error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * UPDATE USER
   * PUT /api/v1/users/:id
   */
  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string }
      const { fullName, role, isActive, phoneNumber } = userUpdateSchema.parse(req.body)

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          ...(fullName !== undefined && { fullName }),
          ...(role !== undefined && { role }),
          ...(isActive !== undefined && { isActive }),
          ...(phoneNumber !== undefined && { phoneNumber: phoneNumber || null }),
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          phoneNumber: true,
          createdAt: true,
        },
      })

      logger.info('USER', `Admin updated user: ${id}`)
      return res.json(updatedUser)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = formatZodError(error)
        logger.warn('USER', 'Update user validation failed', { errors: validationErrors })
        return res.status(400).json({ error: 'Validation failed', details: validationErrors })
      }
      console.error('Update user error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * GET USER BY ID
   * GET /api/v1/users/:id
   */
  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string }

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
          role: true,
          reputationScore: true,
          totalTasksDone: true,
          createdAt: true,
          isActive: true,
          phoneNumber: true,
        },
      })

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      let extraStats = {}

      if (user.role === 'MANAGER') {
        const projectsManaged = await prisma.projectMember.count({
          where: {
            userId: user.id,
            projectRole: 'MANAGER',
          },
        })
        extraStats = { projectsManaged }
      } else if (user.role === 'REVIEWER') {
        const tasksReviewed = await prisma.taskAssignment.count({
          where: {
            reviewerId: user.id,
            status: { in: ['APPROVED', 'REJECTED'] },
          },
        })
        extraStats = { tasksReviewed }
      }

      return res.json({ ...user, ...extraStats })
    } catch (error) {
      console.error('Get user error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * DELETE USER
   * DELETE /api/v1/users/:id
   */
  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string }

      await prisma.user.delete({
        where: { id },
      })

      logger.info('USER', `Admin deleted user: ${id}`)
      return res.json({ message: 'User deleted successfully' })
    } catch (error) {
      console.error('Delete user error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}
