import { prisma } from '../utils/database.js'
import { execSync } from 'child_process'

export interface DashboardStats {
  totalUsers: number
  userGrowth: number
  usersByRole: {
    admin: number
    manager: number
    reviewer: number
    annotator: number
  }
  projects: {
    active: number
    completed: number
    total: number
  }
  annotations: {
    today: number
    thisWeek: number
    thisMonth: number
    total: number
  }
  labels: {
    thisMonth: number
    total: number
  }
  storage: {
    used: number
    total: number
    percentage: number
  }
  topAnnotators: {
    id: string
    name: string
    count: number
    quality: number
  }[]
  performance: {
    avgAnnotationTime: number
    completionRate: number
    qualityScore: number
  }
  cloudinary: {
    storage: { usage: number; limit: number; usagePercent: number }
    credits: { usage: number; limit: number; usagePercent: number }
    bandwidth: { usage: number; limit: number; usagePercent: number }
  } | null
}

export class AdminDashboardService {
  /**
   * Get real disk usage from VPS (Linux)
   */
  private static getDiskUsage(): {
    used: number
    total: number
    percentage: number
  } {
    try {
      // Run df command to get disk usage in GB for root partition
      const output = execSync('df -BG /').toString()
      const lines = output.trim().split('\n')

      if (lines.length < 2) {
        throw new Error('Invalid df output')
      }

      // Parse the second line (actual data)
      // Example: /dev/sda1      100G   42G   58G  42% /
      const data = lines[1]!.split(/\s+/)

      if (data.length < 5) {
        throw new Error('Invalid df data format')
      }

      const total = parseInt(data[1]?.replace('G', '') || '100')
      const used = parseInt(data[2]?.replace('G', '') || '10')
      const percentage = parseInt(data[4]?.replace('%', '') || '10')

      return { used, total, percentage }
    } catch (error) {
      console.error('Failed to get disk usage, using fallback:', error)
      // Fallback to estimate if command fails
      const totalTasks = 0 // Will be calculated in getStats if needed
      return {
        used: 10,
        total: 100,
        percentage: 10,
      }
    }
  }
  /**
   * Get all dashboard statistics
   */
  static async getStats(): Promise<DashboardStats> {
    const now = new Date()
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    )
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // Parallel queries for better performance
    const [
      totalUsers,
      usersLastMonth,
      usersByRole,
      projectStats,
      annotationsToday,
      annotationsThisWeek,
      annotationsThisMonth,
      totalAnnotations,
      labelsThisMonth,
      totalLabels,
      topAnnotators,
      approvedCount,
      totalSubmitted,
      avgReviewScore,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // Users created last month (for growth calculation)
      prisma.user.count({
        where: {
          createdAt: {
            gte: startOfLastMonth,
            lt: startOfMonth,
          },
        },
      }),

      // Users by role
      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),

      // Project stats
      prisma.project.groupBy({
        by: ['status'],
        _count: true,
      }),

      // Annotations today (submitted assignments)
      prisma.taskAssignment.count({
        where: {
          status: { in: ['SUBMITTED', 'APPROVED', 'REJECTED'] },
          updatedAt: { gte: startOfDay },
        },
      }),

      // Annotations this week
      prisma.taskAssignment.count({
        where: {
          status: { in: ['SUBMITTED', 'APPROVED', 'REJECTED'] },
          updatedAt: { gte: startOfWeek },
        },
      }),

      // Annotations this month
      prisma.taskAssignment.count({
        where: {
          status: { in: ['SUBMITTED', 'APPROVED', 'REJECTED'] },
          updatedAt: { gte: startOfMonth },
        },
      }),

      // Total annotations
      prisma.taskAssignment.count({
        where: {
          status: { in: ['SUBMITTED', 'APPROVED', 'REJECTED'] },
        },
      }),

      // Labels created this month
      prisma.label.count({
        where: {
          createdAt: { gte: startOfMonth },
        },
      }),

      // Total labels
      prisma.label.count(),

      // Top annotators (by totalTasksDone)
      prisma.user.findMany({
        where: {
          role: 'ANNOTATOR',
          totalTasksDone: { gt: 0 },
        },
        orderBy: { totalTasksDone: 'desc' },
        take: 5,
        select: {
          id: true,
          fullName: true,
          email: true,
          totalTasksDone: true,
          reputationScore: true,
        },
      }),

      // Approved annotations count (for completion rate)
      prisma.taskAssignment.count({
        where: { status: 'APPROVED' },
      }),

      // Total submitted (for completion rate calculation)
      prisma.taskAssignment.count({
        where: { status: { in: ['SUBMITTED', 'APPROVED', 'REJECTED'] } },
      }),

      // Average review score
      prisma.taskAssignment.aggregate({
        _avg: { reviewScore: true },
        where: { reviewScore: { not: null } },
      }),
    ])

    // Calculate user growth
    const usersThisMonth = await prisma.user.count({
      where: {
        createdAt: { gte: startOfMonth },
      },
    })
    const userGrowth = usersThisMonth - usersLastMonth

    // Transform users by role
    const roleMap: Record<string, number> = {
      ADMIN: 0,
      MANAGER: 0,
      REVIEWER: 0,
      ANNOTATOR: 0,
    }
    usersByRole.forEach((item) => {
      roleMap[item.role] = item._count
    })

    // Transform project stats
    const projectMap: Record<string, number> = {}
    projectStats.forEach((item) => {
      projectMap[item.status] = item._count
    })

    const activeProjects =
      (projectMap['ACTIVE'] || 0) +
      (projectMap['DRAFT'] || 0) +
      (projectMap['PAUSED'] || 0)
    const completedProjects =
      (projectMap['COMPLETED'] || 0) + (projectMap['ARCHIVED'] || 0)

    // Format top annotators
    const formattedTopAnnotators: {
      id: string
      name: string
      count: number
      quality: number
    }[] = topAnnotators.map((user) => ({
      id: user.id,
      name: user.fullName || user.email.split('@')[0] || 'Unknown',
      count: user.totalTasksDone,
      quality: Math.min(100, Math.max(0, user.reputationScore)), // Clamp to 0-100
    }))

    // Calculate performance metrics
    const completionRate =
      totalSubmitted > 0
        ? Math.round((approvedCount / totalSubmitted) * 1000) / 10
        : 0

    const qualityScore = avgReviewScore._avg.reviewScore
      ? Math.round(avgReviewScore._avg.reviewScore * 10) / 10
      : 0

    // Storage calculation - Get real disk usage from VPS
    const diskUsage = this.getDiskUsage()

    // Fetch Cloudinary Usage
    let cloudinaryUsage: any = null
    try {
      const { ImageService } = await import('./image.service.js')
      const usageData = await ImageService.getUsage()
      cloudinaryUsage = {
        storage: {
          usage: usageData.storage.usage,
          limit: usageData.storage.limit,
          usagePercent: usageData.storage.used_percent,
        },
        credits: {
          usage: usageData.credits.usage,
          limit: usageData.credits.limit,
          usagePercent: usageData.credits.used_percent,
        },
        bandwidth: {
          usage: usageData.bandwidth.usage,
          limit: usageData.bandwidth.limit,
          usagePercent: usageData.bandwidth.used_percent,
        },
      }
    } catch (e) {
      console.warn('Failed to fetch Cloudinary usage', e)
    }

    return {
      totalUsers,
      userGrowth,
      usersByRole: {
        admin: roleMap['ADMIN'] ?? 0,
        manager: roleMap['MANAGER'] ?? 0,
        reviewer: roleMap['REVIEWER'] ?? 0,
        annotator: roleMap['ANNOTATOR'] ?? 0,
      },
      projects: {
        active: activeProjects,
        completed: completedProjects,
        total: activeProjects + completedProjects,
      },
      annotations: {
        today: annotationsToday,
        thisWeek: annotationsThisWeek,
        thisMonth: annotationsThisMonth,
        total: totalAnnotations,
      },
      labels: {
        thisMonth: labelsThisMonth,
        total: totalLabels,
      },
      storage: {
        used: diskUsage.used,
        total: diskUsage.total,
        percentage: diskUsage.percentage,
      },
      cloudinary: cloudinaryUsage,
      topAnnotators: formattedTopAnnotators,
      performance: {
        avgAnnotationTime: 45, // TODO: Calculate from actual timing data if available
        completionRate,
        qualityScore,
      },
    }
  }
}
