import { Request, Response } from 'express';
import { LabelService, LabelCategoryService, ProjectLabelService } from '../services/label.service.js';
import { LabelRequestService } from '../services/label-request.service.js';
import { LabelRequestStatus } from '@prisma/client';
import { broadcastService } from '../websocket/events/broadcast.service.js';
import { SystemEventType } from '../websocket/events/types.js';

// =========================================================
// LABEL CATEGORY CONTROLLER
// =========================================================

export class LabelCategoryController {
  /**
   * GET /api/v1/label-categories
   */
  static async getAll(_req: Request, res: Response) {
    try {
      const categories = await LabelCategoryService.getAll();
      res.json({ success: true, data: categories });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/label-categories/:id
   */
  static async getById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const category = await LabelCategoryService.getById(id);

      if (!category) {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }

      res.json({ success: true, data: category });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/label-categories
   */
  static async create(req: Request, res: Response) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'Name is required' });
      }

      const userId = (req as any).user?.sub as string;
      const category = await LabelCategoryService.create({ name, description, createdBy: userId });

      // Broadcast to refresh label management page
      broadcastService.broadcastToAll(SystemEventType.LABEL_CREATED, {
        count: 0,
        categoryName: category.name,
        categoryCreated: true,
        triggeredBy: userId
      }, userId);

      res.status(201).json({ success: true, data: category });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ success: false, error: 'Category name already exists' });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/v1/label-categories/:id
   */
  static async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { name, description } = req.body;

      const category = await LabelCategoryService.update(id, { name, description });

      // Broadcast to refresh label management page
      const userId = (req as any).user?.sub as string;
      broadcastService.broadcastToAll(SystemEventType.LABEL_UPDATED, {
        categoryId: category.id,
        categoryName: category.name,
        triggeredBy: userId
      }, userId);

      res.json({ success: true, data: category });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/v1/label-categories/:id
   */
  static async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await LabelCategoryService.delete(id);

      // Broadcast to refresh label management page
      const userId = (req as any).user?.sub as string;
      broadcastService.broadcastToAll(SystemEventType.LABEL_DELETED, {
        categoryId: id,
        triggeredBy: userId
      }, userId);

      res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, error: 'Category not found' });
      }
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

// =========================================================
// LABEL CONTROLLER
// =========================================================

export class LabelController {
  /**
   * GET /api/v1/labels
   */
  static async getAll(req: Request, res: Response) {
    try {
      const isGlobalParam = req.query.isGlobal as string | undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const search = req.query.search as string | undefined;

      const filters: { isGlobal?: boolean; categoryId?: string; search?: string } = {};

      if (isGlobalParam === 'true') filters.isGlobal = true;
      else if (isGlobalParam === 'false') filters.isGlobal = false;

      if (categoryId) filters.categoryId = categoryId;
      if (search) filters.search = search;

      const labels = await LabelService.getAll(filters);
      res.json({ success: true, data: labels });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/labels/:id
   */
  static async getById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const label = await LabelService.getById(id);

      if (!label) {
        return res.status(404).json({ success: false, error: 'Label not found' });
      }

      res.json({ success: true, data: label });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/labels
   */
  static async create(req: Request, res: Response) {
    try {
      const { name, color, isGlobal, categoryId } = req.body;
      const userId = (req as any).user?.sub as string;

      if (!name || !color) {
        return res.status(400).json({ success: false, error: 'Name and color are required' });
      }

      const label = await LabelService.create({
        name,
        color,
        isGlobal,
        categoryId,
        createdBy: userId,
      });

      // Broadcast for other users to see updates
      // Add source metadata to help frontend avoid duplicate toasts
      broadcastService.broadcastToAll(SystemEventType.LABEL_CREATED, {
        count: 1,
        labels: [label.name],
        triggeredBy: userId,
        source: 'manual' // Indicates this is from manual UI, not AI
      }, userId);

      res.status(201).json({ success: true, data: label });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/v1/labels/:id
   */
  static async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { name, color, isGlobal, categoryId } = req.body;

      const label = await LabelService.update(id, { name, color, isGlobal, categoryId });

      // Broadcast label update event
      const userId = (req as any).user?.sub as string;
      broadcastService.broadcastToAll(SystemEventType.LABEL_UPDATED, {
        labelId: label.id,
        labelName: label.name,
        triggeredBy: userId
      }, userId);

      res.json({ success: true, data: label });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, error: 'Label not found' });
      }
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/v1/labels/:id
   */
  static async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await LabelService.delete(id);

      // Broadcast label delete event
      const userId = (req as any).user?.sub as string;
      broadcastService.broadcastToAll(SystemEventType.LABEL_DELETED, {
        labelId: id,
        triggeredBy: userId
      }, userId);

      res.json({ success: true, message: 'Label deleted successfully' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, error: 'Label not found' });
      }
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/labels/export
   * Export all labels to CSV format
   */
  static async exportCSV(_req: Request, res: Response) {
    try {
      const csv = await LabelService.exportToCSV();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="labels_export.csv"');
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/labels/template
   * Get CSV template for import
   */
  static async getCSVTemplate(_req: Request, res: Response) {
    try {
      const template = LabelService.getCSVTemplate();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="labels_template.csv"');
      res.send(template);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/labels/import
   * Import labels from CSV
   */
  static async importCSV(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.sub as string;

      // Get CSV data from request body or file
      let csvData: string;

      if (req.file) {
        // Multer file upload
        csvData = req.file.buffer.toString('utf-8');
      } else if (req.body.csv) {
        // Direct CSV string in body
        csvData = req.body.csv;
      } else {
        return res.status(400).json({
          success: false,
          error: 'CSV data is required. Send as file upload or in body.csv field',
        });
      }

      const result = await LabelService.importFromCSV(csvData, userId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/labels/export-excel
   * Export all labels to Excel format
   */
  static async exportExcel(_req: Request, res: Response) {
    try {
      const buffer = await LabelService.exportToExcel();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="labels_export.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/labels/template-excel
   * Get Excel template for import
   */
  static async getExcelTemplate(_req: Request, res: Response) {
    try {
      const buffer = LabelService.getExcelTemplate();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="labels_template.xlsx"');
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/labels/import-excel
   * Import labels from Excel file
   */
  static async importExcel(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.sub as string;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Excel file is required. Send as file upload.',
        });
      }

      const result = await LabelService.importFromExcel(req.file.buffer, userId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

// =========================================================
// PROJECT LABEL CONTROLLER
// =========================================================

export class ProjectLabelController {
  /**
   * GET /api/v1/projects/:projectId/labels
   */
  static async getProjectLabels(req: Request, res: Response) {
    try {
      const projectId = req.params.projectId as string;
      const labels = await ProjectLabelService.getProjectLabels(projectId);
      res.json({ success: true, data: labels });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/projects/:projectId/labels/available
   */
  static async getAvailableLabels(req: Request, res: Response) {
    try {
      const projectId = req.params.projectId as string;
      const labels = await LabelService.getAvailableForProject(projectId);
      res.json({ success: true, data: labels });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/projects/:projectId/labels
   */
  static async assignLabel(req: Request, res: Response) {
    try {
      const projectId = req.params.projectId as string;
      const { labelId, labelIds } = req.body;

      // Support both single and multiple assignment
      if (labelIds && Array.isArray(labelIds)) {
        const result = await ProjectLabelService.assignLabels(projectId, labelIds);
        return res.status(201).json({ success: true, data: result });
      }

      if (!labelId) {
        return res.status(400).json({ success: false, error: 'labelId or labelIds is required' });
      }

      const projectLabel = await ProjectLabelService.assignLabel(projectId, labelId);
      res.status(201).json({ success: true, data: projectLabel });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/v1/projects/:projectId/labels
   */
  static async updateProjectLabels(req: Request, res: Response) {
    try {
      const projectId = req.params.projectId as string;
      const { labelIds } = req.body;

      if (!labelIds || !Array.isArray(labelIds)) {
        return res.status(400).json({ success: false, error: 'labelIds array is required' });
      }

      const labels = await ProjectLabelService.updateProjectLabels(projectId, labelIds);
      res.json({ success: true, data: labels });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/v1/projects/:projectId/labels/:labelId
   */
  static async removeLabel(req: Request, res: Response) {
    try {
      const projectId = req.params.projectId as string;
      const labelId = req.params.labelId as string;
      await ProjectLabelService.removeLabel(projectId, labelId);
      res.json({ success: true, message: 'Label removed from project' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ success: false, error: 'Label not found in project' });
      }
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

// =========================================================
// LABEL REQUEST CONTROLLER
// =========================================================

export class LabelRequestController {
  /**
   * GET /api/v1/projects/:projectId/label-requests
   */
  static async getProjectRequests(req: Request, res: Response) {
    try {
      const projectId = req.params.projectId as string;
      const statusParam = req.query.status as string | undefined;

      let status: LabelRequestStatus | undefined;
      if (statusParam && Object.values(LabelRequestStatus).includes(statusParam as LabelRequestStatus)) {
        status = statusParam as LabelRequestStatus;
      }

      const requests = await LabelRequestService.getProjectRequests(projectId, status);
      res.json({ success: true, data: requests });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/v1/projects/:projectId/label-requests/pending-count
   */
  static async getPendingCount(req: Request, res: Response) {
    try {
      const projectId = req.params.projectId as string;
      const count = await LabelRequestService.getPendingCount(projectId);
      res.json({ success: true, data: { count } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/v1/projects/:projectId/label-requests
   */
  static async createRequest(req: Request, res: Response) {
    try {
      const projectId = req.params.projectId as string;
      const { labelName, suggestedColor, reason } = req.body;
      const userId = (req as any).user?.sub as string;

      if (!labelName) {
        return res.status(400).json({ success: false, error: 'labelName is required' });
      }

      const request = await LabelRequestService.createRequest({
        projectId,
        requestedBy: userId,
        labelName,
        suggestedColor: suggestedColor || null,
        reason: reason || null,
      });

      res.status(201).json({ success: true, data: request });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/v1/projects/:projectId/label-requests/:requestId/approve
   */
  static async approveRequest(req: Request, res: Response) {
    try {
      const requestId = req.params.requestId as string;
      const { categoryId } = req.body;
      const userId = (req as any).user?.sub as string;

      const result = await LabelRequestService.approveRequest(requestId, userId, categoryId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * PUT /api/v1/projects/:projectId/label-requests/:requestId/reject
   */
  static async rejectRequest(req: Request, res: Response) {
    try {
      const requestId = req.params.requestId as string;
      const { reason } = req.body;
      const userId = (req as any).user?.sub as string;

      const request = await LabelRequestService.rejectRequest(requestId, userId, reason);
      res.json({ success: true, data: request });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}
