# Annotator Task Workflow Implementation Plan

## Overview
Implement the Annotator dashboard and task assignment workflow, enabling Annotators to view their assigned projects and tasks with real-time updates.

## Implementation Phases

---

## Phase 1: Backend API Implementation

### 1.1 Create Annotator Service
**File**: `server/src/services/annotator.service.ts` (NEW)

Implement business logic for Annotator task retrieval:

```typescript
export class AnnotatorService {
  /**
   * Get all projects where user is a member
   */
  static async getMyProjects(userId: string) {
    return prisma.project.findMany({
      where: {
        members: {
          some: { userId, projectRole: ProjectRole.ANNOTATOR }
        }
      },
      include: {
        category: true,
        _count: {
          select: {
            tasks: {
              where: {
                assignments: {
                  some: { annotatorId: userId }
                }
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get task assignments for the current user
   */
  static async getMyTasks(userId: string, filters: {
    projectId?: string,
    status?: AssignmentStatus,
    page: number,
    limit: number
  }) {
    // Query task_assignment table with filters
    // Include: task, image, project, labels
  }

  /**
   * Get single task assignment with full details
   */
  static async getTaskAssignment(assignmentId: string, userId: string) {
    // Verify ownership: annotatorId === userId
  }

  /**
   * Update task assignment (submit, add note, mark in progress)
   */
  static async updateTaskAssignment(
    assignmentId: string,
    userId: string,
    updates: UpdateTaskAssignmentDto
  ) {
    // Validate status transitions (ASSIGNED -> IN_PROGRESS -> SUBMITTED)
  }
}
```

### 1.2 Create Annotator Controller
**File**: `server/src/controllers/annotator.controller.ts` (NEW)

```typescript
export class AnnotatorController {
  static async getMyProjects(req: Request, res: Response) {
    const userId = req.user.sub;
    const projects = await AnnotatorService.getMyProjects(userId);
    return res.json(projects);
  }

  static async getMyTasks(req: Request, res: Response) {
    const userId = req.user.sub;
    const { projectId, status, page, limit } = req.query;
    const result = await AnnotatorService.getMyTasks(userId, {
      projectId,
      status,
      page: Number(page) || 1,
      limit: Number(limit) || 20
    });
    return res.json(result);
  }

  static async getTaskAssignment(req: Request, res: Response) {
    const userId = req.user.sub;
    const { assignmentId } = req.params;
    const assignment = await AnnotatorService.getTaskAssignment(assignmentId, userId);
    return res.json(assignment);
  }

  static async updateTaskAssignment(req: Request, res: Response) {
    const userId = req.user.sub;
    const { assignmentId } = req.params;
    const updates = req.body;
    const updated = await AnnotatorService.updateTaskAssignment(assignmentId, userId, updates);
    return res.json(updated);
  }
}
```

### 1.3 Create Annotator Routes
**File**: `server/src/routes/annotator.routes.ts` (NEW)

```typescript
const router = Router();
router.use(authMiddleware);
router.use(requireRole(['ANNOTATOR'])); // Only Annotators

router.get('/projects', AnnotatorController.getMyProjects);
router.get('/tasks', AnnotatorController.getMyTasks);
router.get('/tasks/:assignmentId', AnnotatorController.getTaskAssignment);
router.patch('/tasks/:assignmentId', AnnotatorController.updateTaskAssignment);

export default router;
```

### 1.4 Register Routes
**File**: `server/src/index.ts`

```typescript
import annotatorRoutes from './routes/annotator.routes.js';
app.use('/api/v1/annotator', annotatorRoutes);
```

---

## Phase 2: WebSocket Real-Time Events

### 2.1 Add Event Types
**File**: `server/src/websocket/events/types.ts`

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
  deadline: Date;
  annotatorId: string;
}
```

### 2.2 Trigger Events in Manager Actions
**File**: `server/src/services/task-assignment.service.ts` (or wherever Manager assigns tasks)

```typescript
// After creating task assignment
const { broadcastService } = await import('../websocket/events/broadcast.service.js');

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

### 3.1 Create Annotator API Client
**File**: `client/src/services/annotator.api.ts` (NEW)

```typescript
export interface TaskAssignmentListItem {
  id: string;
  taskId: string;
  status: AssignmentStatus;
  deadline: Date;
  task: {
    id: string;
    imageUrl: string;
    priority: TaskPriority;
    project: {
      id: string;
      name: string;
    };
  };
  annotatorNote?: string;
  reviewComment?: string;
}

export const annotatorApi = {
  getMyProjects: async () => {
    const response = await apiClient.get('/annotator/projects');
    return response.data;
  },

  getMyTasks: async (params?: {
    projectId?: string;
    status?: AssignmentStatus;
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

### 3.2 Update AnnotatorTasks Page
**File**: `client/src/features/annotator/pages/AnnotatorTasks.tsx`

Replace mock data with real API calls:

```typescript
const [tasks, setTasks] = useState<TaskAssignmentListItem[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [selectedProject, setSelectedProject] = useState<string | 'ALL'>('ALL');
const [selectedStatus, setSelectedStatus] = useState<AssignmentStatus | 'ALL'>('ALL');

useEffect(() => {
  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const result = await annotatorApi.getMyTasks({
        projectId: selectedProject === 'ALL' ? undefined : selectedProject,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        page: 1,
        limit: 50
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
}, [selectedProject, selectedStatus]);
```

### 3.3 Add WebSocket Listener
**File**: `client/src/features/annotator/pages/AnnotatorTasks.tsx`

```typescript
useEffect(() => {
  const socket = getSocket();

  socket.on('system:event', (event: SystemEvent) => {
    if (event.type === 'task:assigned') {
      // Refetch tasks or add new task to list
      toast.info(`New task assigned: ${event.data.projectName}`);
      // Optionally refetch or prepend to list
    }
  });

  return () => {
    socket.off('system:event');
  };
}, []);
```

### 3.4 Create Task Card Component
**File**: `client/src/features/annotator/components/TaskCard.tsx` (NEW)

Extract `TaskCard` from `AnnotatorTasks.tsx` into reusable component:

```typescript
interface TaskCardProps {
  assignment: TaskAssignmentListItem;
  onOpenWorkspace: (assignmentId: string) => void;
}

export function TaskCard({ assignment, onOpenWorkspace }: TaskCardProps) {
  const isUrgent = isDeadlineClose(assignment.deadline);
  const isOverdue = isPast(assignment.deadline);

  return (
    <Card>
      {/* Render task details, labels, deadline, rejection reason */}
      <Button onClick={() => onOpenWorkspace(assignment.id)}>
        {assignment.status === 'REJECTED' ? 'Fix & Resubmit' : 'Start Labeling'}
      </Button>
    </Card>
  );
}
```

---

## Phase 4: Testing & Verification

### 4.1 Backend Testing
- [ ] **API Tests**: Test all 4 Annotator endpoints with Postman/Thunder Client
- [ ] **Authorization**: Verify Annotator can't access other users' tasks
- [ ] **Pagination**: Test with 100+ tasks
- [ ] **Filtering**: Test projectId, status, deadline filters

### 4.2 Frontend Testing
- [ ] **Empty State**: Login as Annotator with no tasks → See "No tasks assigned"
- [ ] **Task List**: Verify tasks load correctly with real data
- [ ] **Tabs**: Test "All", "Assigned", "Submitted", "Rejected" filtering
- [ ] **Real-time**: Open 2 browsers (Manager + Annotator) → Manager assigns task → Annotator sees notification

### 4.3 Integration Testing
**Test Scenario:**
1. Manager creates project "Project Alpha"
2. Manager adds Annotator "Alice" to project
3. **Verify**: Alice sees "Project Alpha" in `/annotator/projects` (even with 0 tasks)
4. Manager uploads image and creates task
5. Manager assigns task to Alice
6. **Verify**: Alice sees task in `/annotator/tasks` immediately (via WebSocket)
7. Alice clicks "Start Labeling" → Opens Workspace
8. Alice submits annotation
9. **Verify**: Task status changes to "SUBMITTED"

---

## Phase 5: Documentation

### 5.1 API Documentation
Update Swagger docs (`server/src/docs/swagger.ts`) with new Annotator endpoints.

### 5.2 User Guide
Document Annotator workflow in `docs/user-guide.md`:
- How to view assigned tasks
- How to submit annotations
- How to handle rejected tasks

---

## Security Checklist
- [ ] All endpoints protected by `authMiddleware`
- [ ] `requireRole(['ANNOTATOR'])` applied to all routes
- [ ] Annotators can only query their own `task_assignment` records
- [ ] WebSocket events only sent to intended recipients (not broadcast to all)

## Performance Optimization
- [ ] Index `task_assignment.annotatorId` for fast queries
- [ ] Include only necessary relations (avoid N+1 queries)
- [ ] Implement cursor-based pagination for large task lists
