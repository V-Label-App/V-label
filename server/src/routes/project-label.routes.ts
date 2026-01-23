import { Router } from 'express';
import { ProjectLabelController, LabelRequestController } from '../controllers/label.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router({ mergeParams: true }); // mergeParams to access :projectId from parent

// All routes require authentication
router.use(authMiddleware);

// =========================================================
// PROJECT LABELS
// =========================================================

// Get labels for a project (all authenticated users)
router.get('/', ProjectLabelController.getProjectLabels);

// Get available labels for assignment (all authenticated users)
router.get('/available', ProjectLabelController.getAvailableLabels);

// Assign label(s) to project (Admin/Manager only)
router.post('/', requireRole(['ADMIN', 'MANAGER']), ProjectLabelController.assignLabel);

// Update project labels (replace all) (Admin/Manager only)
router.put('/', requireRole(['ADMIN', 'MANAGER']), ProjectLabelController.updateProjectLabels);

// Remove label from project (Admin/Manager only)
router.delete('/:labelId', requireRole(['ADMIN', 'MANAGER']), ProjectLabelController.removeLabel);

// =========================================================
// LABEL REQUESTS
// =========================================================

// Get label requests for a project (Admin/Manager only)
router.get('/requests', requireRole(['ADMIN', 'MANAGER']), LabelRequestController.getProjectRequests);

// Get pending requests count (Admin/Manager only)
router.get('/requests/pending-count', requireRole(['ADMIN', 'MANAGER']), LabelRequestController.getPendingCount);

// Create a label request (Annotator only)
router.post('/requests', requireRole(['ANNOTATOR', 'REVIEWER']), LabelRequestController.createRequest);

// Approve a label request (Admin/Manager only)
router.put('/requests/:requestId/approve', requireRole(['ADMIN', 'MANAGER']), LabelRequestController.approveRequest);

// Reject a label request (Admin/Manager only)
router.put('/requests/:requestId/reject', requireRole(['ADMIN', 'MANAGER']), LabelRequestController.rejectRequest);

export default router;
