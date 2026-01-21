import { Router } from 'express';
import multer from 'multer';
import {
  LabelCategoryController,
  LabelController,
  ProjectLabelController,
  LabelRequestController,
} from '../controllers/label.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  },
});

// All routes require authentication
router.use(authMiddleware);

// =========================================================
// LABEL CATEGORIES
// Admin/Manager only
// =========================================================

router.get('/categories', LabelCategoryController.getAll);
router.get('/categories/:id', LabelCategoryController.getById);
router.post('/categories', requireRole(['ADMIN', 'MANAGER']), LabelCategoryController.create);
router.put('/categories/:id', requireRole(['ADMIN', 'MANAGER']), LabelCategoryController.update);
router.delete('/categories/:id', requireRole(['ADMIN', 'MANAGER']), LabelCategoryController.delete);

// =========================================================
// LABELS
// Admin/Manager can create/update/delete
// All authenticated users can read
// =========================================================

router.get('/', LabelController.getAll);

// CSV Import/Export endpoints (must be before /:id to avoid route conflict)
router.get('/export', requireRole(['ADMIN', 'MANAGER']), LabelController.exportCSV);
router.get('/template', requireRole(['ADMIN', 'MANAGER']), LabelController.getCSVTemplate);
router.post('/import', requireRole(['ADMIN', 'MANAGER']), LabelController.importCSV);

// Excel Import/Export endpoints
router.get('/export-excel', requireRole(['ADMIN', 'MANAGER']), LabelController.exportExcel);
router.get('/template-excel', requireRole(['ADMIN', 'MANAGER']), LabelController.getExcelTemplate);
router.post('/import-excel', requireRole(['ADMIN', 'MANAGER']), upload.single('file'), LabelController.importExcel);

router.get('/:id', LabelController.getById);
router.post('/', requireRole(['ADMIN', 'MANAGER']), LabelController.create);
router.put('/:id', requireRole(['ADMIN', 'MANAGER']), LabelController.update);
router.delete('/:id', requireRole(['ADMIN', 'MANAGER']), LabelController.delete);

export default router;
