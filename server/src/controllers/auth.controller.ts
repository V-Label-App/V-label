import { Request, Response } from 'express'
import { AuthService } from '../services/auth.service.js'
import { z } from 'zod'
import { UserRole } from '@prisma/client'

// Validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
})

const devLoginSchema = z.object({
  role: z.nativeEnum(UserRole),
})

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(3, 'Password must be at least 3 characters'),
  fullName: z.string().optional(),
})


export class AuthController {
  /**
   * @swagger
   * /api/v1/auth/login:
   *   post:
   *     summary: User login with email and password
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LoginResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         description: Invalid credentials
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Invalid email or password"
   *       403:
   *         description: Account is disabled
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Your account is inactive. Please contact administrator."
   *       500:
   *         $ref: '#/components/responses/ServerError'
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
          details: (error as any).errors,
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
   * @swagger
   * /api/v1/auth/register:
   *   post:
   *     summary: Register a new user account
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterRequest'
   *     responses:
   *       201:
   *         description: Registration successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LoginResponse'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       409:
   *         description: Email already exists
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Email already exists"
   *       500:
   *         $ref: '#/components/responses/ServerError'
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
        return res.status(400).json({
          error: 'Validation failed',
          details: (error as any).errors,
        })
      }

      console.error('[AUTH] Registration error:', error)
      return res.status(500).json({
        error: 'Internal server error',
      })
    }
  }

  /**
   * @swagger
   * /api/v1/auth/google:
   *   post:
   *     summary: Login with Google ID Token
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - idToken
   *             properties:
   *               idToken:
   *                 type: string
   *                 description: Google ID Token from OAuth flow
   *                 example: "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
   *     responses:
   *       200:
   *         description: Google login successful
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LoginResponse'
   *       400:
   *         description: Missing ID token
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Missing idToken"
   *       401:
   *         description: Invalid Google token
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Invalid token"
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
   * @swagger
   * /api/v1/auth/forgot-password:
   *   post:
   *     summary: Request password reset email
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ForgotPasswordRequest'
   *     responses:
   *       200:
   *         description: Password reset email sent
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Password reset email sent"
   *       400:
   *         description: Email is required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
      }

      const { PasswordResetService } = await import('../services/password-reset.service.js');
      const service = new PasswordResetService();
      const result = await service.requestPasswordReset(email);

      return res.status(200).json(result);
    } catch (error: any) {
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
   * @swagger
   * /api/v1/auth/reset-password:
   *   post:
   *     summary: Reset password using token from email
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ResetPasswordRequest'
   *     responses:
   *       200:
   *         description: Password reset successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: "Password reset successful"
   *       400:
   *         description: Invalid token or password
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   */
  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
      }

      if (newPassword.length < 3) {
        return res.status(400).json({ error: 'Password must be at least 3 characters long' });
      }

      const { PasswordResetService } = await import('../services/password-reset.service.js');
      const service = new PasswordResetService();
      const result = await service.resetPassword(token, newPassword);

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[AUTH] Reset password error:', error);
      return res.status(400).json({ error: error.message || 'Failed to reset password' });
    }
  }
}
