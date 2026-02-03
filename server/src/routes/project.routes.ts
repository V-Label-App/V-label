import { Router } from 'express'
import { ProjectController } from '../controllers/project.controller.js'
import { DatasetController } from '../controllers/dataset.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import { uploadMiddleware } from '../middlewares/upload.middleware.js'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// GET: Anyone logged in can likely see projects (or we might restrict to members later)
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

    ProjectController.updateMemberRole // Assuming a controller method for updating member role
)


// ==========================================
// Phase 3: Dataset & Image Routes
// ==========================================

// Upload Image to Project
router.post(
    '/:id/images',
    requireRole(['ADMIN', 'MANAGER']),
    uploadMiddleware.single('image'),
    ProjectController.uploadImage
)


router.get(
    '/:id/images',
    ProjectController.getImages
)

router.delete(
    '/:id/images/batch',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.deleteImagesBatch
)

router.delete(
    '/:id/images/:imageId',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.deleteImage
)

// Datasets
router.post( // Create Dataset
    '/:id/datasets',
    requireRole(['ADMIN', 'MANAGER']),
    DatasetController.create
)

router.get( // List Datasets
    '/:id/datasets',
    DatasetController.listByProject
)

router.get( // Get Dataset Details
    '/:id/datasets/:datasetId',
    DatasetController.getById
)

router.delete( // Delete Dataset
    '/:id/datasets/:datasetId',
    requireRole(['ADMIN', 'MANAGER']),
    DatasetController.delete
)

export default router
