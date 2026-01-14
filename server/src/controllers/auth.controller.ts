import { Request, Response } from 'express'
import { AuthService } from '../services/auth.service.js'
import { z } from 'zod'
import { UserRole } from '@prisma/client'

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const devLoginSchema = z.object({
  role: z.nativeEnum(UserRole),
})

export class AuthController {
  /**
   * POST /api/v1/auth/login
   * Standard email/password login
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body)

      const result = await AuthService.login(email, password)

      if (!result) {
        return res.status(401).json({
          error: 'Invalid email or password',
        })
      }

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })

      return res.status(200).json({
        accessToken: result.accessToken,
        user: result.user,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        })
      }

      console.error('[AUTH] Login error:', error)
      return res.status(500).json({
        error: 'Internal server error',
      })
    }
  }

  /**
   * POST /api/v1/auth/dev/login
   * Developer bypass login (dev only)
   */
  static async devLogin(req: Request, res: Response) {
    try {
      // Block in production
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          error: 'Dev endpoints are disabled in production',
        })
      }

      const { role } = devLoginSchema.parse(req.body)

      const result = await AuthService.devLogin(role)

      if (!result) {
        return res.status(404).json({
          error: `No ${role} user found. Run 'npm run db:seed' first.`,
        })
      }

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })

      return res.status(200).json({
        accessToken: result.accessToken,
        user: result.user,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        })
      }

      console.error('[AUTH] Dev login error:', error)
      return res.status(500).json({
        error: 'Internal server error',
      })
    }
  }
}
