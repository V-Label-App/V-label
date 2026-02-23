# Development Guide: Annotator Task Workflow

## Overview
This guide provides step-by-step instructions for implementing the Annotator Task Workflow feature. Follow the phases sequentially to ensure proper integration.

---

## Prerequisites

### Required Knowledge
- Prisma ORM (database queries and relations)
- Express.js REST API development
- React with TypeScript
- WebSocket (Socket.io) basics
- PostgreSQL

### Database State
Ensure the following tables exist and are migrated:
- `project_members` (with `projectRole` field)
- `tasks`
- `task_assignment` (with `annotatorId`, `status`, `annotations` fields)

---

## Phase 1: Backend Implementation

### Step 1.1: Create Annotator Service

Create file: `server/src/services/annotator.service.ts`

```typescript
import { prisma } from '../utils/database.js';
import { ProjectRole, AssignmentStatus } from '@prisma/client';

export class AnnotatorService {
  /**
   * Get all projects where the user is a member as Annotator
   */
  static async getMyProjects(userId: string) {
    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId,
            projectRole: ProjectRole.ANNOTATOR
          }
        }
      },
      include: {
        category: true,
        _count: {
          select: {
            // Count only tasks assigned to this user
            tasks: {
              where: {
                assignments: {
                  some: { annotatorId: userId }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return projects;
  }

  /**
   * Get task assignments for the current user with filters
   */
  static async getMyTasks(
    userId: string,
    filters: {
      projectId?: string;
      status?: AssignmentStatus;
      page: number;
      limit: number;
    }
  ) {
    const { projectId, status, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      annotatorId: userId
    };

    if (projectId) {
      where.task = { projectId };
    }

    if (status) {
      where.status = status;
    }

    const [assignments, total] = await Promise.all([
      prisma.taskAssignment.findMany({
        where,
        include: {
          task: {
            include: {
              image: true,
              project: {
                select: {
                  id: true,
                  name: true,
                  labelConfig: true
                }
              }
            }
          }
        },
        orderBy: [
          { status: 'asc' }, // ASSIGNED first
          { deadline: 'asc' } // Urgent tasks first
        ],
        skip,
        take: limit
      }),
      prisma.taskAssignment.count({ where })
    ]);

    // Calculate task counts by status
    const statusCounts = await prisma.taskAssignment.groupBy({
      by: ['status'],
      where: { annotatorId: userId },
      _count: true
    });

    const taskCounts = {
      assigned: statusCounts.find(s => s.status === AssignmentStatus.ASSIGNED)?._count || 0,
      submitted: statusCounts.find(s => s.status === AssignmentStatus.SUBMITTED)?._count || 0,
      rejected: statusCounts.find(s => s.status === AssignmentStatus.REJECTED)?._count || 0,
      total
    };

    return {
      data: assignments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        taskCounts
      }
    };
  }

  /**
   * Get single task assignment with full details
   */
  static async getTaskAssignment(assignmentId: string, userId: string) {
    const assignment = await prisma.taskAssignment.findFirst({
      where: {
        id: assignmentId,
        annotatorId: userId // Ensure ownership
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
                        category: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        reviewer: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    if (!assignment) {
      throw new Error('Task assignment not found or access denied');
    }

    return assignment;
  }

  /**
   * Update task assignment (submit, add note, mark in progress)
   */
  static async updateTaskAssignment(
    assignmentId: string,
    userId: string,
    updates: {
      status?: AssignmentStatus;
      annotations?: any;
      annotatorNote?: string;
    }
  ) {
    // Verify ownership
    const existing = await prisma.taskAssignment.findFirst({
      where: {
        id: assignmentId,
        annotatorId: userId
      }
    });

    if (!existing) {
      throw new Error('Task assignment not found or access denied');
    }

    // Validate status transitions
    if (updates.status) {
      const validTransitions: Record<AssignmentStatus, AssignmentStatus[]> = {
        [AssignmentStatus.ASSIGNED]: [AssignmentStatus.IN_PROGRESS, AssignmentStatus.SKIPPED],
        [AssignmentStatus.IN_PROGRESS]: [AssignmentStatus.SUBMITTED, AssignmentStatus.SKIPPED],
        [AssignmentStatus.SUBMITTED]: [], // Cannot change once submitted
        [AssignmentStatus.REJECTED]: [AssignmentStatus.IN_PROGRESS, AssignmentStatus.SUBMITTED],
        [AssignmentStatus.APPROVED]: [], // Final state
        [AssignmentStatus.SKIPPED]: [AssignmentStatus.IN_PROGRESS],
        [AssignmentStatus.UNDER_REVIEW]: []
      };

      const allowedNextStates = validTransitions[existing.status] || [];
      if (!allowedNextStates.includes(updates.status)) {
        throw new Error(`Invalid status transition: ${existing.status} -> ${updates.status}`);
      }
    }

    const updated = await prisma.taskAssignment.update({
      where: { id: assignmentId },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: {
        task: {
          include: {
            image: true,
            project: true
          }
        }
      }
    });

    return updated;
  }
}
```

**Key Implementation Details:**
- `getMyProjects`: Uses `_count` to show task count per project
- `getMyTasks`: Includes complex filtering with proper SQL joins
- `getTaskAssignment`: Enforces ownership check (`annotatorId === userId`)
- `updateTaskAssignment`: Validates state machine transitions

---

### Step 1.2: Create Annotator Controller

Create file: `server/src/controllers/annotator.controller.ts`

```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import { AnnotatorService } from '../services/annotator.service.js';
import { AssignmentStatus } from '@prisma/client';
import logger from '../utils/logger.js';

// Validation Schema
const updateAssignmentSchema = z.object({
  status: z.nativeEnum(AssignmentStatus).optional(),
  annotations: z.any().optional(),
  annotatorNote: z.string().max(1000).optional()
});

export class AnnotatorController {
  /**
   * GET /api/v1/annotator/projects
   */
  static async getMyProjects(req: Request, res: Response) {
    try {
      const userId = (req as any).user.sub || (req as any).user.id;
      const projects = await AnnotatorService.getMyProjects(userId);
      return res.json(projects);
    } catch (error) {
      logger.error('API', 'Get annotator projects failed', { error });
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }

  /**
   * GET /api/v1/annotator/tasks
   */
  static async getMyTasks(req: Request, res: Response) {
    try {
      const userId = (req as any).user.sub || (req as any).user.id;
      const projectId = req.query.projectId as string | undefined;
      const status = req.query.status as AssignmentStatus | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await AnnotatorService.getMyTasks(userId, {
        projectId,
        status,
        page,
        limit
      });

      return res.json(result);
    } catch (error) {
      logger.error('API', 'Get annotator tasks failed', { error });
      return res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  }

  /**
   * GET /api/v1/annotator/tasks/:assignmentId
   */
  static async getTaskAssignment(req: Request, res: Response) {
    try {
      const userId = (req as any).user.sub || (req as any).user.id;
      const { assignmentId } = req.params;

      const assignment = await AnnotatorService.getTaskAssignment(assignmentId, userId);
      return res.json(assignment);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found') || message.includes('access denied')) {
        return res.status(404).json({ error: 'Task assignment not found' });
      }
      logger.error('API', 'Get task assignment failed', { error });
      return res.status(500).json({ error: 'Failed to fetch task assignment' });
    }
  }

  /**
   * PATCH /api/v1/annotator/tasks/:assignmentId
   */
  static async updateTaskAssignment(req: Request, res: Response) {
    try {
      const userId = (req as any).user.sub || (req as any).user.id;
      const { assignmentId } = req.params;
      const validatedData = updateAssignmentSchema.parse(req.body);

      const updated = await AnnotatorService.updateTaskAssignment(
        assignmentId,
        userId,
        validatedData
      );

      logger.info('API', `Task assignment updated: ${assignmentId}`, { userId });
      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('not found') || message.includes('access denied')) {
        return res.status(404).json({ error: 'Task assignment not found' });
      }
      if (message.includes('Invalid status transition')) {
        return res.status(400).json({ error: message });
      }

      logger.error('API', 'Update task assignment failed', { error });
      return res.status(500).json({ error: 'Failed to update task assignment' });
    }
  }
}
```

---

### Step 1.3: Create Routes

Create file: `server/src/routes/annotator.routes.ts`

```typescript
import { Router } from 'express';
import { AnnotatorController } from '../controllers/annotator.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/role.middleware.js';

const router = Router();

// All routes require authentication AND Annotator role
router.use(authMiddleware);
router.use(requireRole(['ANNOTATOR']));

// Get my projects
router.get('/projects', AnnotatorController.getMyProjects);

// Get my tasks with filters
router.get('/tasks', AnnotatorController.getMyTasks);

// Get single task assignment
router.get('/tasks/:assignmentId', AnnotatorController.getTaskAssignment);

// Update task assignment (submit, add note, etc.)
router.patch('/tasks/:assignmentId', AnnotatorController.updateTaskAssignment);

export default router;
```

---

### Step 1.4: Register Routes in Main App

Edit: `server/src/index.ts`

```typescript
// Add import
import annotatorRoutes from './routes/annotator.routes.js';

// Register route (after other API routes)
app.use('/api/v1/annotator', annotatorRoutes);
```

---

## Phase 2: WebSocket Events (Optional Enhancement)

### Step 2.1: Add Event Types

Edit: `server/src/websocket/events/types.ts`

```typescript
export enum SystemEventType {
  // ... existing events
  TASK_ASSIGNED = 'task:assigned',
  PROJECT_MEMBER_ADDED = 'project:member:added',
}

export interface TaskAssignedPayload {
  taskAssignmentId: string;
  taskId: string;
  projectId: string;
  projectName: string;
  deadline: Date | null;
  annotatorId: string;
}

export interface ProjectMemberAddedPayload {
  projectId: string;
  projectName: string;
  userId: string;
  projectRole: string;
}
```

### Step 2.2: Broadcast Events

When Manager assigns task (in your task assignment service):

```typescript
// After creating task assignment
const { broadcastService } = await import('../websocket/events/broadcast.service.js');
const { SystemEventType } = await import('../websocket/events/types.js');

broadcastService.broadcastToUser(
  annotatorId,
  SystemEventType.TASK_ASSIGNED,
  {
    taskAssignmentId: assignment.id,
    taskId: task.id,
    projectId: project.id,
    projectName: project.name,
    deadline: assignment.deadline,
    annotatorId
  }
);
```

---

## Phase 3: Frontend Implementation

### Step 3.1: Create API Client

Create file: `client/src/services/annotator.api.ts`

```typescript
import { apiClient } from './auth.api';

export interface TaskAssignmentListItem {
  id: string;
  taskId: string;
  status: string;
  deadline: Date | null;
  annotatorNote?: string;
  reviewComment?: string;
  task: {
    id: string;
    priority: string;
    difficultyLevel: string;
    image: {
      id: string;
      storageUrl: string;
      originalFilename: string;
    };
    project: {
      id: string;
      name: string;
      labelConfig: any[];
    };
  };
}

export const annotatorApi = {
  getMyProjects: async () => {
    const response = await apiClient.get('/annotator/projects');
    return response.data;
  },

  getMyTasks: async (params?: {
    projectId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/annotator/tasks', { params });
    return response.data;
  },

  getTaskAssignment: async (assignmentId: string) => {
    const response = await apiClient.get(`/annotator/tasks/${assignmentId}`);
    return response.data;
  },

  updateTaskAssignment: async (assignmentId: string, updates: any) => {
    const response = await apiClient.patch(`/annotator/tasks/${assignmentId}`, updates);
    return response.data;
  }
};
```

---

### Step 3.2: Update AnnotatorTasks Page

Edit: `client/src/features/annotator/pages/AnnotatorTasks.tsx`

Replace mock data with real API:

```typescript
import { useState, useEffect } from 'react';
import { annotatorApi, TaskAssignmentListItem } from '../../../services/annotator.api';
import { toast } from 'sonner';

export function AnnotatorTasks({ onOpenWorkspace }: AnnotatorTasksProps) {
  const [tasks, setTasks] = useState<TaskAssignmentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  useEffect(() => {
    const fetchTasks = async () => {
      setIsLoading(true);
      try {
        const result = await annotatorApi.getMyTasks({
          status: selectedStatus === 'ALL' ? undefined : selectedStatus,
          page: 1,
          limit: 100
        });
        setTasks(result.data);
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
        toast.error('Failed to load tasks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [selectedStatus]);

  // Filter by status for tabs
  const assignedTasks = tasks.filter(t => t.status === 'ASSIGNED');
  const submittedTasks = tasks.filter(t => t.status === 'SUBMITTED');
  const rejectedTasks = tasks.filter(t => t.status === 'REJECTED');

  // Render loading state
  if (isLoading) {
    return <div>Loading tasks...</div>;
  }

  // Rest of component (TaskCard rendering, etc.)
}
```

---

## Testing Checklist

### Backend Tests
- [ ] Test `GET /annotator/projects` returns only user's projects
- [ ] Test `GET /annotator/tasks` filters correctly by projectId
- [ ] Test `GET /annotator/tasks` filters correctly by status
- [ ] Test `GET /annotator/tasks/:id` returns 404 if not owner
- [ ] Test `PATCH /annotator/tasks/:id` validates status transitions
- [ ] Test authorization: MANAGER cannot access annotator endpoints

### Frontend Tests
- [ ] Empty state: "No tasks assigned yet" displays correctly
- [ ] Task list renders with real data
- [ ] Tabs switch correctly (All/Assigned/Submitted/Rejected)
- [ ] Deadline colors work (green/orange/red)
- [ ] Rejection reason displays prominently

### Integration Tests
- [ ] Manager adds Annotator → Annotator sees project (with 0 tasks)
- [ ] Manager assigns task → Task appears in Annotator's list
- [ ] Annotator submits task → Status updates to SUBMITTED
- [ ] Reviewer rejects task → Rejection reason appears for Annotator

---

## Common Issues & Solutions

### Issue: "annotatorId is not unique"
**Solution**: Task assignments should have one annotator per task. Use `findFirst` instead of `findUnique` when querying by annotatorId.

### Issue: N+1 Query Performance
**Solution**: Always use `include` in Prisma queries to fetch related data in one query.

### Issue: WebSocket events not received
**Solution**: Verify `broadcastToUser` uses correct userId format (UUID, not email).

---

## Next Steps
Once implementation is complete:
1. Update Swagger API docs
2. Add unit tests for AnnotatorService
3. Create user guide documentation
4. Plan next feature: Task Auto-Assignment Engine
