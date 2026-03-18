import { Request, Response } from 'express'
import { AuthService } from '../services/auth.service.js'
import { OtpService } from '../services/otp.service.js'
import { SystemConfigService } from '../services/system.config.service.js'
import { z } from 'zod'
import { UserRole } from '@prisma/client'

import { registerSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, passwordSchema, formatZodError } from '../utils/validation.js'

// Validation schemas (Login stays simple for now, or can be upgraded too)
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'), // Login just needs requirement, complexity check is for registration/change
})

const devLoginSchema = z.object({
  role: z.nativeEnum(UserRole),
})


export class AuthController {
  /**
   * POST /api/v1/auth/login
   * Standard email/password login (with optional OTP step)
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body)

      // Check if OTP is enabled
      const otpConfig = await SystemConfigService.getOtpConfig()

      if (otpConfig.enabled) {
        // OTP enabled: validate credentials only, don't issue tokens yet
        const user = await AuthService.validateCredentials(email, password)

        if (!user) {
          return res.status(401).json({
            error: 'Invalid email or password',
          })
        }

        // Generate OTP and send via email
        const otpToken = await OtpService.generateOtp(user.id, user.email)

        return res.status(200).json({
          otpRequired: true,
          otpToken,
          message: 'OTP has been sent to your email',
        })
      }

      // OTP disabled: standard login flow
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
        otpRequired: false,
        accessToken: result.accessToken,
        user: result.user,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = formatZodError(error)
        return res.status(400).json({
          error: 'Validation failed',
          details: validationErrors,
        })
      }

      if ((error as Error).message === 'Account is disabled') {
        return res.status(403).json({
          error: 'Your account is inactive. Please contact administrator.',
        })
      }

      console.error('[AUTH] Login error:', error)
      return res.status(500).json({
        error: 'Internal server error',
      })
    }
  }

  /**
   * POST /api/v1/auth/verify-otp
   * Step 2: Verify OTP code and issue JWT tokens
   */
  static async verifyOtp(req: Request, res: Response) {
    try {
      const { otpToken, code } = req.body

      if (!otpToken || !code) {
        return res.status(400).json({
          error: 'otpToken and code are required',
        })
      }

      // Verify OTP (stateless — decodes JWT temp token and compares hash)
      const { userId } = OtpService.verifyOtp(otpToken, String(code))

      // OTP valid — generate real JWT tokens
      const user = await AuthService.getUserById(userId)
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      const { signAccessToken, signRefreshToken } = await import('../utils/jwt.utils.js')
      const payload = { sub: user.id, email: user.email, role: user.role }
      const accessToken = signAccessToken(payload)
      const refreshToken = signRefreshToken(payload)

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })

      return res.status(200).json({
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
        },
      })
    } catch (error: any) {
      console.error('[AUTH] Verify OTP error:', error)

      // OTP-specific errors
      if (error.message?.includes('OTP')) {
        return res.status(401).json({ error: error.message })
      }

      return res.status(500).json({ error: 'Internal server error' })
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
          details: (error as any).errors,
        })
      }

      console.error('[AUTH] Dev login error:', error)
      return res.status(500).json({
        error: 'Internal server error',
      })
    }
  }

  /**
   * POST /api/v1/auth/register
   * User registration with email/password
   */
  static async register(req: Request, res: Response) {
    try {
      const { email, password, fullName } = registerSchema.parse(req.body)

      const result = await AuthService.register(email, password, fullName)

      if (!result) {
        return res.status(409).json({
          error: 'Email already exists',
        })
      }

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })

      return res.status(201).json({
        accessToken: result.accessToken,
        user: result.user,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = formatZodError(error)
        return res.status(400).json({
          error: 'Validation failed',
          details: validationErrors,
        })
      }

      console.error('[AUTH] Registration error:', error)
      return res.status(500).json({
        error: 'Internal server error',
      })
    }
  }

  /**
   * POST /api/v1/auth/google
   * Login with Google ID Token
   */
  static async googleLogin(req: Request, res: Response) {
    try {
      const { idToken } = req.body

      if (!idToken) {
        return res.status(400).json({ error: 'Missing idToken' })
      }

      const result = await AuthService.loginWithGoogle(idToken)

      if (!result) {
        return res.status(401).json({ error: 'Google login failed' })
      }

      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })

      return res.status(200).json({
        accessToken: result.accessToken,
        user: result.user,
      })
    } catch (error: any) {
      console.error('[AUTH] Google login error:', error)
      return res.status(401).json({
        error: error.message || 'Invalid token',
      })
    }
  }
  /**
   * POST /api/v1/auth/impersonate/:userId
   * Admin Only: Get token for target user
   */
  static async impersonate(req: Request, res: Response) {
    try {
      const { userId } = req.params
      // req.user is populated by authenticateToken middleware
      // Token payload uses 'sub' for userId
      const user = (req as any).user
      const adminId = user?.sub || user?.id

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'Target userId is required' })
      }

      if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized - Invalid Token Payload' })
      }

      // Note: Role check is handled by middleware in routes file

      const result = await AuthService.impersonateUser(userId, adminId)

      if (!result) {
        return res.status(404).json({
          error: 'Target user not found or inactive',
        })
      }

      // We do NOT set the refresh token cookie strictly for the admin here to avoid overwriting their main session permanently (?)
      // Actually, for "Simple Assumption", we treat it as a full login.
      // So yes, we overwrite the cookie so the browser considers them fully that user.
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })

      return res.status(200).json({
        accessToken: result.accessToken,
        user: result.user,
      })
    } catch (error) {
      console.error('[AUTH] Impersonation error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /api/v1/auth/logs
   * Admin Only: Fetch audit logs
   */
  static async getLogs(req: Request, res: Response) {
    try {
      const logs = await AuthService.getSystemLogs()
      return res.status(200).json(logs)
    } catch (error) {
      console.error('[AUTH] Get logs error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * POST /api/v1/auth/change-password
   * Change password for authenticated user
   */
  static async changePassword(req: Request, res: Response) {
    try {
      const { oldPassword, newPassword } = changePasswordSchema.parse(req.body)

      const user = (req as any).user
      const userId = user?.sub || user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const result = await AuthService.changePassword(userId, oldPassword, newPassword)

      return res.status(200).json(result)
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const validationErrors = formatZodError(error)
        return res.status(400).json({ error: 'Validation failed', details: validationErrors })
      }

      if (error.message === 'Current password is incorrect') {
        return res.status(400).json({ error: error.message })
      }

      if (error.message === 'Password change is not available for Google accounts') {
        return res.status(400).json({ error: error.message })
      }

      if (error.message === 'User not found') {
        return res.status(404).json({ error: error.message })
      }

      console.error('[AUTH] Change password error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * POST /api/v1/auth/forgot-password
   * Request password reset email
   */
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);

      const { PasswordResetService } = await import('../services/password-reset.service.js');
      const service = new PasswordResetService();
      const result = await service.requestPasswordReset(email);

      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const validationErrors = formatZodError(error)
        return res.status(400).json({ error: 'Validation failed', details: validationErrors })
      }
      console.error('[AUTH] Forgot password error:', error);
      return res.status(500).json({ error: error.message || 'Failed to process request' });
    }
  }

  /**
   * GET /api/v1/auth/verify-reset-token/:token
   * Verify if password reset token is valid
   */
  static async verifyResetToken(req: Request, res: Response) {
    try {
      const rawToken = req.params.token;
      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const { PasswordResetService } = await import('../services/password-reset.service.js');
      const service = new PasswordResetService();
      const result = await service.verifyResetToken(token);

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[AUTH] Verify token error:', error);
      return res.status(500).json({ error: error.message || 'Failed to verify token' });
    }
  }

  /**
   * POST /api/v1/auth/reset-password
   * Reset password using token
   */
  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);

      const { PasswordResetService } = await import('../services/password-reset.service.js');
      const service = new PasswordResetService();
      const result = await service.resetPassword(token, newPassword);

      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const validationErrors = formatZodError(error)
        return res.status(400).json({ error: 'Validation failed', details: validationErrors })
      }
      console.error('[AUTH] Reset password error:', error);
      return res.status(400).json({ error: error.message || 'Failed to reset password' });
    }
  }
}
