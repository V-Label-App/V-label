import { prisma } from '../utils/database.js';
import { ProjectRole, AssignmentStatus, AssignmentMethod, TaskPriority, DifficultyLevel } from '@prisma/client';
import logger from '../utils/logger.js';

interface AssignmentRule {
    isAutoAssignEnabled: boolean;
    assignmentStrategy: string;
    autoAssignReviewer: boolean;
    reviewerAssignmentStrategy: string;
    reviewerDelayHours: number;
    maxTasksPerAnnotator: number;
    maxTasksPerReviewer: number;
    minAnnotatorReputation: number;
    minReviewerReputation: number;
    maxRejectionsBeforeReassign: number;
    autoReassignOnSkip: boolean;
}

export class TaskService {
    /**
     * Helper: Calculate deadline based on task difficulty
     */
    static calculateDeadline(difficultyLevel: DifficultyLevel, role: 'ANNOTATOR' | 'REVIEWER'): Date {
        const now = new Date();
        let hoursToAdd = 48; // Default

        if (role === 'ANNOTATOR') {
            switch (difficultyLevel) {
                case DifficultyLevel.EASY:
                    hoursToAdd = 24; // 1 day
                    break;
                case DifficultyLevel.NORMAL:
                    hoursToAdd = 48; // 2 days
                    break;
                case DifficultyLevel.HARD:
                    hoursToAdd = 72; // 3 days
                    break;
                case DifficultyLevel.EXPERT_ONLY:
                    hoursToAdd = 120; // 5 days
                    break;
            }
        } else {
            // Reviewer gets less time (50% of annotator time)
            switch (difficultyLevel) {
                case DifficultyLevel.EASY:
                    hoursToAdd = 12;
                    break;
                case DifficultyLevel.NORMAL:
                    hoursToAdd = 24;
                    break;
                case DifficultyLevel.HARD:
                    hoursToAdd = 36;
                    break;
                case DifficultyLevel.EXPERT_ONLY:
                    hoursToAdd = 60;
                    break;
            }
        }

        now.setHours(now.getHours() + hoursToAdd);
        return now;
    }

    /**
     * Helper: Check if user meets reputation requirements
     */
    static async checkReputationRequirements(
        userId: string,
        minReputation: number,
        role: 'ANNOTATOR' | 'REVIEWER'
    ): Promise<boolean> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { reputationScore: true }
            });

            if (!user) return false;

            const reputation = user.reputationScore || 0;
            const meetsRequirement = reputation >= minReputation;

            logger.info('TASK_SERVICE', `Reputation check for ${role}`, {
                userId,
                reputation,
                minReputation,
                meetsRequirement
            });

            return meetsRequirement;
        } catch (error) {
            logger.error('TASK_SERVICE', 'Error checking reputation', { error, userId });
            return false;
        }
    }

    /**
     * Helper: Get active task count for a user by role, scoped to a project
     */
    static async getActiveTaskCount(
        userId: string,
        role: 'ANNOTATOR' | 'REVIEWER',
        projectId?: string
    ): Promise<number> {
        const activeStatuses = role === 'REVIEWER'
            // Reviewer active = assigned-to-review (SUBMITTED) + in progress
            ? ['SUBMITTED' as any, 'IN_PROGRESS' as any]
            : ['ASSIGNED' as any, 'IN_PROGRESS' as any];

        if (role === 'ANNOTATOR') {
            return prisma.taskAssignment.count({
                where: {
                    annotatorId: userId,
                    status: { in: activeStatuses },
                    ...(projectId && {
                        task: { projectId }
                    })
                }
            });
        } else {
            return prisma.taskAssignment.count({
                where: {
                    reviewerId: userId,
                    status: { in: activeStatuses },
                    ...(projectId && {
                        task: { projectId }
                    })
                }
            });
        }
    }

    /**
     * Helper: Check if user has reached workload limit (project-scoped)
     */
    static async checkWorkloadLimits(
        userId: string,
        maxTasks: number,
        role: 'ANNOTATOR' | 'REVIEWER',
        projectId?: string
    ): Promise<boolean> {
        try {
            const activeTaskCount = await this.getActiveTaskCount(userId, role, projectId);

            const isUnderLimit = activeTaskCount < maxTasks;

            logger.info('TASK_SERVICE', `Workload check for ${role}`, {
                userId,
                projectId,
                activeTaskCount,
                maxTasks,
                isUnderLimit
            });

            return isUnderLimit;
        } catch (error) {
            logger.error('TASK_SERVICE', 'Error checking workload', { error, userId });
            return false;
        }
    }

    /**
     * Helper: Find next assignee based on strategy
     */
    static async findNextAssignee(
        projectId: string,
        role: ProjectRole,
        strategy: string,
        rules: AssignmentRule,
        excludeUserIds?: string[] // Conflict of Interest: exclude these users from candidates
    ): Promise<string | null> {
        try {
            // Get all project members with the specified role
            const members = await prisma.projectMember.findMany({
                where: {
                    projectId,
                    projectRole: role,
                    // Exclude users for Conflict of Interest or Loop Prevention
                    ...(excludeUserIds && excludeUserIds.length > 0 && {
                        userId: { notIn: excludeUserIds }
                    })
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            reputationScore: true
                        }
                    }
                }
            });

            if (members.length === 0) {
                logger.warn('TASK_SERVICE', `No ${role}s found for project`, { projectId });
                return null;
            }

            // Filter candidates based on reputation and workload
            const minReputation = role === ProjectRole.ANNOTATOR
                ? rules.minAnnotatorReputation
                : rules.minReviewerReputation;

            const maxTasks = role === ProjectRole.ANNOTATOR
                ? rules.maxTasksPerAnnotator
                : rules.maxTasksPerReviewer;

            logger.info('TASK_SERVICE', `[FIND-ASSIGNEE] Checking ${members.length} ${role}(s)`, {
                projectId, minReputation, maxTasks,
                memberIds: members.map(m => m.userId)
            });

            const candidates = [];
            for (const member of members) {
                const meetsReputation = await this.checkReputationRequirements(
                    member.userId,
                    minReputation,
                    role === ProjectRole.ANNOTATOR ? 'ANNOTATOR' : 'REVIEWER'
                );

                const underWorkload = await this.checkWorkloadLimits(
                    member.userId,
                    maxTasks,
                    role === ProjectRole.ANNOTATOR ? 'ANNOTATOR' : 'REVIEWER',
                    projectId
                );

                logger.info('TASK_SERVICE', `[FIND-ASSIGNEE] Member ${member.userId}`, {
                    meetsReputation, underWorkload, eligible: meetsReputation && underWorkload
                });

                if (meetsReputation && underWorkload) {
                    candidates.push(member);
                }
            }

            if (candidates.length === 0) {
                logger.warn('TASK_SERVICE', `[FIND-ASSIGNEE] No eligible ${role}s available`, { projectId });
                return null;
            }

            // Apply assignment strategy
            let selectedUser: string | null = null;

            switch (strategy) {
                case 'ROUND_ROBIN':
                case 'AUTO_ROUND_ROBIN':
                    // Select user who received task least recently
                    const usersWithLastAssignment = await Promise.all(
                        candidates.map(async (candidate) => {
                            const lastAssignment = await prisma.taskAssignment.findFirst({
                                where: role === ProjectRole.ANNOTATOR
                                    ? { annotatorId: candidate.userId }
                                    : { reviewerId: candidate.userId },
                                orderBy: { createdAt: 'desc' },
                                select: { createdAt: true }
                            });

                            return {
                                userId: candidate.userId,
                                lastAssignedAt: lastAssignment?.createdAt || new Date(0)
                            };
                        })
                    );

                    // Sort by oldest assignment first
                    // If timestamps are equal, shuffle to avoid picking the same user in fast loops
                    usersWithLastAssignment.sort((a, b) => {
                        const diff = a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime();
                        if (diff === 0) return Math.random() - 0.5;
                        return diff;
                    });

                    selectedUser = usersWithLastAssignment[0]?.userId || null;
                    break;

                case 'LEAST_BUSY':
                case 'AUTO_LEAST_BUSY':
                    // Select user with fewest active tasks (project-scoped)
                    const usersWithTaskCount = await Promise.all(
                        candidates.map(async (candidate) => {
                            const activeStatuses = role === ProjectRole.REVIEWER
                                ? ['SUBMITTED' as any, 'IN_PROGRESS' as any]
                                : ['ASSIGNED' as any, 'IN_PROGRESS' as any];

                            const userWhere = role === ProjectRole.ANNOTATOR
                                ? { annotatorId: candidate.userId, task: { projectId }, status: { in: activeStatuses } }
                                : { reviewerId: candidate.userId, task: { projectId }, status: { in: activeStatuses } };

                            const count = await prisma.taskAssignment.count({
                                where: userWhere
                            });

                            return { userId: candidate.userId, taskCount: count };
                        })
                    );

                    // Sort by lowest task count first
                    usersWithTaskCount.sort((a, b) => a.taskCount - b.taskCount);
                    selectedUser = usersWithTaskCount[0]?.userId || null;
                    break;

                case 'RANDOM':
                case 'AUTO_RANDOM':
                    // Random selection
                    const randomIndex = Math.floor(Math.random() * candidates.length);
                    selectedUser = candidates[randomIndex]?.userId || null;
                    break;

                default:
                    logger.warn('TASK_SERVICE', `Unknown strategy: ${strategy}, falling back to RANDOM`);
                    const fallbackIndex = Math.floor(Math.random() * candidates.length);
                    selectedUser = candidates[fallbackIndex]?.userId || null;
            }

            logger.info('TASK_SERVICE', `Selected ${role} for assignment`, {
                projectId,
                strategy,
                selectedUser,
                candidateCount: candidates.length
            });

            return selectedUser;
        } catch (error) {
            logger.error('TASK_SERVICE', 'Error finding next assignee', { error, projectId, role });
            return null;
        }
    }

    /**
     * Helper: Create TaskAssignment record
     */
    static async assignToUser(
        taskId: string,
        userId: string,
        role: 'ANNOTATOR' | 'REVIEWER',
        method: AssignmentMethod = AssignmentMethod.AUTO_LEAST_BUSY,
        assignedBy?: string,
        customDeadline?: Date,
        skipActivity?: boolean
    ): Promise<void> {
        try {
            // Get task to determine difficulty level and projectId
            const task = await prisma.task.findUnique({
                where: { id: taskId },
                select: { difficultyLevel: true, projectId: true }
            });

            if (!task) {
                throw new Error('Task not found');
            }

            // Calculate deadline based on difficulty or use custom deadline
            const deadline = customDeadline || this.calculateDeadline(task.difficultyLevel, role);

            let isReassignment = false;
            let oldAssigneeInfo: any = null;

            if (role === 'ANNOTATOR') {
                // History Preservation: Find any existing active assignments for this task
                // Instead of deleting them (which loses history), we mark ASSIGNED/IN_PROGRESS as SKIPPED
                const existingAssignments = await prisma.taskAssignment.findMany({
                    where: {
                        taskId,
                        status: {
                            in: ['ASSIGNED', 'IN_PROGRESS', 'REJECTED', 'REASSIGNING'] as any
                        }
                    },
                    select: { id: true, annotatorId: true, status: true }
                });

                if (existingAssignments.length > 0) {
                    isReassignment = true;
                    const oldAnnotatorIds = [...new Set(existingAssignments.map(a => a.annotatorId).filter(Boolean))];
                    if (oldAnnotatorIds.length > 0) {
                        oldAssigneeInfo = await prisma.user.findUnique({
                            where: { id: oldAnnotatorIds[0] as string },
                            select: { id: true, fullName: true, email: true }
                        });
                    }

                    // 1. Mark REASSIGNING and REJECTED tasks as REASSIGNED
                    const reassignableIds = existingAssignments
                        .filter(a => a.status === 'REASSIGNING' || a.status === 'REJECTED')
                        .map(a => a.id);
                    
                    if (reassignableIds.length > 0) {
                        await prisma.taskAssignment.updateMany({
                            where: { id: { in: reassignableIds } },
                            data: {
                                status: 'REASSIGNED' as any,
                                updatedAt: new Date()
                            }
                        });
                    }

                    // 2. Mark active (ASSIGNED/IN_PROGRESS) tasks as SKIPPED
                    const skippableIds = existingAssignments
                        .filter(a => a.status === 'ASSIGNED' || a.status === 'IN_PROGRESS')
                        .map(a => a.id);

                    if (skippableIds.length > 0) {
                        await prisma.taskAssignment.updateMany({
                            where: { id: { in: skippableIds } },
                            data: {
                                status: 'SKIPPED' as any,
                                updatedAt: new Date()
                            }
                        });
                    }

                    // Recalculate workloads for old annotators (to keep stats in sync)
                    const { UserWorkloadService } = await import('./user-workload.service.js');
                    for (const oldId of oldAnnotatorIds) {
                        try {
                            await UserWorkloadService.recalculateWorkload(oldId, task.projectId);
                        } catch (recalcError) {
                            logger.error('TASK_SERVICE', 'Failed to recalculate workload during reassignment', {
                                error: recalcError, userId: oldId, projectId: task.projectId
                            });
                        }
                    }
                }

                // ANNOTATOR: Create new assignment record
                const data: any = {
                    taskId,
                    annotatorId: userId,
                    status: 'ASSIGNED' as any,
                    assignmentMethod: method,
                    deadline,
                    ...(assignedBy && { assignedBy })
                };

                await prisma.$transaction([
                    prisma.taskAssignment.create({ data }),
                    prisma.task.update({
                        where: { id: taskId },
                        data: {
                            deadline,
                            status: 'IN_PROGRESS'
                        }
                    })
                ]);
            } else {
                // REVIEWER: Update existing SUBMITTED assignment (do NOT create new record)
                // Reason: Reviewer must be added to the same record as the annotator who submitted,
                // creating a new record would lose the annotatorId and violate DB constraints.
                const existingAssignment = await prisma.taskAssignment.findFirst({
                    where: {
                        taskId,
                        status: 'SUBMITTED' as any
                    },
                    orderBy: { updatedAt: 'desc' }
                });

                if (!existingAssignment) {
                    throw new Error(`No submitted assignment found for task ${taskId} to assign reviewer`);
                }

                await prisma.$transaction([
                    prisma.taskAssignment.update({
                        where: { id: existingAssignment.id },
                        data: {
                            reviewerId: userId,
                            // Keep SUBMITTED so annotator still sees correct status.
                            // Reviewer is tracked via reviewerId field, not status.
                            assignmentMethod: method,
                            deadline,
                            ...(assignedBy && { assignedBy })
                        }
                    }),
                    prisma.task.update({
                        where: { id: taskId },
                        data: { deadline }
                    })
                ]);
            }

            // Update user workload (only for ANNOTATOR role)
            if (role === 'ANNOTATOR') {
                const { UserWorkloadService } = await import('./user-workload.service.js');
                await UserWorkloadService.incrementAssignedTasks(userId, task.projectId);
            }

            logger.info('TASK_SERVICE', `Task assigned to ${role} with deadline and workload updated`, {
                taskId,
                userId,
                method,
                deadline: deadline.toISOString()
            });

            // Log activity (skip if called from batch operation)
            if (!skipActivity) {
                try {
                    const { TaskActivityService } = await import('./task-activity.service.js');
                    const { TaskAction } = await import('@prisma/client');

                    // Get user info for metadata
                    const assignedUser = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { fullName: true, email: true }
                    });

                    const actionType = (role === 'ANNOTATOR' && isReassignment) ? (TaskAction as any).REASSIGNED : TaskAction.ASSIGNED;

                    const metadata: any = {
                        targetUserId: userId,
                        targetUserName: assignedUser?.fullName || assignedUser?.email || 'Unknown',
                        deadline: deadline.toISOString(),
                        method: method
                    };

                    if (isReassignment && oldAssigneeInfo) {
                       metadata.oldAssignee = oldAssigneeInfo.fullName || oldAssigneeInfo.email;
                       metadata.oldAssigneeId = oldAssigneeInfo.id;
                    }

                    await TaskActivityService.logActivity({
                        taskId,
                        projectId: task.projectId,
                        userId: assignedBy || userId, // Use assignedBy if manual, otherwise the assigned user
                        action: actionType,
                        metadata
                    });

                    // If it is a reassignment, notify the Manager and the new Annotator.
                    if (role === 'ANNOTATOR' && isReassignment) {
                        const { NotificationService } = await import('./notification.service.js');
                        const { NotificationTemplateService } = await import('./notification.template.service.js');
                        const { broadcastService } = await import('../websocket/events/broadcast.service.js');
                        const { SystemEventType } = await import('../websocket/events/types.js');
                        
                        const taskDetails = await prisma.task.findUnique({
                            where: { id: taskId },
                            include: { project: true, image: true }
                        });
                        
                        if (taskDetails) {
                            const rendered = await NotificationTemplateService.render(
                                'TASK_REASSIGNED' as any,
                                {
                                    taskName: taskDetails.image?.originalFilename || `Task ${taskId.slice(0, 8)}`,
                                    projectName: taskDetails.project.name,
                                    newAnnotatorName: assignedUser?.fullName || assignedUser?.email || 'Unknown',
                                    oldAnnotatorName: metadata.oldAssignee || 'Unknown',
                                    taskId
                                }
                            );
                            
                            if (rendered) {
                                // Notify Project Managers
                                const projectManagers = await prisma.projectMember.findMany({
                                    where: { projectId: task.projectId, projectRole: 'MANAGER' as any },
                                    select: { userId: true }
                                });
                                
                                // Also notify the new annotator
                                const usersToNotify = [...projectManagers.map(m => m.userId), userId];
                                const uniqueUsers = [...new Set(usersToNotify)];
                                
                                for (const notifyUserId of uniqueUsers) {
                                    const notification = await NotificationService.createNotification({
                                        userId: notifyUserId,
                                        type: 'TASK_REASSIGNED' as any,
                                        title: rendered.title,
                                        message: rendered.message,
                                        metadata: {
                                            taskId,
                                            projectId: task.projectId,
                                        }
                                    });
                                    
                                    broadcastService.broadcastToUser(notifyUserId, SystemEventType.NOTIFICATION_CREATED, {
                                        notification: {
                                            id: notification.id,
                                            type: notification.type,
                                            title: notification.title,
                                            message: notification.message,
                                            metadata: notification.metadata,
                                            isRead: notification.isRead,
                                            createdAt: notification.createdAt
                                        }
                                    });
                                }
                            }
                        }
                    }
                } catch (activityError) {
                    logger.error('TASK_SERVICE', 'Failed to log task assignment activity', { error: activityError });
                }
            }
        } catch (error) {
            logger.error('TASK_SERVICE', 'Error creating task assignment', { error, taskId, userId });
            throw error;
        }
    }

    /**
     * Create Task from Image
     */
    static async createTaskFromImage(
        imageId: string,
        projectId: string,
        createdBy?: string,
        skipActivity?: boolean
    ): Promise<string> {
        try {
            const task = await prisma.task.create({
                data: {
                    imageId,
                    projectId,
                    status: 'TODO' as any,
                    priority: TaskPriority.MEDIUM,
                    difficultyLevel: DifficultyLevel.NORMAL
                }
            });

            logger.info('TASK_SERVICE', 'Task created from image', {
                taskId: task.id,
                imageId,
                projectId
            });

            // Log activity (skip if called from batch upload)
            if (createdBy && !skipActivity) {
                try {
                    const { TaskActivityService } = await import('./task-activity.service.js');
                    const { TaskAction } = await import('@prisma/client');

                    await TaskActivityService.logActivity({
                        taskId: task.id,
                        projectId,
                        userId: createdBy,
                        action: TaskAction.CREATED,
                        metadata: {
                            imageId
                        }
                    });
                } catch (activityError) {
                    logger.error('TASK_SERVICE', 'Failed to log task creation activity', { error: activityError });
                }
            }

            return task.id;
        } catch (error) {
            logger.error('TASK_SERVICE', 'Error creating task from image', { error, imageId });
            throw error;
        }
    }

    /**
     * Auto-assign task to Annotator or Reviewer
     */
    static async autoAssignTask(
        taskId: string,
        projectId: string,
        role: 'ANNOTATOR' | 'REVIEWER',
        excludeUserId?: string, // For conflict of interest (reviewer != annotator)
        skipActivity?: boolean, // Skip logging activity (for batch operations)
        forceReassign?: boolean // Bypass isAutoAssignEnabled gate (used when reassigning after max rejections)
    ): Promise<boolean> {
        try {
            // Get project assignment rules
            const project = await prisma.project.findUnique({
                where: { id: projectId },
                include: { assignmentRule: true }
            });

            if (!project || !project.assignmentRule) {
                logger.warn('TASK_SERVICE', 'Project or assignment rules not found', { projectId });
                return false;
            }

            const rules = project.assignmentRule;

            if (!forceReassign) {
                if (role === 'REVIEWER') {
                    // Reviewer assignment has its own toggle, independent of isAutoAssignEnabled
                    if (!rules.autoAssignReviewer) {
                        logger.info('TASK_SERVICE', 'Auto-assign reviewer is disabled for this project', { projectId });
                        return false;
                    }
                } else {
                    if (!rules.isAutoAssignEnabled) {
                        logger.info('TASK_SERVICE', 'Auto-assign is disabled for this project', { projectId });
                        return false;
                    }
                }
            }

            const strategy = role === 'REVIEWER'
                ? (rules.reviewerAssignmentStrategy || rules.assignmentStrategy)
                : rules.assignmentStrategy;

            // Loop Prevention: find all previous annotators for this task to exclude them
            let excludeUserIds: string[] = [];
            if (role === 'ANNOTATOR') {
                const previousAssignments = await prisma.taskAssignment.findMany({
                    where: { taskId },
                    select: { annotatorId: true }
                });
                excludeUserIds = previousAssignments
                    .map(a => a.annotatorId)
                    .filter((id): id is string => !!id);
            }

            // If a specific exclusion was passed (e.g. COI), add it
            if (excludeUserId && !excludeUserIds.includes(excludeUserId)) {
                excludeUserIds.push(excludeUserId);
            }

            // Find next assignee
            const projectRole = role === 'ANNOTATOR' ? ProjectRole.ANNOTATOR : ProjectRole.REVIEWER;
            const selectedUserId = await this.findNextAssignee(
                projectId,
                projectRole,
                strategy,
                rules as AssignmentRule,
                excludeUserIds
            );

            if (!selectedUserId) {
                logger.warn('TASK_SERVICE', `No eligible ${role} found`, { taskId, projectId });
                return false;
            }

            // Create assignment
            const method = strategy === 'ROUND_ROBIN'
                ? AssignmentMethod.AUTO_ROUND_ROBIN
                : strategy === 'LEAST_BUSY'
                    ? AssignmentMethod.AUTO_LEAST_BUSY
                    : AssignmentMethod.AUTO_RANDOM;

            await this.assignToUser(taskId, selectedUserId, role, method, undefined, undefined, skipActivity);

            logger.info('TASK_SERVICE', `Task auto-assigned to ${role}`, {
                taskId,
                userId: selectedUserId,
                strategy: rules.assignmentStrategy
            });

            return true;
        } catch (error) {
            logger.error('TASK_SERVICE', 'Error auto-assigning task', { error, taskId, role });
            return false;
        }
    }

    /**
     * Check if Reviewer can be assigned (Conflict of Interest check)
     */
    static async canAssignReviewer(
        taskId: string,
        reviewerId: string
    ): Promise<boolean> {
        try {
            // Get the annotator who worked on this task
            const assignment = await prisma.taskAssignment.findFirst({
                where: { taskId },
                select: { annotatorId: true }
            });

            if (!assignment) {
                logger.warn('TASK_SERVICE', 'No annotator assignment found for task', { taskId });
                return true; // Allow if no annotator found
            }

            // Check if reviewer is the same as annotator (Conflict of Interest)
            const isConflict = assignment.annotatorId === reviewerId;

            if (isConflict) {
                logger.warn('TASK_SERVICE', 'Conflict of Interest detected', {
                    taskId,
                    annotatorId: assignment.annotatorId,
                    reviewerId
                });
            }

            return !isConflict;
        } catch (error) {
            logger.error('TASK_SERVICE', 'Error checking reviewer assignment', { error, taskId });
            return false;
        }
    }

    /**
     * Bulk auto-assign all orphaned tasks in a project
     */
    static async bulkAutoAssignOrphans(projectId: string) {
        try {
            const { ProjectHealthService } = await import('./project-health.service.js');
            const orphanedTasks = await ProjectHealthService.getOrphanedTasks(projectId);
            const orphanedTaskIds = orphanedTasks.map(t => t.id);

            let successCount = 0;
            let failedCount = 0;

            for (const taskId of orphanedTaskIds) {
                // forceReassign: true bypasses the global toggle because this was explicitly triggered
                const assigned = await this.autoAssignTask(taskId, projectId, 'ANNOTATOR', undefined, false, true);
                if (assigned) successCount++;
                else failedCount++;
            }

            return { successCount, failedCount };
        } catch (error) {
            logger.error('TASK_SERVICE', 'Bulk auto-assign orphans failed', { error });
            throw error;
        }
    }
}

// ==== Event Listeners ====
import { appEvents } from '../utils/events.js';

appEvents.on('TASK_SUBMITTED_AUTO_REVIEWER', async ({ taskId, projectId, annotatorId, assignmentId }) => {
    try {
        logger.info('TASK_SERVICE', '[AUTO-REVIEWER] Event received', { taskId, projectId, annotatorId, assignmentId });

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { assignmentRule: true }
        });

        const delayHours = project?.assignmentRule?.reviewerDelayHours ?? 0;

        if (delayHours > 0) {
            const delayMs = delayHours * 3600 * 1000;
            setTimeout(async () => {
                try {
                    await TaskService.autoAssignTask(taskId, projectId, 'REVIEWER', annotatorId);
                } catch (delayedError) {
                    logger.error('TASK_SERVICE', '[AUTO-REVIEWER] Delayed assignment failed', { error: delayedError, taskId });
                }
            }, delayMs);
        } else {
            await TaskService.autoAssignTask(taskId, projectId, 'REVIEWER', annotatorId);
        }
    } catch (error) {
        logger.error('TASK_SERVICE', '[AUTO-REVIEWER] Event handler failed', { error, taskId, assignmentId });
    }
});

appEvents.on('TASK_SKIPPED_REASSIGN', async ({ taskId, projectId, excludeUserId }) => {
    try {
        await TaskService.autoAssignTask(
            taskId, projectId, 'ANNOTATOR', excludeUserId, false, true
        );
    } catch (error) {
        logger.error('TASK_SERVICE', 'Failed to handle auto-reassign event', { error, taskId, projectId });
    }
});
