import { prisma } from '../utils/database.js'
import { ProjectRole, AssignmentStatus } from '@prisma/client'
import logger from '../utils/logger.js'

export class AnnotatorService {
  /**
   * Get all projects where the user is a member as Annotator
   */
  static async getMyProjects(userId: string) {
    try {
      const projects = await prisma.project.findMany({
        where: {
          members: {
            some: {
              userId,
              projectRole: ProjectRole.ANNOTATOR,
            },
          },
        },
        include: {
          category: true,
          _count: {
            select: {
              // Count only tasks assigned to this user
              tasks: {
                where: {
                  assignments: {
                    some: { annotatorId: userId },
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
      logger.error('SERVICE', 'Error getting annotator projects', {
        error,
        userId,
      })
      throw error
    }
  }

  /**
   * Get task assignments for the current user with filters
   */
  static async getMyTasks(
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
        annotatorId: userId,
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
                    assignmentRule: true,
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
          },
          orderBy: [
            { status: 'asc' }, // ASSIGNED first
            { deadline: 'asc' }, // Urgent tasks first
          ],
          skip,
          take: limit,
        }),
        prisma.taskAssignment.count({ where }),
      ])

      // Calculate task counts by status
      const statusCounts = await prisma.taskAssignment.groupBy({
        by: ['status'],
        where: { annotatorId: userId },
        _count: true,
      })

      const taskCounts = {
        assigned:
          statusCounts.find((s) => s.status === AssignmentStatus.ASSIGNED)
            ?._count || 0,
        submitted:
          statusCounts.find((s) => s.status === AssignmentStatus.SUBMITTED)
            ?._count || 0,
        rejected:
          statusCounts.find((s) => s.status === AssignmentStatus.REJECTED)
            ?._count || 0,
        inProgress:
          statusCounts.find((s) => s.status === AssignmentStatus.IN_PROGRESS)
            ?._count || 0,
        total,
      }

      // Convert BigInt to Number for JSON serialization
      const result = {
        data: JSON.parse(
          JSON.stringify(assignments, (key, value) =>
            typeof value === 'bigint' ? Number(value) : value,
          ),
        ),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          taskCounts,
        },
      }

      return result
    } catch (error) {
      logger.error('SERVICE', 'Error getting annotator tasks', {
        error,
        userId,
      })
      throw error
    }
  }

  /**
   * Get single task assignment with full details
   */
  static async getTaskAssignment(assignmentId: string, userId: string) {
    try {
      const assignment = await prisma.taskAssignment.findFirst({
        where: {
          id: assignmentId,
          annotatorId: userId, // Ensure ownership
        },
        include: {
          task: {
            include: {
              image: true,
              assignments: {
                where: {
                  // Include ALL rejected/skipped assignments for this task,
                  // including the current one if it is rejected.
                  status: {
                    in: [AssignmentStatus.REJECTED, AssignmentStatus.SKIPPED],
                  },
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
          reviewer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          submissionHistory: {
            orderBy: { submissionNumber: 'desc' },
          },
        },
      })

      if (!assignment) {
        throw new Error('Task assignment not found or access denied')
      }

      // Convert BigInt to Number for JSON serialization
      const result = JSON.parse(
        JSON.stringify(assignment, (key, value) =>
          typeof value === 'bigint' ? Number(value) : value,
        ),
      )

      return result
    } catch (error) {
      logger.error('SERVICE', 'Error getting task assignment', {
        error,
        assignmentId,
        userId,
      })
      throw error
    }
  }

  /**
   * Update task assignment (submit, add note, mark in progress)
   */
  static async updateTaskAssignment(
    assignmentId: string,
    userId: string,
    updates: {
      status?: AssignmentStatus
      annotations?: any
      annotatorNote?: string
      actualTimeSeconds?: number
    },
  ) {
    try {
      // Verify ownership
      const existing = await prisma.taskAssignment.findFirst({
        where: {
          id: assignmentId,
          annotatorId: userId,
        },
      })

      if (!existing) {
        throw new Error('Task assignment not found or access denied')
      }

      // Validate status transitions
      if (updates.status) {
        const validTransitions: Record<AssignmentStatus, AssignmentStatus[]> = {
          [AssignmentStatus.ASSIGNED]: [
            AssignmentStatus.IN_PROGRESS,
            AssignmentStatus.SKIPPED,
          ],
          [AssignmentStatus.IN_PROGRESS]: [
            AssignmentStatus.SUBMITTED,
            AssignmentStatus.SKIPPED,
          ],
          [AssignmentStatus.SUBMITTED]: [], // Cannot change once submitted
          [AssignmentStatus.REJECTED]: [
            AssignmentStatus.IN_PROGRESS,
            AssignmentStatus.SUBMITTED,
          ],
          [AssignmentStatus.APPROVED]: [], // Final state
          [AssignmentStatus.SKIPPED]: [], // Final state
        }

        const allowedNextStates = validTransitions[existing.status] || []
        if (!allowedNextStates.includes(updates.status)) {
          throw new Error(
            `Invalid status transition: ${existing.status} -> ${updates.status}`,
          )
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        const innerUpdated = await tx.taskAssignment.update({
          where: { id: assignmentId },
          data: {
            ...updates,
            updatedAt: new Date(),
          },
          include: {
            task: {
              include: {
                image: true,
                project: true,
              },
            },
          },
        })

        if (updates.status) {
          const projectId = innerUpdated.task.projectId

          if (
            updates.status === AssignmentStatus.IN_PROGRESS &&
            existing.status === AssignmentStatus.ASSIGNED
          ) {
            // Workload update: task started
            await tx.userWorkload.update({
              where: { userId_projectId: { userId, projectId } },
              data: {
                assignedTasks: { decrement: 1 },
                inProgressTasks: { increment: 1 },
              },
            })
          } else if (updates.status === AssignmentStatus.SUBMITTED) {
            // Workload update: task submitted
            await tx.userWorkload.update({
              where: { userId_projectId: { userId, projectId } },
              data: {
                inProgressTasks: { decrement: 1 },
                pendingReviewTasks: { increment: 1 },
              },
            })
          } else if (updates.status === AssignmentStatus.SKIPPED) {
            // Workload update: task skipped
            if (
              existing.status === AssignmentStatus.ASSIGNED ||
              existing.status === AssignmentStatus.IN_PROGRESS
            ) {
              const field =
                existing.status === AssignmentStatus.ASSIGNED
                  ? 'assignedTasks'
                  : 'inProgressTasks'
              await tx.userWorkload.update({
                where: { userId_projectId: { userId, projectId } },
                data: { [field]: { decrement: 1 } },
              })
            }
          }
        }

        return innerUpdated
      })

      logger.info('SERVICE', 'Task assignment updated', {
        assignmentId,
        userId,
        status: updates.status,
      })

      // Post-Update Logic (Auto Reassign/Reviewer Events) - Outside transaction
      if (updates.status) {
        const projectId = updated.task.projectId
        const taskId = updated.taskId
        const annotatorId = userId

        // Update availability after workload change
        const { UserWorkloadService } =
          await import('./user-workload.service.js')
        await UserWorkloadService.updateAvailabilityStatus(userId, projectId)

        if (updates.status === AssignmentStatus.SUBMITTED) {
          try {
            const { appEvents } = await import('../utils/events.js')
            appEvents.emit('TASK_SUBMITTED_AUTO_REVIEWER', {
              taskId,
              projectId,
              annotatorId,
              assignmentId,
            })
            logger.info(
              'SERVICE',
              'Emitted auto-reviewer event after submission',
              { taskId, assignmentId },
            )
          } catch (reviewerError) {
            logger.error(
              'SERVICE',
              'Failed to emit auto-assign reviewer event',
              { error: reviewerError, assignmentId },
            )
          }
        } else if (updates.status === AssignmentStatus.SKIPPED) {
          const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { assignmentRule: true },
          })
          const rules = project?.assignmentRule
          if (rules?.autoReassignOnSkip) {
            const { appEvents } = await import('../utils/events.js')
            appEvents.emit('TASK_SKIPPED_REASSIGN', {
              taskId,
              projectId,
              excludeUserId: userId,
            })
            logger.info('SERVICE', 'Emitted auto-reassign event after skip', {
              taskId,
              assignmentId,
            })
          }
        }
      }

      // Convert BigInt to Number for JSON serialization
      const result = JSON.parse(
        JSON.stringify(updated, (key, value) =>
          typeof value === 'bigint' ? Number(value) : value,
        ),
      )

      return result
    } catch (error) {
      logger.error('SERVICE', 'Error updating task assignment', {
        error,
        assignmentId,
        userId,
      })
      throw error
    }
  }

  /**
   * Save draft annotations
   */
  static async saveDraft(
    assignmentId: string,
    userId: string,
    draft: {
      annotations?: any
      annotatorNote?: string
      actualTimeSeconds?: number
    },
  ) {
    try {
      const existing = await prisma.taskAssignment.findFirst({
        where: { id: assignmentId, annotatorId: userId },
        include: { task: true },
      })

      if (!existing) {
        throw new Error('Task assignment not found or access denied')
      }

      const invalidStates: AssignmentStatus[] = [
        AssignmentStatus.SUBMITTED,
        AssignmentStatus.APPROVED,
      ]

      if (invalidStates.includes(existing.status)) {
        throw new Error(`Cannot save draft when task is: ${existing.status}`)
      }

      let newStatus = existing.status
      if (existing.status === AssignmentStatus.ASSIGNED) {
        newStatus = AssignmentStatus.IN_PROGRESS
      }

      const updated = await prisma.$transaction(async (tx) => {
        const innerUpdated = await tx.taskAssignment.update({
          where: { id: assignmentId },
          data: {
            status: newStatus,
            ...draft,
            updatedAt: new Date(),
          },
          include: {
            task: {
              include: {
                image: true,
                project: {
                  include: {
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
          },
        })

        // If status changed to IN_PROGRESS, update workload
        if (
          newStatus === AssignmentStatus.IN_PROGRESS &&
          existing.status === AssignmentStatus.ASSIGNED
        ) {
          await tx.userWorkload.update({
            where: {
              userId_projectId: { userId, projectId: existing.task.projectId },
            },
            data: {
              assignedTasks: { decrement: 1 },
              inProgressTasks: { increment: 1 },
            },
          })
        }

        return innerUpdated
      })

      // Update availability outside transaction
      if (
        newStatus === AssignmentStatus.IN_PROGRESS &&
        existing.status === AssignmentStatus.ASSIGNED
      ) {
        const { UserWorkloadService } =
          await import('./user-workload.service.js')
        await UserWorkloadService.updateAvailabilityStatus(
          userId,
          existing.task.projectId,
        )
      }

      if (existing.status === AssignmentStatus.ASSIGNED) {
        const { UserWorkloadService } =
          await import('./user-workload.service.js')
        await UserWorkloadService.taskStarted(userId, existing.task.projectId)
      }

      // Convert BigInt to Number for JSON serialization (if any)
      const result = JSON.parse(
        JSON.stringify(updated, (key, value) =>
          typeof value === 'bigint' ? Number(value) : value,
        ),
      )

      return result
    } catch (error) {
      logger.error('SERVICE', 'Error saving draft', {
        error,
        assignmentId,
        userId,
      })
      throw error
    }
  }
}
