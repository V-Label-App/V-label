import { Request, Response } from 'express'
import { prisma } from '../utils/database.js'
import logger from '../utils/logger.js'

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
}
