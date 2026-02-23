# Implementation Plan: Task Assignment System

**Branch**: `[014-task-assignment-system]` | **Date**: 2026-02-22 | **Spec**: `.specify/memory/014-task-assignment-system/spec.md`
**Input**: Feature specification from `.specify/memory/014-task-assignment-system/spec.md`

## Summary

The goal of this feature is to implement a robust Task Assignment System ("Gatekeeper") that manages the distribution of tasks to Annotators and Reviewers. It will enforce hard constraints (reputation, conflict of interest), respect workload limits, and utilize specific strategies (Round Robin, Least Busy, Random) to assign tasks automatically when images are uploaded or tasks are submitted.

## Technical Context

**Language/Version**: TypeScript (Node.js 18+ / React 18+)  
**Primary Dependencies**: Express, Prisma, PostgreSQL  
**Storage**: PostgreSQL (Dockerized)  
**Testing**: Jest / Supertest (Optional)  
**Target Platform**: Server (Node.js Container)  
**Project Type**: Monorepo (Client + Server)  
**Performance Goals**: Assignments should process quickly without causing race conditions or deadlocks. Transactions must be used to ensure data consistency during task creation and assignment.
**Constraints**: Must seamlessly integrate with the existing `ProjectController` and `AnnotatorService`.
**Scale/Scope**: Moderate. Introduces a new core service (`TaskService`) that sits centrally in the application's workflow.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Logic is contained within the `server/src/services` layer.
- Relies exclusively on Prisma for database transactions.
- Follows the existing error handling patterns.

## Project Structure

### Documentation (this feature)

```text
.specify/memory/014-task-assignment-system/
├── spec.md              # Feature Spec
├── plan.md              # This file
├── tasks.md             # Task Decomposition
```

### Source Code (V-label App)

```text
server/
├── src/
│   ├── services/
│   │   ├── task.service.ts          # [NEW] Core assignment logic
│   │   └── annotator.service.ts     # [MODIFY] Trigger reviewer assignment
│   ├── controllers/
│   │   └── project.controller.ts    # [MODIFY] Trigger task creation on image upload
```

**Structure Decision**: 
The assignment logic is highly reusable and complex, so it resides in its own `TaskService`. This prevents bloating the `ProjectService` or `AnnotatorService`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| No Violations | N/A | N/A |
