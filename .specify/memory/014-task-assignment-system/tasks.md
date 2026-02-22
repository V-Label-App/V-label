---
description: "Task list for Task Assignment System implementation"
---

# Tasks: Task Assignment System

**Input**: Design documents from `.specify/memory/014-task-assignment-system/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure for the assignment logic.

- [ ] T001 Create `TaskService` file in `server/src/services/task.service.ts`.
- [ ] T002 Implement helper method `checkReputationRequirements` in `TaskService`.
- [ ] T003 Implement helper method `checkWorkloadLimits` in `TaskService`.
- [ ] T004 Implement helper method `findNextAssignee` in `TaskService` handling `ROUND_ROBIN`, `LEAST_BUSY`, and `RANDOM` strategies.
- [ ] T005 Implement `assignToUser` in `TaskService` to create `TaskAssignment` records.

---

## Phase 2: User Story 1 - Auto-Assign Tasks Upon Image Upload (Priority: P1)

**Goal**: Automatically create a Task and assign it to an Annotator when an image is uploaded.

### Implementation

- [ ] T006 [US1] Implement `createTaskFromImage` in `TaskService`.
- [ ] T007 [US1] Implement `autoAssignTask` for Annotators in `TaskService`.
- [ ] T008 [US1] Update `uploadImage` in `server/src/controllers/project.controller.ts` to call `TaskService.createTaskFromImage` after image creation.
- [ ] T009 [US1] Update `uploadImage` to check `isAutoAssignEnabled` and call `TaskService.autoAssignTask` if true.

---

## Phase 3: User Story 2 - Enforce Annotator Reputation Limits (Priority: P1)

**Goal**: Ensure annotators meet the minimum reputation requirements.

### Implementation

- [ ] T010 [US2] Integrate the `minAnnotatorReputation` check inside the candidate filtering logic of `findNextAssignee` or `autoAssignTask`.

---

## Phase 4: User Story 3 - Auto-Assign Reviewer Upon Task Submission (Priority: P2)

**Goal**: Automatically assign a Reviewer when an Annotator submits a task.

### Implementation

- [ ] T011 [US3] Implement `canAssignReviewer` in `TaskService` to enforce Conflict of Interest (Reviewer != Annotator).
- [ ] T012 [US3] Update `updateTaskAssignment` in `server/src/services/annotator.service.ts`. When status changes to `SUBMITTED`, check `AssignmentRule.autoAssignReviewer`.
- [ ] T013 [US3] If `autoAssignReviewer` is true, trigger `TaskService.autoAssignTask` for role `REVIEWER`.

---

## Phase 5: User Story 4 - Support Multiple Assignment Strategies (Priority: P2)

**Goal**: Implement `ROUND_ROBIN`, `LEAST_BUSY`, and `RANDOM` distribution strategies.

### Implementation

- [ ] T014 [US4] Implement logic for `ROUND_ROBIN` (sort by least recently assigned).
- [ ] T015 [US4] Implement logic for `LEAST_BUSY` (sort by fewest active tasks).
- [ ] T016 [US4] Implement logic for `RANDOM` (random selection from qualified candidates).
