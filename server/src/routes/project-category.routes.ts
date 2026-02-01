import { Router } from 'express'
import { ProjectCategoryController } from '../controllers/project-category.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'

const router = Router()

// Public or Authenticated? 
// Requirements said "Required for ID category", usually authenticated users need this list to create projects.
// Public users might not need it, but let's stick to authenticated for safety.
router.get('/', authMiddleware, ProjectCategoryController.getAll)

// Admin / Manager only
router.post(
    '/',
    authMiddleware,
    requireRole(['ADMIN', 'MANAGER']),
    ProjectCategoryController.create
)

router.put(
    '/:id',
    authMiddleware,
    requireRole(['ADMIN', 'MANAGER']),
    ProjectCategoryController.update
)

router.delete(
    '/:id',
    authMiddleware,
    requireRole(['ADMIN', 'MANAGER']),
    ProjectCategoryController.delete
)

export default router
