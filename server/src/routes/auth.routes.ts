import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller.js'

const router = Router()

// Standard login
router.post('/login', AuthController.login)

// Developer bypass (dev only)
router.post('/dev/login', AuthController.devLogin)

export default router
