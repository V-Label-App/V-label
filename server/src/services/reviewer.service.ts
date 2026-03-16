import { prisma } from '../utils/database.js'
import {
  ProjectRole,
  AssignmentStatus,
  TaskStatus,
  NotificationType,
} from '@prisma/client'
import logger from '../utils/logger.js'
import { NotificationService } from './notification.service.js'
import { NotificationTemplateService } from './notification.template.service.js'
import { appEvents } from '../utils/events.js'
import { broadcastService } from '../websocket/events/broadcast.service.js'
import { SystemEventType } from '../websocket/events/types.js'
import env from '../config/env.js'

export class ReviewerService {
  /**
   * Get all projects where the user is a member as Reviewer
   */
  static async getMyProjects(userId: string) {
    try {
      const projects = await prisma.project.findMany({
        where: {
          members: {
            some: {
              userId,
              projectRole: ProjectRole.REVIEWER,
            },
          },
        },
        include: {
          category: true,
          _count: {
            select: {
              // Count tasks assigned to this reviewer
              tasks: {
                where: {
                  assignments: {
                    some: {
                      reviewerId: userId,
                      status: {
                        in: [
                          AssignmentStatus.SUBMITTED,
                          AssignmentStatus.APPROVED,
                          AssignmentStatus.REJECTED,
                        ],
                      },
                    },
                  },
                },
              },
              members: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Calculate progress for each project
      const projectsWithProgress = await Promise.all(
        projects.map(async (project) => {
          const [totalTasks, doneTasks] = await Promise.all([
            prisma.task.count({ where: { projectId: project.id } }),
            prisma.task.count({
              where: {
                projectId: project.id,
                status: 'DONE',
              },
            }),
          ])

          const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0

          return {
            ...project,
            progress,
          }
        }),
      )

      return projectsWithProgress
    } catch (error) {
      logger.error('SERVICE', 'Error getting reviewer projects', {
        error,
        userId,
      })
      throw error
    }
  }

  /**
   * Get review queue (tasks submitted for review)
   */
  static async getReviewQueue(
    userId: string,
    filters: {
      projectId?: string
      status?: AssignmentStatus
      page: number
      limit: number
    },
  ) {
    try {
      const { projectId, status, page, limit } = filters
      const skip = (page - 1) * limit

      const where: any = {
        reviewerId: userId,
      }

      if (projectId) {
        where.task = { projectId }
      }

      if (status) {
        where.status = status
      }

      const [assignments, total] = await Promise.all([
        prisma.taskAssignment.findMany({
          where,
          include: {
            task: {
              include: {
                image: {
                  select: {
                    id: true,
                    storageUrl: true,
                    originalFilename: true,
                    width: true,
                    height: true,
                  },
                },
                project: {
                  select: {
                    id: true,
                    name: true,
                    labelConfig: true,
                    projectLabels: {
                      include: {
                        label: {
                          include: {
                            category: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            annotator: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: [
            { deadline: 'asc' }, // Urgent reviews first
            { createdAt: 'asc' }, // Oldest first
          ],
          skip,
          take: limit,
        }),
        prisma.taskAssignment.count({ where }),
      ])

      // Calculate counts by status
      const statusCounts = await prisma.taskAssignment.groupBy({
        by: ['status'],
        where: { reviewerId: userId },
        _count: true,
      })

      const reviewCounts = {
        pending:
          statusCounts.find((s) => s.status === AssignmentStatus.SUBMITTED)
            ?._count || 0,
        approved:
          statusCounts.find((s) => s.status === AssignmentStatus.APPROVED)
            ?._count || 0,
        rejected:
          statusCounts.find((s) => s.status === AssignmentStatus.REJECTED)
            ?._count || 0,
        total,
      }

      return {
        data: assignments,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          reviewCounts,
        },
      }
    } catch (error) {
      logger.error('SERVICE', 'Error getting review queue', { error, userId })
      throw error
    }
  }

  /**
   * Get assignment detail for reviewer (with ownership check)
   */
  static async getAssignmentDetail(assignmentId: string, userId: string) {
    try {
      // First check if assignment exists at all
      const existingAssignment = await prisma.taskAssignment.findUnique({
        where: { id: assignmentId },
        select: { id: true, reviewerId: true, annotatorId: true, status: true },
      })

      if (!existingAssignment) {
        throw new Error(`Assignment not found with ID: ${assignmentId}`)
      }

      // Check if user is the assigned reviewer
      if (!existingAssignment.reviewerId) {
        throw new Error(
          `Assignment ${assignmentId} does not have a reviewer assigned yet`,
        )
      }

      if (existingAssignment.reviewerId !== userId) {
        throw new Error(
          `Assignment ${assignmentId} is assigned to different reviewer. Your ID: ${userId}, Assigned to: ${existingAssignment.reviewerId}`,
        )
      }

      // Now fetch full assignment data
      const assignment = await prisma.taskAssignment.findFirst({
        where: {
          id: assignmentId,
          reviewerId: userId,
        },
        include: {
          task: {
            include: {
              image: true,
              assignments: {
                where: {
                  id: { not: assignmentId },
                  status: { in: [AssignmentStatus.REJECTED, AssignmentStatus.SKIPPED] },
                },
                include: {
                  annotator: { select: { fullName: true, email: true } },
                  submissionHistory: {
                    orderBy: { submissionNumber: 'desc' },
                  },
                },
                orderBy: { createdAt: 'desc' },
              },
              project: {
                include: {
                  projectLabels: {
                    include: {
                      label: {
                        include: { category: true },
                      },
                    },
                  },
                },
              },
            },
          },
          annotator: {
            select: { id: true, fullName: true, email: true, avatarUrl: true },
          },
          reviewer: {
            select: { id: true, fullName: true, email: true },
          },
        },
      })

      if (!assignment) {
        throw new Error('Failed to load assignment with full details')
      }

      return this.transformAssignment(assignment)
    } catch (error) {
      logger.error('SERVICE', 'Error getting assignment detail', {
        error,
        assignmentId,
        userId,
      })
      throw error
    }
  }

  /**
   * Approve a task assignment
   */
  static async approveTask(
    assignmentId: string,
    userId: string,
    reviewComment?: string,
  ) {
    try {
      // Verify the assignment exists and user is the assigned reviewer
      const assignment = await prisma.taskAssignment.findFirst({
        where: {
          id: assignmentId,
          reviewerId: userId,
          status: AssignmentStatus.SUBMITTED,
        },
        include: {
          task: {
            include: {
              image: { select: { originalFilename: true } },
              project: { select: { id: true, name: true } },
            },
          },
          annotator: {
            select: { id: true, fullName: true, email: true },
          },
          reviewer: {
            select: { id: true, fullName: true },
          },
        },
      })

      if (!assignment) {
        throw new Error('Assignment not found or not submitted for review')
      }

      const { UserWorkloadService } = await import('./user-workload.service.js')

      // Interactive transaction: all DB ops in one atomic block
      const updatedAssignment = await prisma.$transaction(async (tx) => {
        // 1. Update assignment status
        const updated = await tx.taskAssignment.update({
          where: { id: assignmentId },
          data: {
            status: AssignmentStatus.APPROVED,
            reviewedAt: new Date(),
            ...(reviewComment && { reviewComment }),
          },
          include: {
            task: { include: { image: true } },
            annotator: { select: { id: true, fullName: true, email: true } },
          },
        })

        // 2. Mark task as DONE
        await tx.task.update({
          where: { id: assignment.task.id },
          data: { status: TaskStatus.DONE },
        })

        // 3. Update annotator reputation
        await tx.user.update({
          where: { id: assignment.annotator.id },
          data: {
            reputationScore: { increment: env.REPUTATION_APPROVE_DELTA },
          },
        })

        // 4. Decrement pending review tasks in workload
        await tx.userWorkload.updateMany({
          where: {
            userId: assignment.annotator.id,
            projectId: assignment.task.project.id,
          },
          data: { pendingReviewTasks: { decrement: 1 } },
        })

        return updated
      })

      // Post-transaction: update availability (non-critical, outside tx is ok)
      const { UserWorkloadService: WorkloadSvc } =
        await import('./user-workload.service.js')
      await WorkloadSvc.updateAvailabilityStatus(
        assignment.annotator.id,
        assignment.task.project.id,
      )

      // Send notification to annotator
      const taskName =
        assignment.task.image?.originalFilename ||
        `Task ${assignment.task.id.slice(0, 8)}`
      const reviewerName = assignment.reviewer?.fullName || 'Reviewer'
      try {
        const rendered = await NotificationTemplateService.render(
          NotificationType.TASK_APPROVED,
          {
            reviewerName,
            taskName,
            projectName: assignment.task.project.name,
            taskId: assignment.task.id,
          },
        )

        if (rendered) {
          const notification = await NotificationService.createNotification({
            userId: assignment.annotator.id,
            type: NotificationType.TASK_APPROVED,
            title: rendered.title,
            message: rendered.message,
            metadata: {
              assignmentId,
              taskId: assignment.task.id,
              projectId: assignment.task.project.id,
              reviewerId: userId,
            },
          })

          broadcastService.broadcastToUser(
            assignment.annotator.id,
            SystemEventType.NOTIFICATION_CREATED,
            {
              notification: {
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                metadata: notification.metadata,
                isRead: notification.isRead,
                createdAt: notification.createdAt,
              },
            },
          )
        }
      } catch (notifError) {
        logger.error('SERVICE', 'Failed to send approval notification', {
          error: notifError,
          assignmentId,
        })
      }

      // Emit event
      appEvents.emit('TASK_APPROVED', {
        taskId: assignment.task.id,
        assignmentId,
        reviewerId: userId,
        annotatorId: assignment.annotator.id,
        projectId: assignment.task.project.id,
      })

      logger.info('SERVICE', 'Task approved', {
         assignmentId,
        reviewerId: userId,
      })
      return this.transformAssignment(updatedAssignment)
    } catch (error) {
      logger.error('SERVICE', 'Error approving task', {
        error,
        assignmentId,
        userId,
      })
      throw error
    }
  }

  /**
   * Reject a task assignment
   */
  static async rejectTask(
    assignmentId: string,
    userId: string,
    reviewComment: string,
  ) {
    try {
      // Verify the assignment exists and user is the assigned reviewer
      const assignment = await prisma.taskAssignment.findFirst({
        where: {
          id: assignmentId,
          reviewerId: userId,
          status: AssignmentStatus.SUBMITTED,
        },
        include: {
          task: {
            include: {
              image: true,
              project: {
                include: { assignmentRule: true },
              },
            },
          },
          annotator: {
            select: { id: true, fullName: true, email: true },
          },
          reviewer: {
            select: { id: true, fullName: true },
          },
        },
      })

      if (!assignment) {
        throw new Error('Assignment not found or not submitted for review')
      }

      if (!reviewComment || reviewComment.trim() === '') {
        throw new Error('Review comment is required when rejecting a task')
      }

      const newRejectionCount = assignment.rejectionCount + 1

      // Fetch max rejections rule (Project Rule -> Assignment Level Default)
      const maxRejectionsRule =
        assignment.task.project.assignmentRule?.maxRejectionsBeforeReassign ??
        assignment.maxRejections

      // "More than X rejections" means it triggers on the (X+1)-th rejection
      // Align with FE logic (e.g. if max is 3, trigger on the 4th reject)
      const exceedsMaxRejections = newRejectionCount > maxRejectionsRule

      // Interactive transaction: all DB ops in one atomic block
      const updatedAssignment = await prisma.$transaction(async (tx) => {
        // 1. Update assignment status + increment rejectionCount
        const updated = await tx.taskAssignment.update({
          where: { id: assignmentId },
          data: {
            status: exceedsMaxRejections ? AssignmentStatus.SKIPPED : AssignmentStatus.REJECTED,
            reviewComment,
            reviewedAt: new Date(),
            rejectionCount: { increment: 1 },
          },
          include: {
            task: { include: { image: true } },
            annotator: { select: { id: true, fullName: true, email: true } },
          },
        })

        // 1.1 Create history record
        await tx.taskSubmissionHistory.create({
          data: {
            assignmentId: assignmentId,
            submissionNumber: newRejectionCount,
            annotations: assignment.annotations as any, // Current annotations being rejected
            reviewComment: reviewComment,
            status: AssignmentStatus.REJECTED,
            reviewedAt: new Date(),
          },
        })

        // 2. Reset task status to TODO for reannotation
        await tx.task.update({
          where: { id: assignment.task.id },
          data: { status: TaskStatus.TODO },
        })

        // 3. Update annotator reputation
        await tx.user.update({
          where: { id: assignment.annotator.id },
          data: { reputationScore: { increment: env.REPUTATION_REJECT_DELTA } },
        })

        // 4. Decrement pending review tasks in workload
        await tx.userWorkload.updateMany({
          where: {
            userId: assignment.annotator.id,
            projectId: assignment.task.project.id,
          },
          data: { pendingReviewTasks: { decrement: 1 } },
        })

        return updated
      })

      // Post-transaction: update availability
      const projectId = assignment.task.project.id
      const { UserWorkloadService } = await import('./user-workload.service.js')
      await UserWorkloadService.updateAvailabilityStatus(
        assignment.annotator.id,
        projectId,
      )

      // If max rejections exceeded, emit reassignment event
      if (exceedsMaxRejections) {
        logger.warn(
          'SERVICE',
          'Max rejections reached, triggering reassignment',
          {
            assignmentId,
            rejectionCount: newRejectionCount,
            maxRejections: maxRejectionsRule,
          },
        )
        appEvents.emit('TASK_SKIPPED_REASSIGN', {
          taskId: assignment.task.id,
          projectId,
          excludeUserId: assignment.annotator.id,
        })
      }

      // Send notification to annotator
      const taskName =
        assignment.task.image?.originalFilename ||
        `Task ${assignment.task.id.slice(0, 8)}`
      const reviewerName = assignment.reviewer?.fullName || 'Reviewer'
      try {
        const rendered = await NotificationTemplateService.render(
          NotificationType.TASK_REJECTED,
          {
            reviewerName,
            taskName,
            projectName: assignment.task.project.name,
            taskId: assignment.task.id,
            feedback: reviewComment,
          },
        )

        if (rendered) {
          const notification = await NotificationService.createNotification({
            userId: assignment.annotator.id,
            type: NotificationType.TASK_REJECTED,
            title: rendered.title,
            message: rendered.message,
            metadata: {
              assignmentId,
              taskId: assignment.task.id,
              projectId,
              reviewerId: userId,
              feedback: reviewComment,
              rejectionCount: newRejectionCount,
              exceedsMaxRejections,
            },
          })

          broadcastService.broadcastToUser(
            assignment.annotator.id,
            SystemEventType.NOTIFICATION_CREATED,
            {
              notification: {
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                metadata: notification.metadata,
                isRead: notification.isRead,
                createdAt: notification.createdAt,
              },
            },
          )
        }
      } catch (notifError) {
        logger.error('SERVICE', 'Failed to send rejection notification', {
          error: notifError,
          assignmentId,
        })
      }

      // Emit event
      appEvents.emit('TASK_REJECTED', {
        taskId: assignment.task.id,
        assignmentId,
        reviewerId: userId,
        annotatorId: assignment.annotator.id,
        projectId,
        rejectionCount: newRejectionCount,
        exceedsMaxRejections,
      })

      logger.info('SERVICE', 'Task rejected', {
        assignmentId,
        reviewerId: userId,
         rejectionCount: newRejectionCount,
        exceedsMaxRejections,
      })
      return this.transformAssignment(updatedAssignment)
    } catch (error) {
      logger.error('SERVICE', 'Error rejecting task', {
        error,
        assignmentId,
        userId,
      })
      throw error
    }
  }

  /**
   * Get reviewer statistics
   */
  static async getStats(userId: string) {
    try {
      // Count by status in parallel
      const [
        approved,
        rejected,
        pending,
        todayApproved,
        todayRejected,
        weekApproved,
        weekRejected,
      ] = await Promise.all([
        prisma.taskAssignment.count({
          where: { reviewerId: userId, status: AssignmentStatus.APPROVED },
        }),
        prisma.taskAssignment.count({
          where: { reviewerId: userId, status: AssignmentStatus.REJECTED },
        }),
        prisma.taskAssignment.count({
          where: { reviewerId: userId, status: AssignmentStatus.SUBMITTED },
        }),
        prisma.taskAssignment.count({
          where: {
            reviewerId: userId,
            status: AssignmentStatus.APPROVED,
            reviewedAt: { gte: getStartOfDay() },
          },
        }),
        prisma.taskAssignment.count({
          where: {
            reviewerId: userId,
            status: AssignmentStatus.REJECTED,
            reviewedAt: { gte: getStartOfDay() },
          },
        }),
        prisma.taskAssignment.count({
          where: {
            reviewerId: userId,
            status: AssignmentStatus.APPROVED,
            reviewedAt: { gte: getStartOfWeek() },
          },
        }),
        prisma.taskAssignment.count({
          where: {
            reviewerId: userId,
            status: AssignmentStatus.REJECTED,
            reviewedAt: { gte: getStartOfWeek() },
          },
        }),
      ])

      const totalReviewed = approved + rejected
      const approvalRate =
        totalReviewed > 0 ? Math.round((approved / totalReviewed) * 100) : 0
      const todayCount = todayApproved + todayRejected
      const weekCount = weekApproved + weekRejected

      // Calculate average review time from assignments that have reviewedAt
      const avgResult = await prisma.$queryRaw<
        [{ avg_seconds: number | null }]
      >`
                SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - updated_at))) as avg_seconds
                FROM task_assignments
                WHERE reviewer_id = ${userId}::uuid
                AND reviewed_at IS NOT NULL
                AND status IN ('APPROVED', 'REJECTED')
            `
      const avgReviewTimeMinutes = avgResult[0]?.avg_seconds
        ? Math.round(avgResult[0].avg_seconds / 60)
        : null

      return {
        totalReviewed,
        approvalRate,
        pendingCount: pending,
        avgReviewTimeMinutes,
        todayCount,
        weekCount,
      }
    } catch (error) {
      logger.error('SERVICE', 'Error getting reviewer stats', { error, userId })
      throw error
    }
  }

  /**
   * Helper to transform assignment data for JSON serialization (handles BigInt)
   */
  private static transformAssignment(assignment: any) {
    if (!assignment) return null

    return {
      ...assignment,
      task: assignment.task
        ? {
            ...assignment.task,
            image: assignment.task.image
              ? {
                  ...assignment.task.image,
                  fileSizeBytes: assignment.task.image.fileSizeBytes
                    ? Number(assignment.task.image.fileSizeBytes)
                    : null,
                }
              : null,
            history: (assignment.task.assignments || []).map((a: any) => ({
              ...a,
              submissionHistory: a.submissionHistory || [],
            })),
          }
        : null,
      submissionHistory: assignment.submissionHistory || [],
    }
  }
}

function getStartOfDay(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function getStartOfWeek(): Date {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday = start of week
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - diff,
  )
  return monday
}
