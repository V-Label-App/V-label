import { prisma } from '../utils/database.js'
import logger from '../utils/logger.js'
import { Prisma } from '@prisma/client'

export class DatasetService {
    /**
     * Create a new dataset for a project
     */
    static async createDataset(projectId: string, data: { name: string; description?: string; source?: string }) {
        try {
            const dataset = await prisma.dataset.create({
                data: {
                    projectId,
                    name: data.name,
                    ...(data.description && { description: data.description }),
                    ...(data.source && { source: data.source }),
                },
            })
            logger.info('DATASET', `Created dataset ${dataset.id} for project ${projectId}`)
            return dataset
        } catch (error) {
            logger.error('DATASET', 'Failed to create dataset', error)
            throw error
        }
    }

    /**
     * Get all datasets for a project with image counts
     */
    static async getProjectDatasets(projectId: string) {
        try {
            const datasets = await prisma.dataset.findMany({
                where: { projectId },
                include: {
                    _count: {
                        select: { images: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            })
            return datasets
        } catch (error) {
            logger.error('DATASET', 'Failed to get project datasets', error)
            throw error
        }
    }

    /**
     * Get single dataset details
     */
    static async getDatasetById(id: string) {
        try {
            const dataset = await prisma.dataset.findUnique({
                where: { id },
                include: {
                    images: {
                        orderBy: { uploadedAt: 'desc' }
                    },
                    _count: {
                        select: { images: true }
                    }
                }
            })
            return dataset
        } catch (error) {
            logger.error('DATASET', `Failed to get dataset ${id}`, error)
            throw error
        }
    }

    /**
     * Delete dataset (and optionally its images?)
     * For now, Prisma cascade delete handles image records deletion if configured,
     * but we should ideally handle Cloudinary cleanup too.
     */
    static async deleteDataset(id: string) {
        try {
            await prisma.dataset.delete({
                where: { id },
            })
            logger.info('DATASET', `Deleted dataset ${id}`)
        } catch (error) {
            logger.error('DATASET', `Failed to delete dataset ${id}`, error)
            throw error
        }
    }
}
