# Database Change Log

This folder tracks the history of database schema changes and the reasoning behind them.

## [2024-01-14] 001_Init_Schema

### Reason
- Initial setup of the V-Label application database.
- Transitioning from raw SQL/pg to Prisma ORM for better type safety and migration management.

### Changes
- **Users Table**: Added `role` (ADMIN, MANAGER, REVIEWER, ANNOTATOR), `provider` (LOCAL, GOOGLE), and reputation scoring fields (`reputation_score`, `total_tasks_done`).
- **Projects Table**: Added core project fields including `label_config` (JSON) and `enable_ai_assistance`.
- **Project Members**: Many-to-many relationship handling between Users and Projects.
- **Tasks**: Core unit of work, linked to Projects.
- **Task Assignments**: Detailed tracking of who does what, including `annotator_id`, `reviewer_id`, `status` (ASSIGNED, IN_PROGRESS, SUBMITTED, APPROVED, REJECTED), and JSON `annotations`.

### Design Decisions
- **JSON for Annotations**: Chosen for flexibility to support different label types (bounding box, polygon) without changing schema.
- **Enums**: Used for Roles and Statuses to enforce domain logic at the database level.
- **Reputation System**: Built-in score tracking on the User table to enable future "Gamification" or quality-based assignment logic.

### ⚙️ Backend Implementation Rules (CRITICAL)

This section documents strict validation/business logic rules derived from schema comments (`// BE HANDLE`).

#### 1. User Management
*   **Password Logic**:
    *   If `provider = 'GOOGLE'`: `password_hash` MUST be `NULL`.
    *   If `provider = 'LOCAL'`: `password_hash` MUST be hashed (Bcrypt).
*   **Reputation Score**:
    *   **Read-only** for User.
    *   **Trigger**: Update only when a Reviewer `APPROVES` or `REJECTS` a task.
    *   **Formula**: `NewScore = ((OldScore * Total) + (Approved ? 100 : 0)) / (Total + 1)`

#### 2. Project Management
*   **Label Config**: Stored as JSON. Example format: `[{"id": "car", "color": "red"}, {"id": "person", "color": "blue"}]`.

#### 3. Task & Assignments
*   **Role Validation**:
    *   When assigning a `reviewer_id`, query MUST check: `WHERE role IN ('REVIEWER', 'MANAGER', 'ADMIN')`.
    *   **Constraint**: `ANNOTATOR` role CANNOT be a reviewer.
*   **Status Workflow**:
    *   **Consensus Logic**: If Project requires consensus, Task `status` is `DONE` ONLY when ALL assignments are `APPROVED`.
    *   **Auto-save**: While drawing -> update `annotations` + status `IN_PROGRESS`.
    *   **Submit**: User clicks Submit -> status `SUBMITTED`.
*   **Cronjob**:
    *   Scan nightly. If `deadline < now()` AND `status != SUBMITTED` -> Send notification or mark as `OVERDUE`.
*   **Review Logic**:
    *   If `status = REJECTED`: `review_comment` is **MANDATORY** (Not Null).
    *   `annotator_note`: Display prominently to Reviewer context.
