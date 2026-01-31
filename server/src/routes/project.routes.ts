import { Router } from 'express'
import { ProjectController } from '../controllers/project.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// GET: Anyone logged in can likely see projects (or we might restrict to members later)
// For now, keeping it open to Authenticated Users
router.get('/', ProjectController.getAll)
router.get('/:id', ProjectController.getById)

// CUD: Only Manager/Admin
router.post(
    '/',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.create
)

router.put(
    '/:id',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.update
)

router.delete(
    '/:id',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.delete
)

// Member Management
router.get(
    '/:id/potential-members',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.getPotentialMembers
)

router.post(
    '/:id/members',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.addMember
)

router.delete(
    '/:id/members/:userId',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.removeMember
)

router.patch(
    '/:id/members/:userId',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.updateMemberRole
)

export default router

