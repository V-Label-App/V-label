# Tasks: Annotator Task Workflow

## Phase 1: Backend API Implementation

### 1.1 Service Layer
- [ ] Create `server/src/services/annotator.service.ts`
    - [ ] Implement `getMyProjects(userId)` - Returns projects where user is member
    - [ ] Implement `getMyTasks(userId, filters)` - Returns task assignments with pagination
    - [ ] Implement `getTaskAssignment(assignmentId, userId)` - Returns single assignment details
    - [ ] Implement `updateTaskAssignment(assignmentId, userId, updates)` - Updates status/annotations
    - [ ] Add proper error handling and validation

### 1.2 Controller Layer
- [ ] Create `server/src/controllers/annotator.controller.ts`
    - [ ] Implement `getMyProjects` handler
    - [ ] Implement `getMyTasks` handler with query parsing
    - [ ] Implement `getTaskAssignment` handler
    - [ ] Implement `updateTaskAssignment` handler
    - [ ] Add Zod validation schemas for request bodies

### 1.3 Routes
- [ ] Create `server/src/routes/annotator.routes.ts`
    - [ ] Define `GET /projects` route
    - [ ] Define `GET /tasks` route
    - [ ] Define `GET /tasks/:assignmentId` route
    - [ ] Define `PATCH /tasks/:assignmentId` route
    - [ ] Apply `authMiddleware` and `requireRole(['ANNOTATOR'])`

### 1.4 Integration
- [ ] Register routes in `server/src/index.ts`
    - [ ] Add `app.use('/api/v1/annotator', annotatorRoutes)`

---

## Phase 2: Real-Time WebSocket Events

### 2.1 Event Definitions
- [ ] Update `server/src/websocket/events/types.ts`
    - [ ] Add `TASK_ASSIGNED` event type
    - [ ] Add `PROJECT_MEMBER_ADDED` event type
    - [ ] Create `TaskAssignedPayload` interface
    - [ ] Create `ProjectMemberAddedPayload` interface

### 2.2 Event Broadcasting
- [ ] Update Manager task assignment logic
    - [ ] Trigger `TASK_ASSIGNED` event after creating assignment
    - [ ] Send notification to specific annotator (not broadcast)
- [ ] Update Manager member management
    - [ ] Trigger `PROJECT_MEMBER_ADDED` event after adding member
    - [ ] Send notification to new member

---

## Phase 3: Frontend API Client

### 3.1 API Client
- [ ] Create `client/src/services/annotator.api.ts`
    - [ ] Define TypeScript interfaces for responses
    - [ ] Implement `getMyProjects()` function
    - [ ] Implement `getMyTasks(params)` function
    - [ ] Implement `getTaskAssignment(id)` function
    - [ ] Implement `updateTaskAssignment(id, updates)` function

---

## Phase 4: Frontend UI Implementation

### 4.1 AnnotatorTasks Page Refactor
- [ ] Update `client/src/features/annotator/pages/AnnotatorTasks.tsx`
    - [ ] Replace mock data with `useState<TaskAssignmentListItem[]>`
    - [ ] Add `useEffect` to fetch tasks on mount
    - [ ] Implement loading state (`isLoading`)
    - [ ] Implement error handling with toast notifications
    - [ ] Add project filter dropdown (fetch from `getMyProjects`)
    - [ ] Add status filter dropdown
    - [ ] Connect filters to API query params

### 4.2 WebSocket Integration
- [ ] Add WebSocket listener in `AnnotatorTasks.tsx`
    - [ ] Listen for `task:assigned` events
    - [ ] Show toast notification when new task assigned
    - [ ] Optionally refetch task list or prepend new task
    - [ ] Listen for `project:member:added` events (if needed)

### 4.3 Component Extraction
- [ ] Create `client/src/features/annotator/components/TaskCard.tsx`
    - [ ] Extract TaskCard component from AnnotatorTasks page
    - [ ] Add proper TypeScript props interface
    - [ ] Implement deadline color coding (green/orange/red)
    - [ ] Display rejection reason prominently if status === 'REJECTED'
    - [ ] Add "Start Labeling" / "Fix & Resubmit" button logic

### 4.4 Empty States
- [ ] Add empty state for "No tasks assigned yet"
- [ ] Add empty state for "No rejected tasks"
- [ ] Add loading skeleton or spinner during API calls

---

## Phase 5: Testing

### 5.1 Backend Testing
- [ ] **Unit Tests**: Test AnnotatorService methods
- [ ] **API Tests**: Use Postman/Thunder Client to test endpoints
    - [ ] Test `GET /annotator/projects` returns only user's projects
    - [ ] Test `GET /annotator/tasks` with various filters
    - [ ] Test `GET /annotator/tasks/:id` returns 403 if not owner
    - [ ] Test `PATCH /annotator/tasks/:id` updates correctly
- [ ] **Authorization Tests**: Verify role-based access control

### 5.2 Frontend Testing
- [ ] **UI Testing**: Manual testing in browser
    - [ ] Login as Annotator with 0 tasks → See empty state
    - [ ] Login as Annotator with tasks → See task list
    - [ ] Test tab switching (All/Assigned/Submitted/Rejected)
    - [ ] Test project filter dropdown
    - [ ] Test task card clicks open workspace

### 5.3 Integration Testing
- [ ] **E2E Workflow**:
    - [ ] Manager creates project
    - [ ] Manager adds Annotator Alice
    - [ ] Alice sees project in `/annotator/projects` (with 0 tasks)
    - [ ] Manager uploads image and creates task
    - [ ] Manager assigns task to Alice
    - [ ] Alice sees task appear in real-time (WebSocket notification)
    - [ ] Alice clicks "Start Labeling" → Workspace opens
    - [ ] Alice submits annotation
    - [ ] Task status updates to "SUBMITTED"
    - [ ] Reviewer rejects task with comment
    - [ ] Alice sees rejection reason in task card

---

## Phase 6: Documentation & Polish

### 6.1 API Documentation
- [ ] Update Swagger docs with new Annotator endpoints
- [ ] Add example request/response payloads
- [ ] Document query parameters and filters

### 6.2 Code Documentation
- [ ] Add JSDoc comments to all service methods
- [ ] Add inline comments for complex business logic
- [ ] Update README with new feature description

### 6.3 UI Polish
- [ ] Add hover effects to task cards
- [ ] Add smooth animations for task list updates
- [ ] Ensure responsive design works on mobile
- [ ] Test accessibility (keyboard navigation, screen readers)

---

## Success Criteria

- [x] Annotator sees projects they are members of
- [x] Annotator sees tasks only after Manager assigns them
- [x] Task list updates in real-time via WebSocket
- [x] Annotator can filter tasks by project and status
- [x] Rejected tasks show clear feedback from Reviewer
- [x] All API endpoints are secured with proper authorization
- [x] No N+1 query performance issues
- [x] Empty states guide users when no data exists
