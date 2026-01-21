# Implementation Plan: Label Management System

**Branch**: `feature/label-management-system` | **Date**: 2026-01-21 | **Spec**: [.specify/memory/011-label-management-system/spec.md](file:///Users/mr.triss/FPT University/SWP391/V-label_app/V-label-app/.specify/memory/011-label-management-system/spec.md)
**Input**: Feature specification from `.specify/memory/011-label-management-system/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command.

## Summary

Implement a centralized Label Management System (CRUD) with project-specific overrides, replacing the current JSON-based `label_config`. Enable Annotators to request missing labels. This involves a database migration, new API endpoints, and UI updates for both Managers (Management Page) and Annotators (Request Modal).

## Technical Context

<!--
  ACTION REQUIRED: Project technical details.
-->

**Language/Version**: TypeScript (Node.js 18+ / React 18+)  
**Primary Dependencies**: Express, React, PostgreSQL, Prisma  
**Storage**: PostgreSQL (Dockerized)  
**Testing**: Jest (Backend), Vitest (Frontend)  
**Target Platform**: Web (Vite Client), Server (Node.js Container)  
**Project Type**: Monorepo (Client + Server)  
**Performance Goals**: Migration script must handle existing projects without data loss.  
> [!IMPORTANT]
> **Database Migration**: This change involves migrating data from `projects.label_config` (JSONB) to new relational tables (`labels`, `project_labels`). A migration script is required. **NOTE**: Migration script must handle color selection carefully (no random colors allowed).

> [!WARNING]
> **Strict Validation**: 
> 1. Labels cannot be deleted if they are used in any project (Constraint Violation).
> 2. Label names must be unique system-wide within their context.
> 3. Color is mandatory during creation.
**Constraints**: Zero downtime preferred, but migration may require brief maintenance window.  
**Scale/Scope**: ~100s of labels per project, ~1000s of projects.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates passed: Standard Feature Implementation]

## Project Structure

### Documentation (this feature)

```text
.specify/memory/011-label-management-system/
├── spec.md              # Feature Spec
├── plan.md              # This file
├── tasks.md             # Task Decomposition
├── research.md          # (Skipped - Known Domain)
└── data-model.md        # DB Schema changes (implicitly in spec/plan)
```

### Source Code (V-label App)
<!--
  ACTION REQUIRED: specific files to be created or modified.
-->

```text
server/
├── prisma/
│   └── schema.prisma        # [MODIFY] Add Label, ProjectLabel models
├── src/
│   ├── controllers/
│   │   ├── label.controller.ts        # [NEW] CRUD Labels
│   │   └── project-label.controller.ts # [NEW] Attach/Request logic
│   ├── services/
│   │   └── label.service.ts           # [NEW] Business logic
│   └── routes/
│       ├── label.routes.ts            # [NEW]
│       └── index.ts                   # [MODIFY] Register routes

client/
├── src/
│   ├── features/manager/pages/
│   │   ├── LabelManagementPage.tsx    # [NEW] Label CRUD UI
│   │   └── ProjectDetailPage.tsx      # [MODIFY] Settings tab updates
│   ├── features/annotation/components/
│   │   └── AnnotatorToolbar.tsx       # [MODIFY] Request Label button
│   └── components/
│       └── LabelSelector.tsx          # [MODIFY] Support global labels
```

**Structure Decision**: Using new controllers and services to keep Label logic separate from Project logic.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | | |
