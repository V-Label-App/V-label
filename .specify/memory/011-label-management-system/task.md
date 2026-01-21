---
description: "Task list for Label Management System"
---

# Tasks: Label Management System

**Input**: Design documents from `.specify/memory/011-label-management-system/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 [US1] Create migration script for `Label`, `LabelCategory`, `ProjectLabel`, `LabelRequest` tables in `server/prisma/migrations`
- [x] T002 [US1] Update `server/prisma/schema.prisma` with new models

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [US1] Run database migration locally
- [x] T004 [US1] Create migration script to move data from `projects.label_config` (JSONB) to `project_labels` table

**Checkpoint**: Database schema ready and data migrated.

---

## Phase 3: User Story 1 - Label CRUD & Schema Refactor (Priority: P1) 🎯 MVP

**Goal**: Admins/Managers can create and manage labels centrally.

**Independent Test**: Create a label via API, verify it exists in DB.

### Tests for User Story 1 (OPTIONAL) ⚠️

- [ ] T005 [P] [US1] Unit test for `LabelService.createLabel`
- [ ] T006 [P] [US1] Unit test for `LabelService.getLabels`

### Implementation for User Story 1

- [x] T007 [US1] Create `LabelService`, `LabelCategoryService`, `ProjectLabelService` in `server/src/services/label.service.ts` (CRUD)
- [x] T008 [US1] Create `LabelController` in `server/src/controllers/label.controller.ts`
- [x] T009 [US1] Register `label.routes.ts` in `server/src/routes/index.ts`
- [x] T010 [P] [US1] Create `LabelManagement` component in `client/src/components/LabelManagement.tsx`
- [x] T011 [US1] Integrate label API in client (`client/src/services/label.api.ts`)

**Checkpoint**: Global labels can be created and managed.

---

## Phase 4: User Story 2 - Project Label Assignment (Priority: P2)

**Goal**: Projects can use global labels with overrides.

**Independent Test**: Attach label to project, verify override color.

### Tests for User Story 2 (OPTIONAL) ⚠️

- [ ] T012 [P] [US2] Integration test for attaching label to project in `tests/integration/project_labels.test.ts`

### Implementation for User Story 2

- [x] T013 [US2] Implement `addLabelToProject` in `server/src/services/label.service.ts` (ProjectLabelService)
- [ ] T014 [US2] Update `ProjectDetailPage.tsx` Settings tab to use `LabelSelector` with API
- [x] T015 [US2] Create `LabelSelector.tsx` component to fetch global labels + project labels

**Checkpoint**: Projects can attach and use global labels.

---

## Phase 5: User Story 3 - Annotator Label Request (Priority: P3)

**Goal**: Annotators can request new labels.

**Independent Test**: Annotator requests label, Manager gets notification.

### Tests for User Story 3 (OPTIONAL) ⚠️

- [ ] T016 [P] [US3] Test notification trigger for `requestLabel`

### Implementation for User Story 3

- [x] T017 [US3] Implement `LabelRequestService` in `server/src/services/label-request.service.ts`
- [x] T018 [US3] Create `RequestLabelModal` in `client/src/components/RequestLabelModal.tsx`
- [x] T019 [US3] Create `LabelRequestsTab` in `client/src/components/LabelRequestsTab.tsx` for Manager approval/rejection
- [ ] T020 [US3] Add "Request Label" button to `AnnotatorToolbar.tsx`

**Checkpoint**: Annotator request flow complete.

---

## Phase 6: WebSocket Notifications & Templates

**Goal**: Real-time notifications for label events using templates.

### Implementation

- [x] T021 Add `LABEL_CREATED` to `NotificationType` enum in Prisma schema
- [x] T022 Create migration `20260122000000_add_label_created_notification_type`
- [x] T023 Add `LABEL_CREATED` event type in `server/src/websocket/events/types.ts`
- [x] T024 Add `createLabelCreatedNotification` method in `NotificationService`
- [x] T025 Update `LabelService.create()` to broadcast notification to all users
- [x] T026 Add notification templates for label events:
  - `LABEL_REQUESTED` - notify managers when annotator requests label
  - `LABEL_REQUEST_APPROVED` - notify requester when approved
  - `LABEL_REQUEST_REJECTED` - notify requester when rejected
  - `LABEL_CREATED` - notify all users when new label created
- [x] T027 Update `LabelRequestService` to use `NotificationTemplateService.render()`
- [x] T028 Update frontend `useNotifications.ts` to handle `label:created` and `notification:created` events

**Checkpoint**: Real-time notifications working for all label events.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T029 [P] Documentation updates in `docs/`
- [ ] T030 Code cleanup and refactoring
