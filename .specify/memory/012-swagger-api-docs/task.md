---
description: "Task list for Swagger API Documentation"
---

# Tasks: Swagger API Documentation

**Input**: Design documents from `.specify/memory/012-swagger-api-docs/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by implementation phase for systematic rollout.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Phase 1: Setup & Dependencies

**Purpose**: Install required packages and create base configuration

- [ ] T001 [US1] Install swagger dependencies (`swagger-jsdoc`, `swagger-ui-express`, types)
- [ ] T002 [US1] Create `server/src/config/swagger.config.ts` with OpenAPI 3.0 base config
- [ ] T003 [US1] Create `server/src/docs/swagger.ts` for Swagger initialization
- [ ] T004 [US1] Add `SWAGGER_ENABLED` environment variable to `.env.example`

**Checkpoint**: Swagger dependencies installed and base configuration created.

---

## Phase 2: Schema Definitions (US2)

**Purpose**: Define reusable OpenAPI schemas for all entities

**Goal**: Create type-safe schema definitions that match TypeScript interfaces.

**Independent Test**: Verify schemas are valid OpenAPI 3.0 format.

### Common Schemas

- [ ] T005 [P] [US2] Create `server/src/docs/schemas/common.schemas.ts`
  - [ ] Define `ErrorResponse` schema
  - [ ] Define `PaginationMeta` schema
  - [ ] Define `SuccessResponse` schema

### Domain Schemas

- [ ] T006 [P] [US2] Create `server/src/docs/schemas/auth.schemas.ts`
  - [ ] Define `LoginRequest`, `LoginResponse`
  - [ ] Define `RegisterRequest`, `RegisterResponse`
  - [ ] Define `RefreshTokenRequest`, `RefreshTokenResponse`
  - [ ] Define `UserResponse` schema

- [ ] T007 [P] [US2] Create `server/src/docs/schemas/project.schemas.ts`
  - [ ] Define `Project` schema
  - [ ] Define `CreateProjectRequest`, `UpdateProjectRequest`
  - [ ] Define `ProjectListResponse` with pagination

- [ ] T008 [P] [US2] Create `server/src/docs/schemas/label.schemas.ts`
  - [ ] Define `Label`, `LabelCategory` schemas
  - [ ] Define `CreateLabelRequest`, `UpdateLabelRequest`
  - [ ] Define `ProjectLabel` schema

- [ ] T009 [P] [US2] Create `server/src/docs/schemas/task.schemas.ts`
  - [ ] Define `Task`, `TaskAssignment` schemas
  - [ ] Define `CreateTaskRequest`, `UpdateTaskRequest`
  - [ ] Define `Annotation` schema

**Checkpoint**: All schema definitions created and validated.

---

## Phase 3: Controller Documentation (US1)

**Purpose**: Add JSDoc annotations to all controllers

**Goal**: Document all endpoints with descriptions, parameters, and responses.

**Independent Test**: Verify each endpoint appears in Swagger UI with correct schema.

### Priority 1: Authentication (Critical Path)

- [ ] T010 [US1] [US3] Document `auth.controller.ts`
  - [ ] POST `/api/v1/auth/login` - User login
  - [ ] POST `/api/v1/auth/register` - User registration
  - [ ] POST `/api/v1/auth/refresh` - Refresh token
  - [ ] POST `/api/v1/auth/logout` - User logout
  - [ ] POST `/api/v1/auth/forgot-password` - Request password reset
  - [ ] POST `/api/v1/auth/reset-password` - Reset password
  - [ ] GET `/api/v1/auth/google` - Google OAuth
  - [ ] GET `/api/v1/auth/google/callback` - Google OAuth callback

### Priority 2: Core Resources

- [ ] T011 [P] [US1] Document `project.controller.ts`
  - [ ] GET `/api/v1/projects` - List projects
  - [ ] POST `/api/v1/projects` - Create project
  - [ ] GET `/api/v1/projects/:id` - Get project details
  - [ ] PUT `/api/v1/projects/:id` - Update project
  - [ ] DELETE `/api/v1/projects/:id` - Delete project

- [ ] T012 [P] [US1] Document `label.controller.ts`
  - [ ] GET `/api/v1/labels` - List labels
  - [ ] POST `/api/v1/labels` - Create label
  - [ ] GET `/api/v1/labels/:id` - Get label
  - [ ] PUT `/api/v1/labels/:id` - Update label
  - [ ] DELETE `/api/v1/labels/:id` - Delete label

- [ ] T013 [P] [US1] Document `label-category.controller.ts`
  - [ ] GET `/api/v1/label-categories` - List categories
  - [ ] POST `/api/v1/label-categories` - Create category
  - [ ] PUT `/api/v1/label-categories/:id` - Update category
  - [ ] DELETE `/api/v1/label-categories/:id` - Delete category

- [ ] T014 [P] [US1] Document `project-label.controller.ts`
  - [ ] GET `/api/v1/projects/:projectId/labels` - Get project labels
  - [ ] POST `/api/v1/projects/:projectId/labels` - Add label to project
  - [ ] DELETE `/api/v1/projects/:projectId/labels/:labelId` - Remove label
  - [ ] POST `/api/v1/projects/:projectId/label-requests` - Request label

- [ ] T015 [P] [US1] Document `task.controller.ts`
  - [ ] GET `/api/v1/tasks` - List tasks
  - [ ] POST `/api/v1/tasks` - Create task
  - [ ] GET `/api/v1/tasks/:id` - Get task
  - [ ] PUT `/api/v1/tasks/:id` - Update task
  - [ ] DELETE `/api/v1/tasks/:id` - Delete task

### Priority 3: Additional Features

- [ ] T016 [P] [US1] Document `user.controller.ts`
  - [ ] GET `/api/v1/users/me` - Get current user
  - [ ] PUT `/api/v1/users/me` - Update profile
  - [ ] GET `/api/v1/users` - List users (admin)

- [ ] T017 [P] [US1] Document `admin.controller.ts`
  - [ ] POST `/api/v1/admin/impersonate` - Impersonate user
  - [ ] POST `/api/v1/admin/stop-impersonation` - Stop impersonation
  - [ ] GET `/api/v1/admin/users` - List all users
  - [ ] PUT `/api/v1/admin/users/:id` - Update user
  - [ ] DELETE `/api/v1/admin/users/:id` - Delete user

- [ ] T018 [P] [US1] Document `notification.controller.ts`
  - [ ] GET `/api/v1/notifications` - List notifications
  - [ ] PUT `/api/v1/notifications/:id/read` - Mark as read
  - [ ] PUT `/api/v1/notifications/read-all` - Mark all as read

- [ ] T019 [P] [US1] Document `ai.controller.ts`
  - [ ] POST `/api/v1/ai/chat` - Send chat message
  - [ ] GET `/api/v1/ai/history` - Get chat history

**Checkpoint**: All controllers documented with JSDoc annotations.

---

## Phase 4: Integration & Testing (US1, US3)

**Purpose**: Integrate Swagger into the application and verify functionality

- [ ] T020 [US1] Modify `server/src/index.ts` to mount Swagger UI at `/api-docs`
- [ ] T021 [US1] Add environment-based enable/disable logic for Swagger
- [ ] T022 [US3] Configure JWT Bearer authentication in Swagger UI
- [ ] T023 [US1] Test Swagger UI loads correctly at `/api-docs`
- [ ] T024 [US3] Test "Authorize" button with JWT token
- [ ] T025 [US1] Test "Try it out" for public endpoints
- [ ] T026 [US3] Test "Try it out" for protected endpoints
- [ ] T027 [US1] Verify all endpoints are listed and grouped correctly
- [ ] T028 [US1] Verify production environment has Swagger disabled

**Checkpoint**: Swagger UI fully functional and tested.

---

## Phase 5: Polish & Documentation

**Purpose**: Add examples and improve documentation quality

- [ ] T029 [P] [US2] Add request examples for all POST/PUT endpoints
- [ ] T030 [P] [US2] Add response examples for all endpoints
- [ ] T031 [P] [US2] Add error response examples (400, 401, 403, 404, 500)
- [ ] T032 [US1] Create README section explaining how to use Swagger UI
- [ ] T033 [US1] Document how to add new endpoints to Swagger
- [ ] T034 [US1] Add Swagger URL to project documentation

**Checkpoint**: Documentation is comprehensive and developer-friendly.

---

## Summary

**Total Tasks**: 34
**Estimated Effort**: 2-3 days
**Dependencies**: None (can start immediately)
**Blockers**: None

**Priority Breakdown**:
- **P1 (Critical)**: T001-T010, T020-T022 (Setup + Auth + Integration)
- **P2 (High)**: T011-T015 (Core Resources)
- **P3 (Medium)**: T016-T019, T029-T034 (Additional Features + Polish)
