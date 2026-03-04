import { Router } from 'express'
import { ProjectController } from '../controllers/project.controller.js'
import { DatasetController } from '../controllers/dataset.controller.js'
import { authMiddleware } from '../middlewares/auth.middleware.js'
import { requireRole } from '../middlewares/role.middleware.js'
import { uploadMiddleware, uploadZip } from '../middlewares/upload.middleware.js'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// Project Health Routes (Must be before general getById to avoid collision if ever needed, though here paths are distinct)
router.get('/:id/health', authMiddleware, requireRole(['MANAGER', 'ADMIN']), ProjectController.getHealthStats)
router.get('/:id/rescue', authMiddleware, requireRole(['MANAGER', 'ADMIN']), ProjectController.getRescueTasks)

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

// Batch Upload Images to Project
router.post(
    '/:id/images/batch',
    requireRole(['ADMIN', 'MANAGER']),
    uploadMiddleware.array('images'),
    ProjectController.uploadImagesBatch
)

// Import Images from ZIP (max 200 images)
router.post(
    '/:id/images/import-zip',
    requireRole(['ADMIN', 'MANAGER']),
    uploadZip.single('zipFile'),
    ProjectController.importFromZip
)

// Import Images from Cloud Storage (max 200 images)
router.post(
    '/:id/images/import-cloud',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.importFromCloud
)

router.get(
    '/:id/images',
    ProjectController.getImages
)

router.post(
    '/:id/images/check-assignments',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.checkImageAssignments
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

// Task Management
router.get( // Get Tasks
    '/:id/tasks',
    ProjectController.getTasks
)

router.post( // Manually Assign Task
    '/:id/tasks/:taskId/assign',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.assignTask
)

router.delete( // Unassign Task
    '/:id/tasks/:taskId/unassign',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.unassignTask
)

router.post( // Bulk Assign Tasks
    '/:id/tasks/bulk-assign',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.bulkAssignTasks
)

router.post( // Bulk Unassign Tasks
    '/:id/tasks/bulk-unassign',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.bulkUnassignTasks
)

router.patch( // Update Task Deadline
    '/:id/tasks/:taskId/deadline',
    requireRole(['ADMIN', 'MANAGER']),
    ProjectController.updateTaskDeadline
)

router.get( // Get User Workloads
    '/:id/workloads',
    ProjectController.getWorkloads
)

export default router
