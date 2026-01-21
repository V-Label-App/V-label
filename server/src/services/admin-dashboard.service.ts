import { prisma } from '../utils/database.js';

export interface DashboardStats {
  totalUsers: number;
  userGrowth: number;
  usersByRole: {
    admin: number;
    manager: number;
    reviewer: number;
    annotator: number;
  };
  projects: {
    active: number;
    completed: number;
    total: number;
  };
  annotations: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  topAnnotators: {
    id: string;
    name: string;
    count: number;
    quality: number;
  }[];
  performance: {
    avgAnnotationTime: number;
    completionRate: number;
    qualityScore: number;
  };
}

export class AdminDashboardService {
  /**
   * Get all dashboard statistics
   */
  static async getStats(): Promise<DashboardStats> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

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
    ]);

    // Calculate user growth
    const usersThisMonth = await prisma.user.count({
      where: {
        createdAt: { gte: startOfMonth },
      },
    });
    const userGrowth = usersThisMonth - usersLastMonth;

    // Transform users by role
    const roleMap: Record<string, number> = {
      ADMIN: 0,
      MANAGER: 0,
      REVIEWER: 0,
      ANNOTATOR: 0,
    };
    usersByRole.forEach((item) => {
      roleMap[item.role] = item._count;
    });

    // Transform project stats
    const projectMap: Record<string, number> = {};
    projectStats.forEach((item) => {
      projectMap[item.status] = item._count;
    });

    const activeProjects = (projectMap['ACTIVE'] || 0) + (projectMap['DRAFT'] || 0) + (projectMap['PAUSED'] || 0);
    const completedProjects = (projectMap['COMPLETED'] || 0) + (projectMap['ARCHIVED'] || 0);

    // Format top annotators
    const formattedTopAnnotators: { id: string; name: string; count: number; quality: number }[] = topAnnotators.map((user) => ({
      id: user.id,
      name: user.fullName || user.email.split('@')[0] || 'Unknown',
      count: user.totalTasksDone,
      quality: Math.min(100, Math.max(0, user.reputationScore)), // Clamp to 0-100
    }));

    // Calculate performance metrics
    const completionRate = totalSubmitted > 0
      ? Math.round((approvedCount / totalSubmitted) * 1000) / 10
      : 0;

    const qualityScore = avgReviewScore._avg.reviewScore
      ? Math.round(avgReviewScore._avg.reviewScore * 10) / 10
      : 0;

    // Storage calculation (estimate based on tasks with images)
    // This is a rough estimate - in production, you'd track actual file sizes
    const totalTasks = await prisma.task.count();
    const estimatedStorageGB = Math.round((totalTasks * 2) / 100) / 10; // ~2MB per image average
    const maxStorageGB = 100;

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
      storage: {
        used: estimatedStorageGB,
        total: maxStorageGB,
        percentage: Math.round((estimatedStorageGB / maxStorageGB) * 100 * 10) / 10,
      },
      topAnnotators: formattedTopAnnotators,
      performance: {
        avgAnnotationTime: 45, // TODO: Calculate from actual timing data if available
        completionRate,
        qualityScore,
      },
    };
  }
}
