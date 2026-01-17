import { Request, Response } from 'express'
import { prisma } from '../utils/database.js'

export class UserController {
  /**
   * GET /api/v1/users/me
   * Get current user profile
   */
  static async getMe(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id

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
          isActive: true
        }
      })

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      return res.json(user)
    } catch (error) {
      console.error('Get profile error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}
