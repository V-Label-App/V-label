import { prisma } from '../utils/database.js';
import { TaskAction } from '@prisma/client';
import logger from '../utils/logger.js';

export interface TaskActivityMetadata {
  targetUserId?: string;
  targetUserName?: string;
  deadline?: string;
  oldDeadline?: string;
  newDeadline?: string;
  oldStatus?: string;
  newStatus?: string;
  oldAssignee?: string;
  newAssignee?: string;
  reason?: string;
  count?: number;
  taskIds?: string[];
  [key: string]: any;
}

export class TaskActivityService {
  /**
   * Log a task activity
   */
  static async logActivity(data: {
    taskId: string;
    projectId: string;
    userId: string;
    action: TaskAction;
    metadata?: TaskActivityMetadata;
  }) {
    try {
      const activity = await prisma.taskActivity.create({
        data: {
          taskId: data.taskId,
          projectId: data.projectId,
          userId: data.userId,
          action: data.action,
          metadata: data.metadata || {},
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
          task: {
            select: {
              id: true,
              image: {
                select: {
                  originalFilename: true,
                },
              },
            },
          },
        },
      });

      logger.info('ACTIVITY', `Task activity logged`, {
        taskId: data.taskId,
        action: data.action,
        userId: data.userId,
      });

      return activity;
    } catch (error) {
      logger.error('ACTIVITY', 'Failed to log task activity', { error, data });
      throw error;
    }
  }

  /**
   * Log bulk activities (for bulk operations)
   * Creates a single activity representing the bulk operation
   */
  static async logBulkActivity(data: {
    taskIds: string[];
    projectId: string;
    userId: string;
    action: TaskAction;
    metadata?: TaskActivityMetadata;
  }) {
    try {
      // Create a single activity for the bulk operation using the first task as representative
      const activity = await prisma.taskActivity.create({
        data: {
          taskId: data.taskIds[0], // Use first task as representative
          projectId: data.projectId,
          userId: data.userId,
          action: data.action,
          metadata: { ...data.metadata, count: data.taskIds.length },
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
          task: {
            select: {
              id: true,
              image: {
                select: {
                  originalFilename: true,
                },
              },
            },
          },
        },
      });

      logger.info('ACTIVITY', `Bulk activity logged`, {
        taskIds: data.taskIds,
        action: data.action,
        userId: data.userId,
        count: data.taskIds.length,
      });

      return activity;
    } catch (error) {
      logger.error('ACTIVITY', 'Failed to log bulk activities', { error, data });
      throw error;
    }
  }

  /**
   * Get activities for a specific task
   */
  static async getTaskActivities(taskId: string, limit: number = 50) {
    try {
      const activities = await prisma.taskActivity.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      });

      return activities;
    } catch (error) {
      logger.error('ACTIVITY', 'Failed to fetch task activities', { error, taskId });
      throw error;
    }
  }

  /**
   * Get activities for a project (with pagination)
   */
  static async getProjectActivities(
    projectId: string,
    options: {
      page?: number;
      limit?: number;
      action?: TaskAction;
      userId?: string;
    } = {}
  ) {
    try {
      const { page = 1, limit = 20, action, userId } = options;
      const skip = (page - 1) * limit;

      const where: any = { projectId };
      if (action) where.action = action;
      if (userId) where.userId = userId;

      const [activities, total] = await Promise.all([
        prisma.taskActivity.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                role: true,
              },
            },
            task: {
              select: {
                id: true,
                image: {
                  select: {
                    id: true,
                    originalFilename: true,
                    storageUrl: true,
                  },
                },
              },
            },
          },
        }),
        prisma.taskActivity.count({ where }),
      ]);

      return {
        data: activities,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('ACTIVITY', 'Failed to fetch project activities', { error, projectId });
      throw error;
    }
  }

  /**
   * Get recent activities for dashboard feed
   */
  static async getRecentActivities(projectId: string, limit: number = 10) {
    try {
      const activities = await prisma.taskActivity.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
          task: {
            select: {
              id: true,
              image: {
                select: {
                  originalFilename: true,
                },
              },
            },
          },
        },
      });

      return activities;
    } catch (error) {
      logger.error('ACTIVITY', 'Failed to fetch recent activities', { error, projectId });
      throw error;
    }
  }

  /**
   * Get activity statistics for a project
   */
  static async getActivityStats(projectId: string) {
    try {
      const stats = await prisma.taskActivity.groupBy({
        by: ['action'],
        where: { projectId },
        _count: {
          id: true,
        },
      });

      return stats.reduce((acc, stat) => {
        acc[stat.action] = stat._count.id;
        return acc;
      }, {} as Record<TaskAction, number>);
    } catch (error) {
      logger.error('ACTIVITY', 'Failed to fetch activity stats', { error, projectId });
      throw error;
    }
  }
}
