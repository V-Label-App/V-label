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
    draft: number
    paused: number
    completed: number
    archived: number
    total: number
  }
  annotations: {
    today: number
    thisWeek: number
    thisMonth: number
    total: number
    monthlyData: { month: string; count: number }[]
  }
  labels: {
    thisMonth: number
    total: number
    monthlyData: { month: string; count: number }[]
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

      // Top annotators (by reputationScore - điểm đánh giá chất lượng)
      prisma.user.findMany({
        where: {
          role: 'ANNOTATOR',
        },
        orderBy: [
          { reputationScore: 'desc' },
          { totalTasksDone: 'desc' },
        ],
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

    const activeProjects = projectMap['ACTIVE'] || 0
    const draftProjects = projectMap['DRAFT'] || 0
    const pausedProjects = projectMap['PAUSED'] || 0
    const completedProjects = projectMap['COMPLETED'] || 0
    const archivedProjects = projectMap['ARCHIVED'] || 0
    const totalProjects = activeProjects + draftProjects + pausedProjects + completedProjects + archivedProjects

    // Format top annotators with approved task count
    const formattedTopAnnotators: {
      id: string
      name: string
      count: number
      quality: number
    }[] = await Promise.all(
      topAnnotators.map(async (user) => {
        // Get approved task count for this annotator
        const approvedCount = await prisma.taskAssignment.count({
          where: {
            annotatorId: user.id,
            status: 'APPROVED',
          },
        })

        return {
          id: user.id,
          name: user.fullName || user.email.split('@')[0] || 'Unknown',
          count: approvedCount, // Use approved count instead of totalTasksDone
          quality: Math.min(100, Math.max(0, user.reputationScore)), // Clamp to 0-100
        }
      })
    )

    console.log('🔍 Raw topAnnotators from DB:', topAnnotators)
    console.log('✅ Formatted topAnnotators (with approved counts):', formattedTopAnnotators)

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

    // Get monthly data for annotations (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const annotationsMonthlyRaw = await prisma.$queryRaw<
      { month: Date; count: bigint }[]
    >`
      SELECT 
        DATE_TRUNC('month', "updated_at") as month,
        COUNT(*)::bigint as count
      FROM task_assignments
      WHERE status IN ('SUBMITTED', 'APPROVED', 'REJECTED')
        AND "updated_at" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "updated_at")
      ORDER BY month ASC
    `

    const annotationsMonthlyData = annotationsMonthlyRaw.map((row) => ({
      month: row.month.toISOString().substring(0, 7), // YYYY-MM
      count: Number(row.count),
    }))

    // Get monthly data for labels (last 6 months)
    const labelsMonthlyRaw = await prisma.$queryRaw<
      { month: Date; count: bigint }[]
    >`
      SELECT 
        DATE_TRUNC('month', "created_at") as month,
        COUNT(*)::bigint as count
      FROM labels
      WHERE "created_at" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "created_at")
      ORDER BY month ASC
    `

    const labelsMonthlyData = labelsMonthlyRaw.map((row) => ({
      month: row.month.toISOString().substring(0, 7), // YYYY-MM
      count: Number(row.count),
    }))

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
        draft: draftProjects,
        paused: pausedProjects,
        completed: completedProjects,
        archived: archivedProjects,
        total: totalProjects,
      },
      annotations: {
        today: annotationsToday,
        thisWeek: annotationsThisWeek,
        thisMonth: annotationsThisMonth,
        total: totalAnnotations,
        monthlyData: annotationsMonthlyData,
      },
      labels: {
        thisMonth: labelsThisMonth,
        total: totalLabels,
        monthlyData: labelsMonthlyData,
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

  /**
   * Get list of all projects with manager info
   */
  static async getAllProjects() {
    try {
      const projects = await prisma.project.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          members: {
            where: {
              projectRole: 'MANAGER',
            },
            select: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Format the response to include manager name
      return projects.map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        manager:
          project.members[0]?.user.fullName ||
          project.members[0]?.user.email.split('@')[0] ||
          'No Manager',
      }))
    } catch (error) {
      console.error('Failed to get projects list:', error)
      throw error
    }
  }
}
