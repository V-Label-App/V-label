# Feature Specification: Label Management System

**Feature Branch**: `feature/label-management-system`  
**Created**: 2026-01-21  
**Status**: Draft  
**Input**: User description: "CRUD for real labels, admin/manager creation, annotator request flow"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Label CRUD & Schema Refactor (Priority: P1)

As a Manager/Admin, I want to create, update, and delete label definitions so that I can reuse labels across projects and maintain consistency.

**Why this priority**: Foundational structural change. Moving from JSONB to relational tables is required before any other feature can be built.

**Independent Test**: Can be fully tested by creating a label via API, checking the database for the new `Labels` table entry, and verifying `Project` relation.

**Acceptance Scenarios**:

1. **Given** an Admin user, **When** they create a label with `is_global=true`, **Then** the label is visible to all projects.
2. **Given** a Manager user, **When** they create a label for Project A, **Then** the label is linked only to Project A.
3. **Given** an existing project with legacy JSON labels, **When** the migration runs, **Then** old labels are converted to new `Labels` and `ProjectLabels` entries.

---

### User Story 2 - Project Label Assignment (Priority: P2)

As a Manager, I want to assign existing labels to my project with custom shortcuts and colors so that I can tailor the annotation experience without duplicating label definitions.

**Why this priority**: Enable projects to use the new label structure.

**Independent Test**: Can be tested by attaching a global label to a project and overriding its color.

**Acceptance Scenarios**:

1. **Given** a global label "Car" (Red), **When** a Manager adds it to Project B with color "Blue", **Then** Project B sees "Car" as Blue, but other projects still see Red.
2. **Given** a project, **When** a Manager removes a label, **Then** that label is no longer available for annotation in that project.

---

### User Story 3 - Annotator Label Request (Priority: P3)

As an Annotator, I want to request a new label when I find an object that doesn't fit existing categories so that the Manager can review and add it.

**Why this priority**: Improves dataset quality and communication loop. Application of the new notification system.

**Independent Test**: Can be tested by an Annotator sending a request and a Manager receiving a notification.

**Acceptance Scenarios**:

1. **Given** an Annotator in Project C, **When** they request label "UFO", **Then** Manager receives a `LABEL_REQUEST` notification.
2. **Given** a Manager receives a request, **When** they approve it, **Then** "UFO" label is created and added to Project C.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store labels in a dedicated `labels` table, separate from projects.
- **FR-002**: System MUST allow `is_global` flag for labels that apply system-wide.
- **FR-003**: System MUST allow Project Managers to link existing labels to their projects via `project_labels`.
- **FR-004**: System MUST allow `project_labels` to override `custom_color` and `hotkey` of the original label.
- **FR-005**: System MUST allow Annotators to submit `LABEL_REQUEST` notifications to project managers.
- **FR-006**: System MUST migrate existing JSONB `label_config` data to the new relational structure.

### Key Entities *(include if feature involves data)*

- **Labels**: Reusable label definition (Name, Default Color, Global Flag).
- **ProjectLabels**: Association between Project and Label, storing context-specific overrides.
- **LabelCategories**: Logical grouping for labels (e.g., Vehicles, Animals).
- **LabelRequest** (Notification): Request event from an annotator.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of existing projects successfully migrated from JSONB to Relational schema.
- **SC-002**: Managers can add a global label to a project in < 5 clicks.
- **SC-003**: Annotators can submit a label request from the annotation workspace immediately.
