import { Request, Response } from 'express'
import { z } from 'zod'
import { DatasetService } from '../services/dataset.service.js'
import logger from '../utils/logger.js'

const createDatasetSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  source: z.string().optional(),
})

const importDatasetSchema = z.object({
  sourceProjectId: z.string(),
  datasetId: z.string(),
})

export class DatasetController {
  /**
   * POST /api/v1/projects/:id/datasets
   */
  static async create(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params as { id: string }
      const validatedData = createDatasetSchema.parse(req.body)

      const dataset = await DatasetService.createDataset(projectId, {
        name: validatedData.name,
        ...(validatedData.description && {
          description: validatedData.description,
        }),
        ...(validatedData.source && { source: validatedData.source }),
      })

      return res.status(201).json(dataset)
    } catch (error) {
      logger.error('API', 'Create dataset failed', { error })
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /api/v1/projects/:id/datasets
   */
  static async listByProject(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params as { id: string }
      const datasets = await DatasetService.getProjectDatasets(projectId)
      return res.json(datasets)
    } catch (error) {
      logger.error('API', 'List datasets failed', { error })
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * GET /api/v1/projects/:id/datasets/:datasetId
   */
  static async getById(req: Request, res: Response) {
    try {
      const { datasetId } = req.params as { id: string; datasetId: string }
      const dataset = await DatasetService.getDatasetById(datasetId)

      if (!dataset) {
        return res.status(404).json({ error: 'Dataset not found' })
      }

      return res.json(dataset)
    } catch (error) {
      logger.error('API', 'Get dataset failed', { error })
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * DELETE /api/v1/projects/:id/datasets/:datasetId
   */
  static async delete(req: Request, res: Response) {
    try {
      const { datasetId } = req.params as { id: string; datasetId: string }
      await DatasetService.deleteDataset(datasetId)
      return res.json({ message: 'Dataset deleted' })
    } catch (error) {
      logger.error('API', 'Delete dataset failed', { error })
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * POST /api/v1/projects/:id/datasets/import
   * Import/copy a dataset from another project
   */
  static async importDataset(req: Request, res: Response) {
    try {
      const { id: targetProjectId } = req.params as { id: string }
      const validatedData = importDatasetSchema.parse(req.body)

      const dataset = await DatasetService.copyDataset(
        validatedData.sourceProjectId,
        validatedData.datasetId,
        targetProjectId,
      )

      return res.status(201).json(dataset)
    } catch (error: any) {
      logger.error('API', 'Import dataset failed', { error })
      if (error.message === 'Dataset not found') {
        return res.status(404).json({ error: 'Source dataset not found' })
      }
      if (error.message === 'Project not found') {
        return res.status(404).json({ error: 'Project not found' })
      }
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}
