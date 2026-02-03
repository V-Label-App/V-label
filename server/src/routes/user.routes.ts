import { Router } from 'express'
import { UserController } from '../controllers/user.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import { uploadMiddleware } from '../middlewares/upload.middleware.js'

const router = Router()

router.get('/me', authMiddleware, UserController.getMe)
router.put('/me', authMiddleware, UserController.updateProfile)
router.post('/me/avatar', authMiddleware, uploadMiddleware.single('avatar'), UserController.uploadAvatar)

// Admin Routes
router.get('/', authMiddleware, requireRole(['admin']), UserController.getAllUsers)
router.post('/', authMiddleware, requireRole(['admin']), UserController.createUser)
router.get('/:id', authMiddleware, requireRole(['admin']), UserController.getUserById)
router.put('/:id', authMiddleware, requireRole(['admin']), UserController.updateUser)
router.delete('/:id', authMiddleware, requireRole(['admin']), UserController.deleteUser)

export default router
