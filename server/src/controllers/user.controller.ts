import { Request, Response } from 'express'
import { prisma } from '../utils/database.js'
import logger from '../utils/logger.js'
import { hashPassword } from '../utils/password.utils.js'
export class UserController {
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
          phoneNumber: true
        }
      })
      logger.info('USER', 'User profile:', JSON.stringify({ userId, user }, null, 2))
      

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
          phoneNumber
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
          phoneNumber: true
        }
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
          phoneNumber: true
        },
        orderBy: { createdAt: 'desc' }
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
      const { email, password, fullName, role } = req.body

      if (!email || !password || !fullName) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' })
      }

      const hashedPassword = await hashPassword(password)

      const newUser = await prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          fullName,
          role: role || 'ANNOTATOR',
          isActive: true
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      })

      logger.info('USER', `Admin created user: ${newUser.email}`)
      return res.status(201).json(newUser)
    } catch (error) {
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
      const { fullName, role, isActive, phoneNumber } = req.body

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          fullName,
          role,
          isActive,
          phoneNumber
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      })

      logger.info('USER', `Admin updated user: ${id}`)
      return res.json(updatedUser)
    } catch (error) {
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
          phoneNumber: true
        }
      })

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      return res.json(user)
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
        where: { id }
      })

      logger.info('USER', `Admin deleted user: ${id}`)
      return res.json({ message: 'User deleted successfully' })
    } catch (error) {
      console.error('Delete user error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}
