# Tasks: Cloudinary Implementation for Image Uploads

**Input**: Design documents from `.specify/memory/001-cloudinary-implementation/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md (optional), contracts/ (optional)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Install `cloudinary` SDK in `server/package.json` and run install in `server/`
- [ ] T002 [P] Configure environment variables for Cloudinary in `server/.env` and `server/src/config/env.ts`
- [ ] T003 [P] Create Cloudinary configuration wrapper in `server/src/config/cloudinary.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create database migration to add `publicId`, `format`, `width`, `height` to `Image` table in `server/prisma/schema.prisma`
- [ ] T005 Run migration to update database schema in `server/`
- [ ] T006 Implement `UploadService` skeleton with `uploadImage` method in `server/src/services/image.service.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Manager Uploads Dataset Images (Priority: P1) 🎯 MVP

**Goal**: Enable managers to upload images which are then stored in Cloudinary and referenced in the database.

**Independent Test**: Manager uploads a file via API/UI, response contains valid Cloudinary URL, and DB record exists.

### Implementation for User Story 1

- [ ] T007 [US1] Implement Cloudinary upload logic using streams in `server/src/services/image.service.ts`
- [ ] T008 [US1] Update `ProjectController` to use `ImageService` for handling uploads in `server/src/controllers/project.controller.ts`
- [ ] T009 [US1] Ensure `multer` middleware passes file to controller correctly in `server/src/routes/project.routes.ts`
- [ ] T010 [US1] Update `ProjectService` to save new image metadata fields (publicId, etc) in `server/src/services/project.service.ts`
- [ ] T011 [US1] Add error handling for failed uploads (cleanup) in `server/src/controllers/project.controller.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Annotator Views Image for Labeling (Priority: P2)

**Goal**: Ensure images served to annotators are optimized (format/quality) via Cloudinary.

**Independent Test**: Annotator loads workspace, image URL is a Cloudinary URL, and image loads with optimization params.

### Implementation for User Story 2

- [ ] T012 [US2] Update `ImageService` or `ProjectService` to append transformation params (`f_auto,q_auto`) to URLs on read in `server/src/services/project.service.ts`
- [ ] T013 [US2] Verify `Image` entity sent to frontend includes the full optimization-ready URL in `server/src/controllers/project.controller.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T014 [P] Verify API response types for Image match new schema in `client/src/types/index.ts` (if strictly typed on client)
- [ ] T015 Run manual verification of upload flow with a test image

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable

### Within Each User Story

- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members
