# Specification: Annotator Task Workflow

## 1. Overview
Implement the complete workflow for Annotators to view their assigned projects and tasks. This feature bridges the gap between Manager task assignment and Annotator task execution.

**Core Principle:**
- Annotators see projects they are **members** of (via `project_members` table)
- Annotators see tasks only when **explicitly assigned** (via `task_assignment` table)
- Empty project state: Project appears but with 0 tasks until Manager assigns work

## 2. User Stories

### As an Annotator
- **US-1**: I want to see all projects I've been added to, so I know which projects I'm part of.
- **US-2**: I want to see tasks assigned to me within each project, organized by status (Assigned, Submitted, Rejected).
- **US-3**: I want to see task details (deadline, labels, difficulty, rejection reason if any) before opening the workspace.
- **US-4**: I want to filter and search my tasks by project, status, and deadline urgency.

### As a Manager
- **US-5**: When I add an Annotator to a project, they should immediately see the project in their dashboard.
- **US-6**: When I assign a task to an Annotator, it should appear in their task queue in real-time (via WebSocket).

## 3. Technical Architecture

### 3.1 Database Schema (Existing)

**Relevant Tables:**
```prisma
model ProjectMember {
  id          String      @id @default(uuid())
  projectId   String      @map("project_id")
  userId      String      @map("user_id")
  projectRole ProjectRole @default(ANNOTATOR)
  joinedAt    DateTime    @default(now())

  project     Project     @relation(...)
  user        User        @relation(...)

  @@unique([projectId, userId])
}

model Task {
  id              String     @id @default(uuid())
  projectId       String
  imageId         String?
  status          TaskStatus @default(TODO)
  priority        TaskPriority @default(MEDIUM)
  deadline        DateTime?
  difficultyLevel DifficultyLevel @default(NORMAL)

  assignments     TaskAssignment[]
}

model TaskAssignment {
  id            String           @id @default(uuid())
  taskId        String
  annotatorId   String
  reviewerId    String?
  status        AssignmentStatus @default(ASSIGNED)
  deadline      DateTime?
  annotations   Json?
  annotatorNote String?
  reviewScore   Int?
  reviewComment String?

  task          Task    @relation(...)
  annotator     User    @relation("Annotator", ...)
  reviewer      User?   @relation("Reviewer", ...)
}

enum AssignmentStatus {
  ASSIGNED
  IN_PROGRESS
  SUBMITTED
  UNDER_REVIEW
  APPROVED
  REJECTED
  SKIPPED
}
```

### 3.2 Backend API Endpoints

**New Routes:** `/api/v1/annotator/*`

```typescript
// Get projects where user is a member (as Annotator)
GET /api/v1/annotator/projects
Response: {
  data: Project[],
  meta: { total, page, limit }
}

// Get tasks assigned to the current user
GET /api/v1/annotator/tasks?projectId=xxx&status=ASSIGNED&page=1&limit=20
Response: {
  data: TaskAssignment[], // Include task, project, image details
  meta: { total, page, limit, taskCounts: { assigned, submitted, rejected } }
}

// Get single task assignment details
GET /api/v1/annotator/tasks/:assignmentId
Response: TaskAssignment // Full details with task, image, project

// Update task assignment (submit, add note)
PATCH /api/v1/annotator/tasks/:assignmentId
Body: {
  status?: 'IN_PROGRESS' | 'SUBMITTED',
  annotations?: Json,
  annotatorNote?: string
}
```

### 3.3 WebSocket Events

**Real-time Updates:**
```typescript
// When Manager assigns a task
SystemEventType.TASK_ASSIGNED = 'task:assigned'
Payload: {
  taskAssignmentId: string,
  taskId: string,
  projectId: string,
  projectName: string,
  deadline: Date,
  annotatorId: string
}

// When Manager adds member to project
SystemEventType.PROJECT_MEMBER_ADDED = 'project:member:added'
Payload: {
  projectId: string,
  projectName: string,
  userId: string,
  projectRole: ProjectRole
}
```

## 4. UI Design

### 4.1 Annotator Dashboard (`/annotator`)

**Layout:**
```
┌─────────────────────────────────────────────┐
│ My Tasks                                     │
│ Manage your assigned labeling tasks          │
├─────────────────────────────────────────────┤
│ [All (12)] [Assigned (5)] [Submitted (4)]   │
│ [Rejected (3)]                               │
├─────────────────────────────────────────────┤
│ Filters:                                     │
│ [Project Dropdown] [Priority] [Deadline]    │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐    │
│ │ 🖼️ Task: Medical Scan - Chest X-Ray │    │
│ │ Project: Medical Imaging             │    │
│ │ Labels: [Tumor] [Fracture]          │    │
│ │ Due: Jan 15, 2026 ⚠️ URGENT         │    │
│ │ [Start Labeling →]                  │    │
│ └─────────────────────────────────────┘    │
│                                             │
│ ┌─────────────────────────────────────┐    │
│ │ 🖼️ Task: Brain MRI Scan             │    │
│ │ Status: REJECTED                     │    │
│ │ ❌ Rejection: Bounding box too wide  │    │
│ │ [Fix & Resubmit →]                  │    │
│ └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

**Key Features:**
- **Project Context**: Show project name + labels for each task
- **Deadline Indicators**: Color-coded (green: >3 days, orange: <2 days, red: overdue)
- **Rejection Alerts**: Prominent red banner with reviewer feedback
- **Empty State**: "No tasks assigned yet. Waiting for Manager to assign work."

### 4.2 Task Card Components

**TaskCard Props:**
```typescript
interface TaskCardProps {
  assignment: TaskAssignment & {
    task: Task & { image: Image, project: Project }
  }
  onOpenWorkspace: (assignmentId: string) => void
}
```

## 5. Security & Access Control

### 5.1 Authorization Rules
- **Annotator Role Check**: All `/api/v1/annotator/*` endpoints require `UserRole.ANNOTATOR`
- **Assignment Ownership**: Annotators can only access `TaskAssignment` where `annotatorId === currentUser.id`
- **Project Membership**: Annotators can only view projects where they exist in `project_members`

### 5.2 Query Filters (Backend)
```typescript
// Automatic filtering in service layer
where: {
  annotatorId: currentUser.id, // Always filter by current user
  task: {
    project: {
      members: {
        some: { userId: currentUser.id } // Ensure project membership
      }
    }
  }
}
```

## 6. Success Criteria

### 6.1 Functional Requirements
- [ ] Annotator sees projects immediately after Manager adds them
- [ ] Annotator sees tasks only after Manager assigns them
- [ ] Task status updates (Assigned → In Progress → Submitted) persist correctly
- [ ] Rejection feedback from Reviewer appears clearly
- [ ] WebSocket updates work in real-time (no manual refresh needed)

### 6.2 Performance Requirements
- [ ] Task list loads in < 500ms (with 100+ tasks)
- [ ] WebSocket notification latency < 1 second
- [ ] Pagination supports 1000+ tasks per project

## 7. Future Enhancements (Out of Scope)
- Task filtering by label
- Task difficulty-based sorting
- Estimated time to complete
- Annotator workload balancing metrics
- Batch task acceptance
