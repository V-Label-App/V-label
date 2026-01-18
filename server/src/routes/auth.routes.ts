import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller.js'

const router = Router()

// Standard login
router.post('/login', AuthController.login)

// Developer bypass (dev only)
router.post('/dev/login', AuthController.devLogin)

// User registration
router.post('/register', AuthController.register)

// Google Login
router.post('/google', AuthController.googleLogin)

// Impersonation (Admin Only)
import { authMiddleware } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'

router.post('/impersonate/:userId', authMiddleware, requireRole(['ADMIN']), AuthController.impersonate)
router.get('/logs', authMiddleware, requireRole(['ADMIN']), AuthController.getLogs)

// Password Reset
router.post('/forgot-password', AuthController.forgotPassword)
router.get('/verify-reset-token/:token', AuthController.verifyResetToken)
router.post('/reset-password', AuthController.resetPassword)

export default router
