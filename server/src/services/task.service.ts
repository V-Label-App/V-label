import { prisma } from '../utils/database.js';
import { ProjectRole, AssignmentStatus, AssignmentMethod, TaskPriority, DifficultyLevel } from '@prisma/client';
import logger from '../utils/logger.js';

interface AssignmentRule {
    isAutoAssignEnabled: boolean;
    assignmentStrategy: string;
    autoAssignReviewer: boolean;
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
     * Helper: Get active task count for a user by role
     */
    static async getActiveTaskCount(
        userId: string,
        role: 'ANNOTATOR' | 'REVIEWER'
    ): Promise<number> {
        const where = role === 'ANNOTATOR'
            ? { annotatorId: userId }
            : { reviewerId: userId };

        return prisma.taskAssignment.count({
            where: {
                ...where,
                status: {
                    in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
                }
            }
        });
    }

    /**
     * Helper: Check if user has reached workload limit
     */
    static async checkWorkloadLimits(
        userId: string,
        maxTasks: number,
        role: 'ANNOTATOR' | 'REVIEWER'
    ): Promise<boolean> {
        try {
            const activeTaskCount = await this.getActiveTaskCount(userId, role);

            const isUnderLimit = activeTaskCount < maxTasks;

            logger.info('TASK_SERVICE', `Workload check for ${role}`, {
                userId,
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
                    role === ProjectRole.ANNOTATOR ? 'ANNOTATOR' : 'REVIEWER'
                );

                if (meetsReputation && underWorkload) {
                    candidates.push(member);
                }
            }

            if (candidates.length === 0) {
                logger.warn('TASK_SERVICE', `No eligible ${role}s available`, { projectId });
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
                    usersWithLastAssignment.sort((a, b) =>
                        a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime()
                    );

                    selectedUser = usersWithLastAssignment[0]?.userId || null;
                    break;

                case 'LEAST_BUSY':
                case 'AUTO_LEAST_BUSY':
                    // Select user with fewest active tasks
                    const usersWithTaskCount = await Promise.all(
                        candidates.map(async (candidate) => {
                            const where = role === ProjectRole.ANNOTATOR
                                ? { annotatorId: candidate.userId }
                                : { reviewerId: candidate.userId };

                            const count = await prisma.taskAssignment.count({
                                where: {
                                    ...where,
                                    status: {
                                        in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
                                    }
                                }
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

            if (role === 'ANNOTATOR') {
                // History Preservation: Find any existing active assignments for this task
                // Instead of deleting them (which loses history), we mark ASSIGNED/IN_PROGRESS as SKIPPED
                const existingAssignments = await prisma.taskAssignment.findMany({
                    where: {
                        taskId,
                        status: {
                            in: [AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS]
                        }
                    },
                    select: { id: true, annotatorId: true }
                });

                if (existingAssignments.length > 0) {
                    const oldAnnotatorIds = [...new Set(existingAssignments.map(a => a.annotatorId))];

                    // Mark active tasks as SKIPPED (REJECTED tasks are already preserved)
                    await prisma.taskAssignment.updateMany({
                        where: {
                            id: { in: existingAssignments.map(a => a.id) }
                        },
                        data: {
                            status: AssignmentStatus.SKIPPED,
                            updatedAt: new Date()
                        }
                    });

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
                    status: AssignmentStatus.ASSIGNED,
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
                        status: AssignmentStatus.SUBMITTED
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
                            status: AssignmentStatus.ASSIGNED,
                            assignmentMethod: method,
                            deadline,
                            ...(assignedBy && { assignedBy })
                        }
                    }),
                    prisma.task.update({
                        where: { id: taskId },
                        data: {
                            deadline,
                            status: 'IN_PROGRESS'
                        }
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

                    await TaskActivityService.logActivity({
                        taskId,
                        projectId: task.projectId,
                        userId: assignedBy || userId, // Use assignedBy if manual, otherwise the assigned user
                        action: TaskAction.ASSIGNED,
                        metadata: {
                            targetUserId: userId,
                            targetUserName: assignedUser?.fullName || assignedUser?.email || 'Unknown',
                            deadline: deadline.toISOString(),
                            method: method
                        }
                    });
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
                    status: 'TODO',
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
            const strategy = rules.assignmentStrategy;

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
}

// ==== Event Listeners ====
import { appEvents } from '../utils/events.js';

appEvents.on('TASK_SUBMITTED_AUTO_REVIEWER', async ({ taskId, projectId, annotatorId, assignmentId }) => {
    try {
        // Check reviewerDelayHours before assigning
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { assignmentRule: true }
        });

        const delayHours = project?.assignmentRule?.reviewerDelayHours ?? 0;

        if (delayHours > 0) {
            const delayMs = delayHours * 3600 * 1000;
            logger.info('TASK_SERVICE', 'Delaying auto-reviewer assignment', {
                taskId, assignmentId, delayHours
            });
            setTimeout(async () => {
                try {
                    await TaskService.autoAssignTask(taskId, projectId, 'REVIEWER', annotatorId);
                    logger.info('TASK_SERVICE', 'Delayed auto-reviewer assignment completed', { taskId, assignmentId });
                } catch (delayedError) {
                    logger.error('TASK_SERVICE', 'Failed delayed auto-reviewer assignment', { error: delayedError, taskId });
                }
            }, delayMs);
        } else {
            await TaskService.autoAssignTask(taskId, projectId, 'REVIEWER', annotatorId);
            logger.info('TASK_SERVICE', 'Handled auto-reviewer event', { taskId, assignmentId });
        }
    } catch (error) {
        logger.error('TASK_SERVICE', 'Failed to handle auto-reviewer event', { error, taskId, assignmentId });
    }
});

appEvents.on('TASK_SKIPPED_REASSIGN', async ({ taskId, projectId, excludeUserId }) => {
    try {
        // forceReassign=true bypasses isAutoAssignEnabled so projects using manual assignment
        // still get automatic reassignment when the max-rejection threshold is exceeded.
        const assigned = await TaskService.autoAssignTask(
            taskId, projectId, 'ANNOTATOR', excludeUserId, false, true
        );
        if (assigned) {
            logger.info('TASK_SERVICE', 'Handled auto-reassign after max rejections', { taskId, projectId, excludeUserId });
        } else {
            logger.warn('TASK_SERVICE', 'Auto-reassign after max rejections failed: no eligible annotator found', { taskId, projectId, excludeUserId });
        }
    } catch (error) {
        logger.error('TASK_SERVICE', 'Failed to handle auto-reassign event', { error, taskId, projectId });
    }
});
