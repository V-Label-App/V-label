import { prisma } from '../utils/database.js'
import logger from '../utils/logger.js'
import { Prisma } from '@prisma/client'

export class DatasetService {
  /**
   * Create a new dataset for a project
   */
  static async createDataset(
    projectId: string,
    data: { name: string; description?: string; source?: string },
  ) {
    try {
      const dataset = await prisma.dataset.create({
        data: {
          projectId,
          name: data.name,
          ...(data.description && { description: data.description }),
          ...(data.source && { source: data.source }),
        },
      })
      logger.info(
        'DATASET',
        `Created dataset ${dataset.id} for project ${projectId}`,
      )
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
            orderBy: { uploadedAt: 'desc' },
          },
          _count: {
            select: { images: true },
          },
        },
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
   * 
   * IMPORTANT: Cannot delete if dataset has images with assigned tasks
   */
  static async deleteDataset(id: string) {
    try {
      // 1. Check if dataset exists
      const dataset = await prisma.dataset.findUnique({
        where: { id },
        include: {
          images: {
            include: {
              tasks: {
                include: {
                  assignments: {
                    select: {
                      id: true,
                      annotator: {
                        select: { fullName: true, email: true }
                      }
                    },
                    take: 1
                  }
                }
              }
            }
          }
        }
      })

      if (!dataset) {
        throw new Error('Dataset not found')
      }

      // 2. Check if any images in this dataset have assigned tasks
      const imagesWithAssignments = dataset.images.filter(
        image => image.tasks.some(task => task.assignments.length > 0)
      )

      if (imagesWithAssignments.length > 0) {
        const firstAssignedImage = imagesWithAssignments[0]
        
        if (!firstAssignedImage) {
          throw new Error(`Cannot delete dataset "${dataset.name}". It contains assigned images.`)
        }
        
        const firstTask = firstAssignedImage.tasks.find(t => t.assignments.length > 0)
        const assignee = firstTask?.assignments[0]?.annotator

        throw new Error(
          `Cannot delete dataset "${dataset.name}". It contains ${imagesWithAssignments.length} image(s) that have been assigned to annotators. ` +
          `For example, "${firstAssignedImage.originalFilename}" is assigned to ${assignee?.fullName || assignee?.email || 'an annotator'}. ` +
          `Please unassign all tasks or delete the assigned images first.`
        )
      }

      // 3. Delete all images and their related data (tasks, etc.) in this dataset
      // Since Image -> Dataset does NOT have onDelete: Cascade, we need to manually delete
      const imageIds = dataset.images.map(img => img.id)
      
      if (imageIds.length > 0) {
        logger.info('DATASET', `Deleting ${imageIds.length} images from dataset ${id}`)
        
        // Delete images (this will cascade delete tasks and related data)
        await prisma.image.deleteMany({
          where: {
            id: { in: imageIds }
          }
        })
      }

      // 4. Finally, delete the dataset itself
      await prisma.dataset.delete({
        where: { id },
      })
      
      logger.info('DATASET', `Deleted dataset ${id} (${dataset.name}) with ${imageIds.length} images`)
    } catch (error) {
      logger.error('DATASET', `Failed to delete dataset ${id}`, error)
      throw error
    }
  }

  /**
   * Copy a dataset from one project to another
   * This will create a new dataset in the target project and copy all images
   */
  static async copyDataset(
    sourceProjectId: string,
    datasetId: string,
    targetProjectId: string,
  ) {
    try {
      // Verify source dataset exists and belongs to source project
      const sourceDataset = await prisma.dataset.findFirst({
        where: {
          id: datasetId,
          projectId: sourceProjectId,
        },
        include: {
          images: true,
        },
      })

      if (!sourceDataset) {
        throw new Error('Dataset not found')
      }

      // Verify target project exists
      const targetProject = await prisma.project.findUnique({
        where: { id: targetProjectId },
      })

      if (!targetProject) {
        throw new Error('Project not found')
      }

      // Create new dataset in target project
      const newDataset = await prisma.dataset.create({
        data: {
          projectId: targetProjectId,
          name: `${sourceDataset.name} (imported)`,
          description: sourceDataset.description
            ? `${sourceDataset.description} (imported from ${sourceProjectId}/${datasetId})`
            : `Imported from ${sourceProjectId}/${datasetId}`,
          source: sourceDataset.source || 'imported',
        },
      })

      // Copy all images from source dataset to new dataset
      if (sourceDataset.images && sourceDataset.images.length > 0) {
        const imageData = sourceDataset.images.map((img) => ({
          projectId: targetProjectId,
          datasetId: newDataset.id,
          originalFilename: img.originalFilename,
          storageUrl: img.storageUrl,
          storagePath: img.storagePath,
          publicId: img.publicId,
          width: img.width,
          height: img.height,
          channels: img.channels,
          fileSizeBytes: img.fileSizeBytes,
          format: img.format,
          checksum: img.checksum,
          uploadedAt: new Date(),
        }))

        await prisma.image.createMany({
          data: imageData,
        })

        logger.info(
          'DATASET',
          `Copied ${imageData.length} images from dataset ${datasetId} to new dataset ${newDataset.id}`,
        )

        // Create tasks for imported images
        try {
          const { TaskService } = await import('./task.service.js')

          // Get the newly created images
          const newImages = await prisma.image.findMany({
            where: {
              projectId: targetProjectId,
              datasetId: newDataset.id,
            },
            select: { id: true },
          })

          // Create tasks for each image
          const taskCreationPromises = newImages.map(async (img) => {
            try {
              const taskId = await TaskService.createTaskFromImage(
                img.id,
                targetProjectId,
                undefined, // No specific uploader
                true, // Treat as batch upload (skip individual activities)
              )

              // Auto-assign task if enabled
              await TaskService.autoAssignTask(
                taskId,
                targetProjectId,
                'ANNOTATOR',
                undefined,
                true, // Skip activity for batch
              )

              return taskId
            } catch (error) {
              logger.error(
                'DATASET',
                `Failed to create task for image ${img.id}`,
                error,
              )
              return null
            }
          })

          const taskIds = await Promise.all(taskCreationPromises)
          const successCount = taskIds.filter((id) => id !== null).length

          logger.info(
            'DATASET',
            `Created ${successCount}/${newImages.length} tasks for imported images`,
          )
        } catch (error) {
          logger.error(
            'DATASET',
            'Failed to create tasks for imported dataset',
            error,
          )
          // Don't fail the import if task creation fails
        }
      }

      logger.info(
        'DATASET',
        `Copied dataset ${datasetId} from project ${sourceProjectId} to project ${targetProjectId} as ${newDataset.id}`,
      )

      // Return the new dataset with counts and task info
      const result = await prisma.dataset.findUnique({
        where: { id: newDataset.id },
        include: {
          _count: {
            select: { images: true },
          },
        },
      })

      // Add task count to response
      const taskCount = await prisma.task.count({
        where: {
          projectId: targetProjectId,
          image: {
            datasetId: newDataset.id,
          },
        },
      })

      return {
        ...result,
        _taskCount: taskCount,
      }
    } catch (error) {
      logger.error('DATASET', 'Failed to copy dataset', error)
      throw error
    }
  }
}
