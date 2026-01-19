# Requirements Documentation

> Comprehensive functional and non-functional requirements for V-Label platform

**Last Updated:** 2026-01-19  
**Version:** 1.0  
**Status:** Requirements Specification

---

## Table of Contents

1. [Document Overview](#document-overview)
2. [Functional Requirements](#functional-requirements)
3. [Non-Functional Requirements](#non-functional-requirements)
4. [User Stories](#user-stories)
5. [Use Cases](#use-cases)
6. [Technical Constraints](#technical-constraints)
7. [Acceptance Criteria](#acceptance-criteria)
8. [Future Requirements](#future-requirements)

---

## Document Overview

### Purpose

This document defines the **complete set of requirements** for the V-Label image annotation platform, including:
- What the system must do (Functional Requirements)
- How the system should perform (Non-Functional Requirements)
- User expectations (User Stories)
- Success metrics (Acceptance Criteria)

### Scope

**In Scope:**
- Web-based image annotation platform
- User management (4 roles: Admin, Manager, Reviewer, Annotator)
- Project and task management
- Annotation tools (bounding box, polygon)
- Review and quality control workflow
- AI-assisted annotation (Google Gemini)
- Real-time notifications (WebSocket)
- Data export (YOLO format)

**Out of Scope (Current Phase):**
- Mobile applications (iOS/Android)
- Video annotation
- 3D/Point cloud annotation
- Model training or inference
- Payment/billing system
- Multi-language UI

---

## Functional Requirements

### FR-1: User Management

#### FR-1.1: User Registration
**Priority:** HIGH  
**Status:** ✅ Implemented

**Requirements:**
- Users can register with email and password
- Email must be unique (no duplicates)
- Password must meet security criteria:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
- System sends verification email (optional for MVP)
- New users default to `ANNOTATOR` role
- `isActive` flag defaults to `false` (requires admin activation)

**Acceptance Criteria:**
- ✅ Registration form validates input client-side
- ✅ Backend validates and hashes password (bcrypt)
- ✅ Duplicate email returns 409 Conflict error
- ✅ User record created in database
- ✅ Success response includes user ID

---

#### FR-1.2: User Login (Email/Password)
**Priority:** HIGH  
**Status:** ✅ Implemented

**Requirements:**
- Users can log in with email and password
- System validates credentials against database
- Successful login returns:
  - Access token (JWT, 15min expiry)
  - Refresh token (HTTP-only cookie, 7 days)
  - User profile data
- Failed login returns appropriate error message
- System logs login attempts (audit trail)

**Acceptance Criteria:**
- ✅ Correct credentials → 200 OK + tokens
- ✅ Incorrect password → 401 Unauthorized
- ✅ Non-existent email → 401 Unauthorized (don't reveal existence)
- ✅ Inactive accounts cannot log in
- ✅ JWT payload includes userId and role

---

#### FR-1.3: Google OAuth Login
**Priority:** MEDIUM  
**Status:** ✅ Implemented

**Requirements:**
- Users can log in via "Sign in with Google" button
- System uses Firebase Authentication for OAuth
- On first login, system creates user account automatically
- Google users don't need password
- Profile data synced (name, email, avatar from Google)

**Acceptance Criteria:**
- ✅ Google popup opens on button click
- ✅ User authenticates with Google
- ✅ System receives ID token from Firebase
- ✅ Backend validates token with Google
- ✅ User created if not exists, or logged in if exists
- ✅ Returns same JWT structure as email/password login

---

#### FR-1.4: Password Reset
**Priority:** MEDIUM  
**Status:** ✅ Implemented

**Requirements:**
- User can request password reset via email
- System generates secure token (32-byte random)
- Token expires after 1 hour
- Reset link sent to user's email
- User clicks link, enters new password
- Token marked as used after successful reset
- Old tokens invalidated on password change

**Acceptance Criteria:**
- ✅ Request sent → email delivered with reset link
- ✅ Link format: `/reset-password?token=xyz`
- ✅ Valid token → password reset form displayed
- ✅ Expired token → error message
- ✅ Used token → error message
- ✅ Password updated → user can log in with new password
- ✅ Audit log records password reset event

---

#### FR-1.5: User Profile Management
**Priority:** MEDIUM  
**Status:** 🔄 Partially Implemented

**Requirements:**
- Users can view their profile:
  - Email, name, avatar, role
  - Reputation score (future)
  - Total tasks completed
  - Join date
- Users can update:
  - Full name
  - Avatar image (upload or URL)
  - Phone number
- Users cannot change:
  - Email (unique identifier)
  - Role (only admin can change)

**Acceptance Criteria:**
- ✅ GET `/api/v1/users/me` returns current user profile
- ⏳ PUT `/api/v1/users/me` updates editable fields
- ⏳ Avatar upload to cloud storage (AWS S3 / Cloudinary)
- ❌ Email change requires verification (future)

---

#### FR-1.6: Admin User Management
**Priority:** HIGH  
**Status:** ✅ Implemented

**Requirements:**
- Admins can view all users (paginated list)
- Admins can filter users by:
  - Role (ADMIN, MANAGER, REVIEWER, ANNOTATOR)
  - Status (active/inactive)
  - Registration date
- Admins can:
  - Change user role
  - Activate/deactivate users
  - View user activity logs
  - Impersonate users (for debugging)
- Admins cannot delete users (soft delete only)

**Acceptance Criteria:**
- ✅ GET `/api/v1/admin/users` with pagination
- ✅ GET `/api/v1/admin/users/:id` for user details
- ✅ PUT `/api/v1/admin/users/:id/role` to change role
- ✅ PUT `/api/v1/admin/users/:id/status` to activate/deactivate
- ✅ POST `/api/v1/admin/impersonate/:id` for impersonation
- ✅ All actions logged in audit_logs table

---

### FR-2: Project Management

#### FR-2.1: Create Project
**Priority:** HIGH  
**Status:** ⏳ In Progress

**Requirements:**
- Managers can create new annotation projects
- Required fields:
  - Project name (max 255 chars)
  - Description (optional, text)
- Optional fields:
  - Deadline (date/time)
  - Enable AI Assistance (checkbox)
- Label configuration:
  - JSON array of allowed labels
  - Each label has: `id`, `name`, `color`, `type` (bbox/polygon)
  - Example: `[{id: "car", name: "Car", color: "#FF0000", type: "bbox"}]`
- Default status: `ACTIVE`
- Creator automatically added as project member

**Acceptance Criteria:**
- ⏳ POST `/api/v1/projects` creates project
- ⏳ Label config validated (JSON schema)
- ⏳ Project ID (UUID) returned
- ⏳ Creator added to `project_members` table
- ⏳ Manager notification: "Project created successfully"

---

#### FR-2.2: Configure Project Settings
**Priority:** HIGH  
**Status:** ⏳ In Progress

**Requirements:**
- Managers can edit project settings:
  - Name, description
  - Deadline
  - Label configuration (add/remove labels)
  - AI assistance toggle
  - Project status (ACTIVE, PAUSED, COMPLETED, ARCHIVED)
- Cannot edit:
  - Project ID
  - Creation date
- Changes logged in audit trail

**Acceptance Criteria:**
- ⏳ PUT `/api/v1/projects/:id` updates project
- ⏳ Validation: Cannot remove labels if already used in annotations
- ⏳ Status change: PAUSED → prevents new task assignments
- ⏳ Status change: ARCHIVED → read-only mode
- ⏳ All project members notified of changes

---

#### FR-2.3: Add/Remove Team Members
**Priority:** HIGH  
**Status:** ⏳ In Progress

**Requirements:**
- Managers can invite users to project:
  - Search users by email or name
  - Select users to add
  - Assign roles within project (Annotator/Reviewer)
- System creates `project_member` record
- Invited users receive notification
- Members can view project details
- Managers can remove members:
  - Removing member doesn't delete their completed work
  - Warning if member has pending tasks

**Acceptance Criteria:**
- ⏳ POST `/api/v1/projects/:id/members` adds user
- ⏳ DELETE `/api/v1/projects/:id/members/:userId` removes user
- ⏳ GET `/api/v1/projects/:id/members` lists all members
- ⏳ Notifications sent to added/removed users
- ⏳ Cannot remove member with pending tasks (or reassign first)

---

#### FR-2.4: Upload Images & Create Tasks
**Priority:** HIGH  
**Status:** ⏳ In Progress

**Requirements:**
- Managers can upload images to project:
  - Batch upload (multiple files)
  - Supported formats: JPG, PNG, WebP
  - Max file size: 10MB per image
  - Images uploaded to cloud storage (S3/Cloudinary)
- System creates one `task` per image
- Task default status: `TODO`
- Image URL stored in database
- Progress counter updated

**Acceptance Criteria:**
- ⏳ POST `/api/v1/projects/:id/tasks/upload` (multipart/form-data)
- ⏳ Images validated (format, size)
- ⏳ Uploaded to cloud storage
- ⏳ Task records created in database
- ⏳ Response includes upload summary (success count, failed list)

---

#### FR-2.5: View Project Dashboard
**Priority:** HIGH  
**Status:** ⏳ In Progress

**Requirements:**
- Managers can view project overview:
  - **Statistics:**
    - Total tasks
    - Tasks by status (TODO, IN_PROGRESS, SUBMITTED, APPROVED, REJECTED)
    - Completion percentage: `(SUBMITTED + APPROVED) / TOTAL * 100`
    - Approval rate: `APPROVED / SUBMITTED * 100`
  - **Team performance:**
    - Annotator productivity (tasks completed)
    - Reviewer activity (tasks reviewed)
  - **Timeline:**
    - Days remaining until deadline
    - Average time per task
  - **Recent activity:**
    - Latest submissions
    - Latest approvals/rejections

**Acceptance Criteria:**
- ⏳ GET `/api/v1/projects/:id/dashboard` returns statistics
- ⏳ Real-time updates via WebSocket (optional)
- ⏳ Charts/graphs on frontend (React Charts library)
- ⏳ Export statistics as CSV

---

### FR-3: Task Assignment

#### FR-3.1: Manual Task Assignment
**Priority:** HIGH  
**Status:** ⏳ In Progress

**Requirements:**
- Managers can assign tasks manually:
  - Select one or more tasks (checkbox)
  - Select annotators from dropdown (project members only)
  - **Minimum 2 annotators per task** (consensus requirement)
  - System validates: annotators must be project members
- System creates `task_assignment` records:
  - One record per (task, annotator) pair
  - Status: `ASSIGNED`
  - Deadline inherited from project or custom
- Annotators receive notifications

**Acceptance Criteria:**
- ⏳ POST `/api/v1/projects/:id/tasks/assign` with payload:
  ```json
  {
    "task_ids": ["task-1", "task-2"],
    "annotator_ids": ["user-a", "user-b", "user-c"]
  }
  ```
- ⏳ Validation: At least 2 annotators per task
- ⏳ Task status: `TODO` → `ASSIGNED`
- ⏳ Notifications sent to assigned annotators
- ⏳ Audit log: "Manager assigned task #123 to [Ann A, Ann B]"

---

#### FR-3.2: Automatic Task Assignment
**Priority:** MEDIUM  
**Status:** ⏳ Planned

**Requirements:**
- Managers can trigger auto-assignment:
  - Click "Auto-Assign" button
  - Select algorithm:
    - **Round-robin** (equal distribution)
    - **Availability-based** (least busy annotators)
    - **Skill-based** (future: use reputation scores)
  - Set annotators per task (default: 2, max: 5)
- System distributes tasks evenly
- Unassigned tasks prioritized

**Acceptance Criteria:**
- ⏳ POST `/api/v1/projects/:id/tasks/auto-assign` with:
  ```json
  {
    "algorithm": "round_robin",
    "annotators_per_task": 2,
    "target_annotators": ["user-a", "user-b", "user-c"]
  }
  ```
- ⏳ Algorithm distributes tasks evenly
- ⏳ Progress bar during assignment
- ⏳ Summary: "Assigned 100 tasks to 3 annotators"

---

#### FR-3.3: Reassign Tasks
**Priority:** MEDIUM  
**Status:** ⏳ Planned

**Requirements:**
- Managers can reassign tasks:
  - Remove current annotator
  - Assign to different annotator
  - Reason: Annotator unavailable, low quality, etc.
- System preserves previous work:
  - Old assignment marked `CANCELLED`
  - Annotations saved (archive)
  - New assignment created
- Original annotator notified

**Acceptance Criteria:**
- ⏳ PUT `/api/v1/tasks/:id/reassign` with new annotator ID
- ⏳ Previous assignment status → `CANCELLED`
- ⏳ New assignment status → `ASSIGNED`
- ⏳ Notifications sent to both annotators
- ⏳ Audit log records reassignment reason

---

### FR-4: Annotation

#### FR-4.1: View Assigned Tasks
**Priority:** HIGH  
**Status:** ⏳ In Progress

**Requirements:**
- Annotators can view list of assigned tasks:
  - Filtered by status (ASSIGNED, IN_PROGRESS, SUBMITTED)
  - Sorted by deadline (urgent first)
  - Display: thumbnail, task ID, deadline, status
- Click task → opens annotation canvas
- Progress indicator: "5/20 tasks completed"

**Acceptance Criteria:**
- ⏳ GET `/api/v1/tasks/my-tasks?status=ASSIGNED`
- ⏳ Pagination (20 tasks per page)
- ⏳ Deadline color coding (red if < 2 hours)
- ⏳ Search/filter by project

---

#### FR-4.2: Annotation Canvas (Bounding Box)
**Priority:** HIGH  
**Status:** ⏳ In Progress

**Requirements:**
- Annotators can draw bounding boxes:
  - **Tool:** Click-and-drag rectangle
  - **Label selection:** Dropdown with allowed labels
  - **Edit:** Resize/move existing boxes
  - **Delete:** Click X to remove box
  - **Keyboard shortcuts:**
    - `1-9`: Quick select labels
    - `Delete`: Remove selected box
    - `Esc`: Deselect
  - **Zoom/Pan:** Mouse wheel + drag
  - **Undo/Redo:** Ctrl+Z / Ctrl+Y
- Canvas built with **Konva.js + React-Konva**
- Annotations stored as JSON:
  ```json
  {
    "objects": [
      {
        "id": "obj-1",
        "label": "car",
        "type": "bbox",
        "coordinates": { "x": 100, "y": 200, "width": 300, "height": 150 },
        "confidence": null
      }
    ]
  }
  ```

**Acceptance Criteria:**
- ⏳ Canvas loads image from cloud storage
- ⏳ Bounding boxes rendered with label colors
- ⏳ Drag-to-create, click-to-select, drag-to-move
- ⏳ Label dropdown shows project label config
- ⏳ Save button → auto-saves to backend every 30s
- ⏳ Annotations persisted in `task_assignments.annotations`

---

#### FR-4.3: Annotation Canvas (Polygon)
**Priority:** MEDIUM  
**Status:** ⏳ Planned

**Requirements:**
- Annotators can draw polygons:
  - **Tool:** Click to add vertices
  - **Close polygon:** Double-click or click first point
  - **Edit:** Drag vertices to adjust
  - **Delete:** Right-click vertex
- Same label selection and shortcuts as bbox
- Polygon data stored as array of points:
  ```json
  {
    "type": "polygon",
    "points": [
      {"x": 100, "y": 200},
      {"x": 150, "y": 250},
      {"x": 120, "y": 300}
    ]
  }
  ```

**Acceptance Criteria:**
- ⏳ Polygon tool button available
- ⏳ Click-to-add-point interface
- ⏳ Visual feedback for polygon closure
- ⏳ Polygon rendered with semi-transparent fill
- ⏳ Vertices editable (drag handles)

---

#### FR-4.4: AI-Assisted Annotation
**Priority:** MEDIUM  
**Status:** ⏳ Partially Implemented

**Requirements:**
- **IF project AI enabled:**
  - Button: "Get AI Suggestions"
  - On click:
    1. Send image to Google Gemini Vision API
    2. AI returns detected objects with confidence scores
    3. System pre-fills canvas with bounding boxes
    4. Boxes labeled as `is_ai_generated: true`
    5. Annotator reviews and corrects:
       - Accept: Click ✓ (keeps box)
       - Reject: Click ✗ (deletes box)
       - Adjust: Drag to resize/move
  - All AI suggestions require human verification
  - Metadata preserved in annotations JSON

**Acceptance Criteria:**
- ⏳ Button visible only if `project.enableAiAssistance === true`
- ⏳ Loading spinner during API call
- ✅ POST `/api/v1/ai/annotate` sends image
- ✅ Gemini returns object detections
- ⏳ Canvas populated with suggested boxes
- ⏳ Green outline for AI-generated (vs blue for manual)
- ⏳ Reviewer can see which annotations were AI-assisted

---

#### FR-4.5: Submit Task for Review
**Priority:** HIGH  
**Status:** ⏳ In Progress

**Requirements:**
- Annotators can submit completed task:
  - Button: "Submit for Review"
  - Validation: At least 1 annotation (cannot submit empty)
  - Optional: Add note for reviewer
  - Confirmation dialog: "Are you sure? You won't be able to edit after submission."
- System updates:
  - `task_assignment.status`: `IN_PROGRESS` → `SUBMITTED`
  - `task_assignment.annotations`: Save final JSON
  - `task.status`: Remains `IN_PROGRESS` until all annotators submit
- Reviewer receives notification
- Annotator cannot edit after submit (unless reviewer hasn't started)

**Acceptance Criteria:**
- ⏳ POST `/api/v1/tasks/:id/submit` with annotations JSON
- ⏳ Validation: At least 1 object annotated
- ⏳ Status updated in database
- ⏳ Notification sent to assigned reviewer
- ⏳ Success message: "Task submitted successfully"
- ⏳ Redirect to task list

---

### FR-5: Review & Quality Control

#### FR-5.1: View Submitted Tasks (Reviewer)
**Priority:** HIGH  
**Status:** ⏳ In Progress

**Requirements:**
- Reviewers can view tasks awaiting review:
  - Filter by:
    - Status (SUBMITTED only)
    - Project
    - Annotator
  - Sort by submission time (oldest first)
  - Display: thumbnail, annotator name, submission time
- Click task → opens review interface

**Acceptance Criteria:**
- ⏳ GET `/api/v1/tasks/review-queue?status=SUBMITTED`
- ⏳ Pagination with infinite scroll
- ⏳ Preview annotations on hover (tooltip)
- ⏳ Urgent tasks highlighted (deadline < 24h)

---

#### FR-5.2: Review Interface
**Priority:** HIGH  
**Status:** ⏳ In Progress

**Requirements:**
- Reviewers can inspect annotations:
  - **View mode:** Same canvas as annotation, read-only
  - **Annotation overlay:** Show bboxes/polygons with labels
  - **AI indicator:** Green outline if AI-generated
  - **Annotator info:** Name, submission time, notes
  - **Side-by-side comparison:** If multiple annotators (consensus)
- **Review actions:**
  - **Approve:**
    - Button: "Approve"
    - Optional: Review score (1-10 slider)
    - Optional: Positive feedback comment
  - **Reject:**
    - Button: "Reject"
    - **Required:** Rejection reason (textarea, min 20 chars)
    - Optional: Review score (1-10)
  - **Re-Annotate:**
    - Button: "Edit Annotations"
    - Opens editable canvas
    - Make corrections directly
    - Auto-approves after save

**Acceptance Criteria:**
- ⏳ Canvas renders annotations in read-only mode
- ⏳ Approve button → confirmation dialog
- ⏳ Reject button → opens feedback modal (required field)
- ⏳ Re-annotate → unlocks canvas for editing
- ⏳ All actions logged in audit trail

---

#### FR-5.3: Approve Task
**Priority:** HIGH  
**Status:** ⏳ In Progress

**Requirements:**
- Reviewer clicks "Approve":
  - System updates:
    - `task_assignment.status`: `SUBMITTED` → `APPROVED`
    - `task_assignment.review_score`: Save score (if provided)
    - `task_assignment.review_comment`: Save comment
    - `task.status`: Check if all assignments approved → `DONE`
    - `user.total_tasks_done`: Increment annotator's count
    - `user.reputation_score`: Increase based on review score (future)
  - Annotator receives notification: "Task approved!"
  - Manager notified if project progress reaches milestones (25%, 50%, 75%, 100%)

**Acceptance Criteria:**
- ⏳ POST `/api/v1/tasks/:id/approve` with optional score/comment
- ⏳ Database transaction updates all related records
- ⏳ Notifications sent (annotator, manager)
- ⏳ Audit log: "Reviewer X approved task Y (score: 9/10)"
- ⏳ Project progress recalculated

---

#### FR-5.4: Reject Task
**Priority:** HIGH  
**Status:** ⏳ In Progress

**Requirements:**
- Reviewer clicks "Reject":
  - **Required input:** Rejection reason (min 20 characters)
  - System updates:
    - `task_assignment.status`: `SUBMITTED` → `REJECTED`
    - `task_assignment.reject_count`: Increment
    - `task_assignment.review_comment`: Save reason
    - Check reject limit:
      - IF `reject_count >= 3` → `status = SKIPPED` (permanent)
      - ELSE → `status = IN_PROGRESS` (rework)
  - Annotator receives notification with feedback
  - Task returns to annotator's queue
  - Reviewer can add suggestions for improvement

**Acceptance Criteria:**
- ⏳ POST `/api/v1/tasks/:id/reject` with `{reason: string}`
- ⏳ Validation: Reason min 20 chars
- ⏳ Reject count incremented
- ⏳ IF reject_count >= 3:
  - ⏳ Status → SKIPPED
  - ⏳ Manager notified: "Task skipped due to quality issues"
  - ⏳ Warning sent to annotator
- ⏳ ELSE: Task back in annotator's queue
- ⏳ Annotator notification includes feedback

---

#### FR-5.5: Re-Annotate (Reviewer Fix)
**Priority:** MEDIUM  
**Status:** ⏳ Planned

**Requirements:**
- Reviewer can edit annotations directly:
  - Button: "Edit Annotations"
  - Opens canvas in edit mode
  - Reviewer makes corrections
  - Saves → Auto-approves task
  - Original annotator not penalized
  - Optional: Annotator can view final version (for learning)

**Acceptance Criteria:**
- ⏳ Button "Edit Annotations" visible in review interface
- ⏳ Canvas switches to edit mode (same tools as annotator)
- ⏳ Save button → POST `/api/v1/tasks/:id/re-annotate`
- ⏳ Status: `SUBMITTED` → `APPROVED`
- ⏳ No reject count increment
- ⏳ Metadata: `corrected_by_reviewer: true`
- ⏳ Annotator notified (optional): "Your task was corrected and approved"

---

### FR-6: Notifications

#### FR-6.1: Real-Time Notifications (WebSocket)
**Priority:** HIGH  
**Status:** ✅ Implemented

**Requirements:**
- System sends notifications via Socket.IO:
  - **User-specific rooms:** `user:{userId}`
  - **Push notifications** for:
    - Task assigned
    - Task approved/rejected
    - Project milestone reached
    - Deadline warnings
  - **Notification payload:**
    ```json
    {
      "id": "notif-123",
      "type": "TASK_ASSIGNED",
      "title": "New task assigned",
      "message": "You have 5 new tasks in Project X",
      "metadata": {
        "project_id": "...",
        "task_count": 5
      },
      "created_at": "2026-01-19T19:00:00Z",
      "is_read": false
    }
    ```
  - Frontend displays notification badge with count
  - Click notification → navigate to related page

**Acceptance Criteria:**
- ✅ WebSocket connection established on login
- ✅ Socket joins user-specific room
- ✅ Emit notifications: `io.to(user:123).emit('new_notification', {...})`
- ✅ Frontend receives and displays notifications
- ✅ Badge counter updates in real-time
- ✅ Notification inbox shows all notifications

---

#### FR-6.2: Notification Inbox
**Priority:** MEDIUM  
**Status:** ✅ Implemented

**Requirements:**
- Users can view notification history:
  - List of all notifications (paginated)
  - Filter by:
    - Read/Unread
    - Type (TASK_ASSIGNED, TASK_APPROVED, etc.)
    - Date range
  - Actions:
    - Mark as read (single or bulk)
    - Delete notification (soft delete)
    - Click to navigate to related item
  - Auto-mark as read when opened

**Acceptance Criteria:**
- ✅ GET `/api/v1/notifications?is_read=false&limit=20`
- ✅ Notification list component with pagination
- ✅ Mark as read: PUT `/api/v1/notifications/:id/read`
- ✅ Mark all as read: PUT `/api/v1/notifications/read-all`
- ✅ Delete: DELETE `/api/v1/notifications/:id`
- ✅ Click notification → navigate to related page

---

#### FR-6.3: Email Notifications (Optional)
**Priority:** LOW  
**Status:** ✅ Partially Implemented

**Requirements:**
- System sends email for critical events:
  - Welcome email (registration)
  - Password reset
  - Project deadline approaching (24h before)
  - Weekly summary (digest)
- Users can configure preferences:
  - Enable/disable email notifications
  - Choose notification types
  - Set digest frequency (daily/weekly/none)
- Email templates managed in database

**Acceptance Criteria:**
- ✅ Email service configured (SMTP/SendGrid)
- ✅ Email templates stored in `email_templates` table
- ✅ Password reset email sending works
- ⏳ User email preferences page
- ⏳ Cron job for scheduled emails (digests, deadline warnings)
- ⏳ Unsubscribe link in all emails

---

### FR-7: Data Export

#### FR-7.1: Export Project (YOLO Format)
**Priority:** HIGH  
**Status:** ⏳ Planned

**Requirements:**
- Managers can export project data:
  - Button: "Export Dataset"
  - Configuration options:
    - **Include:** APPROVED only | APPROVED + SUBMITTED | ALL
    - **Format:** YOLO v5 | YOLO v8
    - **Split:** Train/Val/Test ratio (default: 70/20/10)
  - System generates:
    - Folder structure (images/, labels/, dataset.yaml)
    - Annotation files (.txt format)
    - Label mapping (classes.txt)
    - README with project metadata
  - ZIP file download

**Acceptance Criteria:**
- ⏳ POST `/api/v1/projects/:id/export` with config:
  ```json
  {
    "format": "yolo_v8",
    "include": "approved",
    "split": { "train": 0.7, "val": 0.2, "test": 0.1 }
  }
  ```
- ⏳ Annotations converted to YOLO format:
  ```
  # image_001.txt
  0 0.5 0.3 0.2 0.4  # class_id x_center y_center width height (normalized)
  ```
- ⏳ ZIP file generated and downloadable
- ⏳ Export logged in `audit_logs`
- ⏳ Email sent with download link (if large file)

---

#### FR-7.2: Export Formats (Future)
**Priority:** LOW  
**Status:** ⏳ Planned

**Requirements:**
- Support additional export formats:
  - **COCO JSON:** For object detection benchmarks
  - **Pascal VOC XML:** Legacy format support
  - **CSV:** Simple tabular export for analysis
- Format selector in export dialog
- Same workflow as YOLO export

**Acceptance Criteria:**
- ⏳ Format dropdown with options
- ⏳ Conversion logic for each format
- ⏳ Same file structure and ZIP download
- ⏳ Documentation for each format

---

### FR-8: Admin Features

#### FR-8.1: System Configuration
**Priority:** MEDIUM  
**Status:** ✅ Implemented

**Requirements:**
- Admins can manage system settings:
  - **Key-value configuration store**
  - Settings categories:
    - Email service (SMTP config)
    - AI service (Gemini API key)
    - File storage (S3/Cloudinary credentials)
    - System limits (max upload size, max users per project)
  - UI: Settings page with forms
  - Changes take effect immediately (or require restart)

**Acceptance Criteria:**
- ✅ GET `/api/v1/admin/config` returns all settings
- ✅ PUT `/api/v1/admin/config/:key` updates setting
- ✅ Validation for each setting type
- ✅ Audit log records config changes
- ✅ Sensitive fields masked (API keys shown as `***`)

---

#### FR-8.2: Email Template Management
**Priority:** MEDIUM  
**Status:** ✅ Implemented

**Requirements:**
- Admins can manage email templates:
  - **Template types:**
    - Welcome email
    - Password reset
    - Task assigned
    - Task approved/rejected
    - Weekly digest
  - **Template editor:**
    - Subject line (plain text)
    - HTML body (rich text editor or HTML code)
    - Text body (fallback for plain text clients)
    - Variable placeholders: `{{user_name}}`, `{{project_name}}`, etc.
  - **Preview:** Render template with sample data
  - **Enable/disable:** Toggle template without deleting

**Acceptance Criteria:**
- ✅ GET `/api/v1/admin/email-templates` lists all templates
- ✅ GET `/api/v1/admin/email-templates/:type` gets specific template
- ✅ PUT `/api/v1/admin/email-templates/:type` updates template
- ✅ POST `/api/v1/admin/email-templates/preview` renders preview
- ✅ Variable substitution works correctly
- ✅ HTML sanitized to prevent XSS

---

#### FR-8.3: Audit Log Viewer
**Priority:** LOW  
**Status:** ✅ Partially Implemented

**Requirements:**
- Admins can view system audit logs:
  - **Logged actions:**
    - User login/logout
    - User role changes
    - Task approvals/rejections
    - Project creation/deletion
    - Config changes
  - **Log fields:**
    - Timestamp
    - Actor (user who performed action)
    - Action type
    - Target (affected resource)
    - Metadata (additional context JSON)
  - **Filters:**
    - Date range
    - Actor (user)
    - Action type
    - Target resource
  - **Export:** Download logs as CSV

**Acceptance Criteria:**
- ✅ Audit logs stored in `audit_logs` table
- ⏳ GET `/api/v1/admin/audit-logs?start_date=...&actor_id=...`
- ⏳ Pagination (100 logs per page)
- ⏳ Filter UI with dropdowns
- ⏳ Export button → CSV download

---

## Non-Functional Requirements

### NFR-1: Performance

#### NFR-1.1: Response Time
**Priority:** HIGH

**Requirements:**
- API endpoints respond within acceptable latency:
  - **Simple queries:** < 200ms (GET user, GET tasks)
  - **Complex queries:** < 1s (GET dashboard stats with aggregations)
  - **File uploads:** < 5s for 10MB image
  - **AI annotation:** < 10s for single image
- Frontend first paint: < 2s
- Time to interactive: < 3s

**Measurement:**
- Use APM tools (New Relic, Datadog)
- Monitor P50, P95, P99 latencies
- Set up alerts for slow endpoints

---

#### NFR-1.2: Scalability
**Priority:** MEDIUM

**Requirements:**
- **Concurrent users:** Support 100 concurrent annotators
- **Data volume:**
  - 1,000 projects
  - 100,000 tasks
  - 1,000,000 annotations
- **Database:**
  - Query performance maintained with table scans
  - Indexes on foreign keys and frequently queried columns
- **File storage:** Cloud storage (S3) handles unlimited images

**Testing:**
- Load testing with k6 or JMeter
- Simulate 100 concurrent users
- Monitor database query times

---

#### NFR-1.3: Availability
**Priority:** MEDIUM

**Requirements:**
- **Uptime:** 99.5% (target for MVP)
- **Downtime:** Planned maintenance windows (weekend nights)
- **Recovery:** Automated restart on crash
- **Backup:** Daily database backups, 30-day retention

**Measurement:**
- Monitor uptime with UptimeRobot or Pingdom
- Set up health check endpoint: `/api/v1/health`
- Automated alerts on downtime

---

### NFR-2: Security

#### NFR-2.1: Authentication & Authorization
**Priority:** HIGH

**Requirements:**
- **Password storage:** bcrypt with cost factor 12
- **JWT tokens:** 15-minute expiry, RS256 signing
- **Refresh tokens:** 7-day expiry, HTTP-only cookies
- **OAuth:** Google Sign-In with Firebase
- **Session management:** Stateless (JWT), no server-side sessions
- **RBAC:** Role-based access control enforced on all endpoints

**Compliance:**
- OWASP Top 10 mitigation
- No credentials in logs
- Secure token transmission (HTTPS)

---

#### NFR-2.2: Data Protection
**Priority:** HIGH

**Requirements:**
- **Encryption in transit:** HTTPS/TLS 1.3 for all communication
- **Encryption at rest:** Database encryption enabled (PostgreSQL TDE)
- **PII handling:** Email addresses stored securely, no SSN/payment data
- **Access control:** Database access restricted to application service account
- **Audit trail:** All data modifications logged

**Compliance:**
- GDPR readiness (user data export, right to deletion)
- Data retention policy (30 days for deleted users)

---

#### NFR-2.3: Input Validation
**Priority:** HIGH

**Requirements:**
- **Backend validation:** All inputs validated with Zod schemas
- **Frontend validation:** Client-side validation for UX (not security)
- **SQL injection:** Prevented by Prisma parameterized queries
- **XSS prevention:** React auto-escaping, CSP headers
- **File upload validation:**
  - File type whitelist (jpg, png, webp)
  - File size limit (10MB)
  - Filename sanitization

---

### NFR-3: Usability

#### NFR-3.1: User Experience
**Priority:** HIGH

**Requirements:**
- **Responsive design:** Works on desktop (1920x1080 to 1366x768)
- **Browser support:** Chrome, Firefox, Edge, Safari (latest 2 versions)
- **Accessibility:** WCAG 2.1 Level A compliance
  - Keyboard navigation
  - Screen reader support (ARIA labels)
  - Color contrast ratios
- **Loading states:** Skeleton screens, spinners for async operations
- **Error messages:** User-friendly, actionable error messages

---

#### NFR-3.2: Learnability
**Priority:** MEDIUM

**Requirements:**
- **Onboarding:** First-time user tutorial (tooltips, walkthroughs)
- **Help documentation:** In-app help tooltips on hover
- **Keyboard shortcuts:** Displayed in UI (e.g., "Press ? for shortcuts")
- **Consistent UI:** Design system (shadcn/ui) for uniform look
- **Time to competency:** New annotator productive within 15 minutes

---

### NFR-4: Maintainability

#### NFR-4.1: Code Quality
**Priority:** MEDIUM

**Requirements:**
- **TypeScript:** 100% type coverage (no `any` types)
- **Linting:** ESLint configured, no warnings in production code
- **Code style:** Prettier auto-formatting
- **Testing:** (Future requirement)
  - Unit tests: 70% coverage
  - Integration tests: Critical paths
  - E2E tests: User workflows

---

#### NFR-4.2: Documentation
**Priority:** MEDIUM

**Requirements:**
- **API documentation:** OpenAPI/Swagger spec (future)
- **Code comments:** JSDoc for public functions
- **Architecture docs:** Up-to-date system diagrams
- **README:** Setup instructions, dev guide
- **Changelog:** Version history and release notes

---

#### NFR-4.3: Logging & Monitoring
**Priority:** MEDIUM

**Requirements:**
- **Application logs:** Winston logger with levels (debug, info, warn, error)
- **Request logs:** HTTP method, path, status, duration
- **Error tracking:** Structured error logs with stack traces
- **Metrics:** (Future)
  - Request rate, error rate
  - Database query times
  - Active users

---

### NFR-5: Compatibility

#### NFR-5.1: Browser Compatibility
**Priority:** HIGH

**Requirements:**
- **Supported browsers:**
  - Chrome 100+
  - Firefox 100+
  - Edge 100+
  - Safari 15+
- **Not supported:** IE 11 (deprecated)

---

#### NFR-5.2: API Versioning
**Priority:** MEDIUM

**Requirements:**
- **API version:** `/api/v1/...`
- **Backwards compatibility:** No breaking changes within major version
- **Deprecation policy:** 6-month notice before removing endpoints
- **Version migration:** Provide upgrade guide

---

## User Stories

### As a Manager

```
US-M1: Create Project
  As a manager,
  I want to create a new annotation project with custom labels,
  So that my team can start labeling images for ML training.
  
  Acceptance: I can define project name, labels, and invite team members.
```

```
US-M2: Monitor Progress
  As a manager,
  I want to see real-time project completion percentage,
  So that I know if we'll meet the deadline.
  
  Acceptance: Dashboard shows % complete and estimated completion date.
```

```
US-M3: Export Dataset
  As a manager,
  I want to export approved annotations in YOLO format,
  So that I can train my YOLOv8 model.
  
  Acceptance: Download button generates ZIP with images + labels.
```

---

### As an Annotator

```
US-A1: Annotate Efficiently
  As an annotator,
  I want to use AI suggestions to speed up labeling,
  So that I can complete tasks faster.
  
  Acceptance: AI pre-fills bboxes, I only need to verify and correct.
```

```
US-A2: Understand Rejections
  As an annotator,
  I want to see detailed feedback when my work is rejected,
  So that I can improve and avoid repeating mistakes.
  
  Acceptance: Rejection notification includes specific feedback from reviewer.
```

```
US-A3: Track My Work
  As an annotator,
  I want to see how many tasks I've completed,
  So that I can measure my productivity.
  
  Acceptance: Profile page shows total tasks completed and approval rate.
```

---

### As a Reviewer

```
US-R1: Review Efficiently
  As a reviewer,
  I want to see all submitted tasks in one queue,
  So that I can batch-review them efficiently.
  
  Acceptance: Review queue sorted by submission time with filters.
```

```
US-R2: Quick Corrections
  As a reviewer,
  I want to fix minor annotation errors myself,
  So that I don't have to reject and wait for rework.
  
  Acceptance: "Edit Annotations" button lets me make corrections directly.
```

```
US-R3: Compare Annotators
  As a reviewer,
  I want to see side-by-side comparisons when multiple annotators labeled same image,
  So that I can identify consensus and outliers.
  
  Acceptance: Consensus view shows overlapping bboxes with agreement percentage.
```

---

### As an Admin

```
US-AD1: Manage Users
  As an admin,
  I want to activate/deactivate user accounts,
  So that I can control platform access.
  
  Acceptance: Admin panel with user list and status toggle.
```

```
US-AD2: Debug Issues
  As an admin,
  I want to impersonate users to reproduce bugs,
  So that I can troubleshoot reported issues.
  
  Acceptance: "View As" button logs me in as selected user without knowing password.
```

```
US-AD3: Monitor System
  As an admin,
  I want to view audit logs of all actions,
  So that I can detect suspicious activity.
  
  Acceptance: Audit log viewer with filters by user, action, date range.
```

---

## Use Cases

### UC-1: Complete Annotation Workflow

**Actor:** Annotator  
**Precondition:** Annotator is assigned tasks  
**Main Flow:**

1. Annotator logs in
2. System displays task list
3. Annotator clicks task → opens annotation canvas
4. IF AI enabled:
   - Annotator clicks "Get AI Suggestions"
   - System calls Gemini API
   - AI suggestions loaded on canvas
5. Annotator reviews/corrects annotations:
   - Accepts accurate suggestions
   - Deletes false positives
   - Adds missed objects
   - Adjusts bboxes
6. Annotator clicks "Submit for Review"
7. System validates (at least 1 annotation)
8. System updates task status → SUBMITTED
9. System notifies reviewer
10. Success message displayed

**Postcondition:** Task in review queue

---

### UC-2: Review and Approve Task

**Actor:** Reviewer  
**Precondition:** Task submitted by annotator  
**Main Flow:**

1. Reviewer receives notification
2. Reviewer opens review queue
3. Reviewer clicks task → opens review interface
4. Reviewer inspects annotations
5. Reviewer chooses action:
   - **Approve:**
     - Reviewer clicks "Approve"
     - Optional: Enters review score (1-10)
     - System updates status → APPROVED
     - Annotator notified
   - **Reject:**
     - Reviewer clicks "Reject"
     - Reviewer enters feedback (required)
     - System updates status → REJECTED
     - Annotator notified with feedback
   - **Re-Annotate:**
     - Reviewer clicks "Edit Annotations"
     - Reviewer makes corrections
     - System auto-approves
6. System recalculates project progress

**Postcondition:** Task approved/rejected, progress updated

---

## Technical Constraints

### TC-1: Technology Stack
**Constraint:** Must use specified technologies  
**Rationale:** Team expertise, existing infrastructure

**Stack:**
- Frontend: React 19, TypeScript, Vite, Tailwind CSS
- Backend: Node.js 18+, Express 5, TypeScript
- Database: PostgreSQL 15+
- ORM: Prisma 6
- Real-time: Socket.IO 4
- Cloud: AWS S3 / Cloudinary

---

### TC-2: Browser Support
**Constraint:** Modern browsers only (no IE11)  
**Rationale:** Cost of polyfills vs user base

**Supported:**
- Chrome 100+ (95% of users)
- Firefox 100+
- Safari 15+
- Edge 100+

---

### TC-3: Data Residency
**Constraint:** (TBD based on deployment)  
**Consideration:** If handling EU user data, may need GDPR compliance

---

## Acceptance Criteria

### AC-1: MVP (Minimum Viable Product)

**Definition of Done:**

- ✅ User registration and login (email + Google OAuth)
- ✅ Admin can manage users (CRUD, role assignment)
- ⏳ Manager can create projects with label config
- ⏳ Manager can upload images and create tasks
- ⏳ Manager can assign tasks (manual, min 2 annotators)
- ⏳ Annotator can view assigned tasks
- ⏳ Annotator can draw bounding boxes
- ⏳ Annotator can submit tasks
- ⏳ Reviewer can approve/reject tasks
- ⏳ Reviewer can provide feedback
- ⏳ Real-time notifications work
- ⏳ Basic project dashboard (progress tracking)
- ⏳ Export YOLO format

**Excluded from MVP:**
- Polygon annotations (future)
- Auto-assignment algorithms (future)
- Advanced AI features (future)
- COCO/Pascal VOC export (future)
- Mobile apps (future)

---

### AC-2: Performance Benchmarks

**Targets:**

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response (simple) | < 200ms | k6 load test |
| API response (complex) | < 1s | Database query profiling |
| Page load (First Paint) | < 2s | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| Concurrent users | 100 | Load testing |
| Image upload (10MB) | < 5s | Real-world test |

---

### AC-3: Security Checklist

**Requirements:**

- ✅ HTTPS enforced in production
- ✅ Passwords hashed with bcrypt (cost 12)
- ✅ JWT tokens with 15min expiry
- ✅ CORS configured (whitelist origins)
- ✅ Rate limiting enabled (100 req/min per IP)
- ✅ Input validation (Zod schemas)
- ✅ SQL injection prevented (Prisma ORM)
- ✅ XSS prevented (React + CSP headers)
- ✅ File upload validation (type, size)
- ⏳ Security audit before production

---

## Future Requirements

### Phase 2 Features (Next 6 Months)

1. **Advanced Annotation Tools**
   - Polygon tool
   - Keypoint annotation
   - 3D bounding boxes

2. **Smart Assignment**
   - Reputation-based routing
   - Skill matching
   - Workload balancing

3. **Enhanced AI**
   - Active learning
   - Model fine-tuning
   - Confidence-based auto-approval

4. **Export Formats**
   - COCO JSON
   - Pascal VOC XML
   - TensorFlow TFRecord

5. **Analytics Dashboard**
   - Annotator leaderboards
   - Quality trends over time
   - Inter-annotator agreement metrics

6. **Mobile Apps**
   - iOS app (Swift)
   - Android app (Kotlin)

---

### Phase 3 Features (12+ Months)

1. **Video Annotation**
   - Frame-by-frame labeling
   - Object tracking

2. **Integration APIs**
   - Webhook notifications
   - External tool integration (Label Studio, CVAT)

3. **Advanced Review**
   - Automated quality scoring
   - Anomaly detection

4. **Enterprise Features**
   - SSO (SAML, LDAP)
   - Custom workflows
   - Multi-tenancy

---

## Summary

### Requirements Status

| Category | Total | Implemented | In Progress | Planned |
|----------|-------|-------------|-------------|---------|
| **Functional** | 45 | 15 (33%) | 20 (44%) | 10 (22%) |
| **Non-Functional** | 15 | 8 (53%) | 5 (33%) | 2 (13%) |
| **User Stories** | 12 | 4 (33%) | 6 (50%) | 2 (17%) |

### Priority Breakdown

- **HIGH:** 25 requirements (must-have for MVP)
- **MEDIUM:** 15 requirements (nice-to-have, can defer)
- **LOW:** 5 requirements (future enhancements)

### Next Steps

1. ✅ Complete authentication system
2. ⏳ Build project management module
3. ⏳ Implement annotation canvas (Konva)
4. ⏳ Develop review workflow
5. ⏳ Add real-time notifications
6. ⏳ Create export functionality
7. ⏳ Performance testing
8. ⏳ Security audit
9. ⏳ User acceptance testing

---

**Maintained by:** V-Label Product Team  
**Related Docs:** `01_business.md`, `03_architecture.md`, `04_database.md`  
**Revision History:** See Git commits
