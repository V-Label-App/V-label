import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller.js'

const router = Router()

// Standard login
router.post('/login', AuthController.login)

// Developer bypass (dev only)
router.post('/dev/login', AuthController.devLogin)

// User registration
router.post('/register', AuthController.register)

export default router
