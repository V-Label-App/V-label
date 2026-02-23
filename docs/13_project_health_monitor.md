# Project Health & Rescue Center - Technical Documentation

**Created:** February 5, 2026
**Feature:** Project Health Monitor (Rescue Center)
**Phase:** 13
**Purpose:** Provide managers with a dashboard to identify and resolve stuck, problematic, and orphaned tasks.

---

## 1. Business Logic & Definitions

This feature monitors three specific types of "unhealthy" tasks. The logic is centralized in `ProjectHealthService`.

### 1.1 Stuck Tasks
*   **Definition:** Tasks that have been in progress (`IN_PROGRESS`) for too long without completion.
*   **Threshold:** > 24 Hours since `updatedAt`.
*   **Goal:** Identify annotators who might be struggling or have abandoned the task.
*   **Code Reference:** `ProjectHealthService.getStuckTasks`

### 1.2 Problematic Tasks
*   **Definition:** Tasks that have high rejection rates.
*   **Threshold:** `rejectionCount >= 2` AND status is NOT `APPROVED`.
*   **Goal:** Flag difficult data samples or annotators needing training.
*   **Code Reference:** `ProjectHealthService.getProblematicTasks`

### 1.3 Orphaned Tasks
*   **Definition:** Tasks that are unassigned (`TODO`) but require immediate attention.
*   **Criteria:**
    *   `status` is `TODO`.
    *   `assignments` count is 0.
    *   **Condition:** Deadline is within 24 hours (Critical).
    *   *(Note: Originally intended to check `createdAt > 7 days` but `Task` model currently lacks `createdAt`, so logic is strictly time-based on deadline).*
*   **Code Reference:** `ProjectHealthService.getOrphanedTasks`

---

## 2. Technical Architecture

### 2.1 Backend (Node.js/Express/Prisma)

*   **Service Layer (`server/src/services/project-health.service.ts`)**:
    *   Core logic for database queries.
    *   Example: `getProjectHealthStats(projectId)` aggregates counts and determines overall status (HEALTHY, WARNING, CRITICAL).

*   **Controller Layer (`server/src/controllers/project.controller.ts`)**:
    *   `getHealthStats`: `GET /projects/:id/health`
    *   `getRescueTasks`: `GET /projects/:id/rescue?type=...`

*   **Routes (`server/src/routes/project.routes.ts`)**:
    *   Protected by `authMiddleware` and `requireRole(['MANAGER', 'ADMIN'])`.

### 2.2 Frontend (React/TypeScript)

*   **API Client (`client/src/services/project.api.ts`)**:
    *   Methods: `getHealthStats`, `getRescueTasks`.
    *   Types: `ProjectHealthStats`.

*   **UI Component (`client/src/features/manager/components/ProjectHealthDashboard.tsx`)**:
    *   **Dashboard Cards:** Displays counts for Stuck, Problematic, and Orphaned tasks.
    *   **Traffic Light System:** Visual Healthy/Warning/Critical status.
    *   **Rescue List:** Interactive list detailing specific tasks to be rescued.

*   **Integration (`client/src/features/manager/pages/ProjectDetailPage.tsx`)**:
    *   Integrated as a new Tab: **"Health (Rescue)"**.

---

## 3. Key Files Structure

```
V-label-app/
├── server/
│   ├── src/
│   │   ├── services/
│   │   │   └── project-health.service.ts  <-- CORE LOGIC
│   │   ├── controllers/
│   │   │   └── project.controller.ts      <-- Additions
│   │   └── routes/
│   │       └── project.routes.ts          <-- Additions
├── client/
│   ├── src/
│   │   ├── services/
│   │   │   └── project.api.ts             <-- API Client
│   │   ├── features/manager/
│   │   │   ├── components/
│   │   │   │   └── ProjectHealthDashboard.tsx <-- UI Component
│   │   │   └── pages/
│   │   │       └── ProjectDetailPage.tsx      <-- Tab Integration
└── docs/
    └── 13_project_health_monitor.md       <-- This File
```

---

## 4. Future Improvements / Maintenance

1.  **Auto-Reassign:** currently the "Rescue" button just lists the tasks. Creating an "Auto Reassign" button that moves these tasks to a specific pool or user would be the next logic step.
2.  **Configurable Thresholds:** Move the hardcoded "24 hours" and "2 rejections" into `AssignmentRule` or `SystemConfig` so managers can tune them per project.
3.  **Notifications:** Send system notifications to Managers when Project Health drops to "CRITICAL".
4.  **Database Updates:** Consider adding `createdAt` time to the `Task` model to allow better detection of old "stale" tasks that don't have explicit deadlines.

---

## 5. Troubleshooting Tips

*   **"Orphaned Tasks" always 0:** Check if tasks actually have strict deadlines set. Since `createdAt` is missing, only deadline-based orphans are detected.
*   **"Stuck Tasks" not showing:** Ensure `TaskAssignment` status is exactly `IN_PROGRESS`. `ASSIGNED` tasks (not yet started) are not counted as stuck.
