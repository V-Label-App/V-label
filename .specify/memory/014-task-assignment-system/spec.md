# Feature Specification: Task Assignment System

**Feature Branch**: `[014-task-assignment-system]`  
**Created**: 2026-02-22
**Status**: Draft  
**Input**: User description: "Tôi muốn làm tính năng này. nhưng trước hết bạn hãy xem qua tài liệu này sau đó tôi sẽ yêu cầu tiếp... Màn hình của manager quản lý từng project đã có UI cho phần này... tôi muốn tạo speckit cho tính năng này. hãy xem các mẫu sẵn có và làm theo thật kỹ lưỡng"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Auto-Assign Tasks Upon Image Upload (Priority: P1)

As a Manager, when I upload an image to a project that has `isAutoAssignEnabled` turned on, the system should automatically convert that image into a `Task` and assign it to an available `ANNOTATOR` based on the configured strategy.

**Why this priority**: Automating the distribution of work reduces the manual overhead for managers, ensuring annotators always have a steady stream of tasks when images are uploaded.

**Independent Test**: Can be tested by enabling `isAutoAssignEnabled` on a project, adding 2 annotators, uploading an image, and verifying that a `Task` and `TaskAssignment` (status `ASSIGNED`) are created for one of the annotators.

**Acceptance Scenarios**:

1. **Given** a Project with `isAutoAssignEnabled` = true and `assignmentStrategy` = `ROUND_ROBIN`, **When** the Manager uploads an image, **Then** a `Task` is created, and a `TaskAssignment` is created for the Annotator who received a task least recently.
2. **Given** a Project with `isAutoAssignEnabled` = false, **When** the Manager uploads an image, **Then** a `Task` is created, but NO `TaskAssignment` is generated automatically.
3. **Given** an Annotator has reached `maxTasksPerAnnotator`, **When** the system attempts to auto-assign a new task, **Then** the system skips that Annotator and chooses the next available one.

---

### User Story 2 - Enforce Annotator Reputation Limits (Priority: P1)

As a Gatekeeper (Task Service), before I assign a task to an Annotator, I must ensure their `reputationScore` meets or exceeds the project's `minAnnotatorReputation`.

**Why this priority**: Quality control ensures complex projects are only touched by experienced annotators, protecting the integrity of the data.

**Independent Test**: Can be tested by setting `minAnnotatorReputation` = 50, trying to assign a task to an Annotator with a score of 40, and verifying the assignment is blocked/skipped.

**Acceptance Scenarios**:

1. **Given** a Project with `minAnnotatorReputation` = 50 and Annotator A has a score of 60, **When** the system evaluates available candidates, **Then** Annotator A is included in the candidate pool.
2. **Given** a Project with `minAnnotatorReputation` = 50 and Annotator B has a score of 40, **When** the system evaluates available candidates, **Then** Annotator B is excluded from the candidate pool.

---

### User Story 3 - Auto-Assign Reviewer Upon Task Submission (Priority: P2)

As a Gatekeeper, when an Annotator submits a task, if the project has `autoAssignReviewer` enabled, I must automatically assign the task to an available `REVIEWER`.

**Why this priority**: Automating the review flow ensures tasks don't get stuck in the `SUBMITTED` state, keeping the project moving towards completion without manager intervention.

**Independent Test**: Can be tested tracking a task assignment; when its status changes to `SUBMITTED`, verify that a *new* or updated record assigns it to a `REVIEWER`.

**Acceptance Scenarios**:

1. **Given** a submitted task in a Project with `autoAssignReviewer` = true, **When** the system assigns a reviewer, **Then** the selected reviewer MUST NOT be the same person who originally annotated the task (Conflict of Interest).
2. **Given** a submitted task, **When** the system evaluates Reviewers, **Then** it must respect `maxTasksPerReviewer` and `minReviewerReputation`.

---

### User Story 4 - Support Multiple Assignment Strategies (Priority: P2)

As a Gatekeeper, I must distribute tasks fairly according to the selected strategy (`ROUND_ROBIN`, `LEAST_BUSY`, `RANDOM`).

**Why this priority**: Different projects have different needs for workload distribution (e.g. strict rotation vs. load balancing).

**Independent Test**: Can be tested by mocking out the candidate list and asserting the selected Annotator matches the expected algorithm (e.g., lowest active count for `LEAST_BUSY`).

**Acceptance Scenarios**:

1. **Given** Strategy is `LEAST_BUSY`, **When** choosing between Annotator A (3 active tasks) and Annotator B (1 active task), **Then** Annotator B is selected.
2. **Given** Strategy is `ROUND_ROBIN`, **When** choosing between Annotator A (last task assigned at 10:00) and Annotator B (last task assigned at 11:00), **Then** Annotator A is selected.

### Edge Cases

- What happens when an image is uploaded but ALL annotators have reached their workload limits? -> Task remains unassigned (or added to a global queue).
- What happens when an Annotator submits a task but NO reviewer meets the reputation criteria? -> Task remains `SUBMITTED` but unassigned to a reviewer. Manager must intervene or hire better reviewers.
- How does the system handle concurrent assignment requests to prevent assigning the same task twice? -> Database transactions/locks during the assignment process.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a `Task` entity whenever a new `Image` is uploaded to a Project.
- **FR-002**: System MUST evaluate Hard Rules (Conflict of Interest, Minimum Reputation) before any assignment.
- **FR-003**: System MUST evaluate Soft Rules (maxTasksPerAnnotator, maxTasksPerReviewer) before any assignment.
- **FR-004**: System MUST implement `ROUND_ROBIN`, `LEAST_BUSY`, and `RANDOM` assignment algorithms.
- **FR-005**: System MUST automatically assign a task to an Annotator upon `Image` upload if `isAutoAssignEnabled` is true on the `AssignmentRule`.
- **FR-006**: System MUST automatically assign a task to a Reviewer upon task submission if `autoAssignReviewer` is true on the `AssignmentRule`.
- **FR-007**: System MUST NOT allow an Annotator to review their own annotations.

### Key Entities *(include if feature involves data)*

- **AssignmentRule**: Configuration loaded from DB attached to a `Project`.
- **Task**: The parent record representing the unit of work.
- **TaskAssignment**: Links a `Task` to an `Annotator` and/or `Reviewer`, tracking status (`ASSIGNED`, `IN_PROGRESS`, `SUBMITTED`, etc).
- **UserWorkload**: Model tracking how many tasks a user currently has assigned or in progress.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of images uploaded to auto-assign projects result in an assigned task within 5 seconds (if eligible workers exist).
- **SC-002**: 0 instances of Conflict of Interest (users reviewing their own tasks) after launch.
- **SC-003**: 0 assignments bypass the workload limits (`maxTasksPerAnnotator`, `maxTasksPerReviewer`).
