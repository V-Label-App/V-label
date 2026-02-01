import { prisma } from '../utils/database.js'
import logger from '../utils/logger.js'

export class ProjectCategoryService {
  /**
   * Get all categories with project count
   */
  static async getAll() {
    try {
      return await prisma.projectCategory.findMany({
        include: {
          _count: {
            select: { projects: true },
          },
        },
        orderBy: { name: 'asc' },
      })
    } catch (error) {
      logger.error('SERVICE', 'Error getting project categories', { error })
      throw error
    }
  }

  /**
   * Create a new category
   */
  static async create(data: { name: string; description?: string | undefined }) {
    try {
      // Check for duplicate name
      const existing = await prisma.projectCategory.findUnique({
        where: { name: data.name },
      })

      if (existing) {
        throw new Error(`Category "${data.name}" already exists`)
      }

      return await prisma.projectCategory.create({
        data: {
          name: data.name,
          description: data.description ?? null, // Convert undefined to null for Prisma
        },
      })
    } catch (error) {
      logger.error('SERVICE', 'Error creating project category', { data, error })
      throw error
    }
  }

  /**
   * Update a category
   */
  static async update(
    id: string,
    data: { name?: string; description?: string | undefined },
  ) {
    try {
      // If name is being updated, check for duplicates
      if (data.name) {
        const existing = await prisma.projectCategory.findFirst({
          where: {
            name: data.name,
            id: { not: id }, // Exclude current category
          },
        })

        if (existing) {
          throw new Error(`Category "${data.name}" already exists`)
        }
      }

      return await prisma.projectCategory.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          // Allow setting to null explicitly if passed, or ignore if undefined
          ...(data.description !== undefined && { description: data.description }),
        },
      })
    } catch (error) {
      logger.error('SERVICE', 'Error updating project category', { id, error })
      throw error
    }
  }

  /**
   * Delete a category
   * STRICT RULE: Cannot delete if used by any project
   */
  static async delete(id: string) {
    try {
      // Check usage
      const usageCount = await prisma.project.count({
        where: { categoryId: id },
      })

      if (usageCount > 0) {
        throw new Error(
          `Cannot delete category: It is used by ${usageCount} project(s)`,
        )
      }

      return await prisma.projectCategory.delete({
        where: { id },
      })
    } catch (error) {
      logger.error('SERVICE', 'Error deleting project category', { id, error })
      throw error
    }
  }
}
