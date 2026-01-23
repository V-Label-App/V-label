# System Analysis Report - V-Label Platform

**Analysis Date:** 2026-01-23
**Version:** 1.0
**Branch:** feat/web-socket-implement
**Analyst:** AI Assistant

---

## Executive Summary

**V-Label** is a collaborative image annotation platform designed for machine learning dataset creation. The system supports consensus labeling (multiple annotators per image), AI-assisted annotation using Google Gemini Vision API, and exports datasets in ML-ready formats (YOLO, COCO).

**Current Progress:** ~35-40% Complete

### Key Achievements ✅
- Complete authentication system (JWT + Google OAuth)
- Real-time notifications via WebSocket
- Dynamic label management with categories
- AI chat integration with Gemini
- Admin panel for system management
- Annotation canvas with bounding box tool

### Critical Gaps ❌
- No project creation or management
- No task assignment workflow
- Cannot submit/save annotations
- No review/approval system
- No dataset export functionality

**Estimated Time to MVP:** 6-8 weeks

---

## 1. System Architecture

### Technology Stack

#### Backend
- **Runtime:** Node.js 18+ with TypeScript (ES Modules)
- **Framework:** Express.js 5.2
- **Database:** PostgreSQL 15 (Prisma ORM 6.19)
- **Authentication:** JWT + bcrypt, Firebase Auth
- **Real-time:** Socket.IO 4.8.3
- **AI:** Google Generative AI (Gemini 2.0 Flash)
- **Email:** Nodemailer 7.0

#### Frontend
- **Framework:** React 19 + TypeScript
- **Build:** Vite 7.2
- **Routing:** React Router DOM 7.12
- **Styling:** Tailwind CSS 3.4 + shadcn/ui
- **Canvas:** Konva 10.2 + React-Konva 19.2
- **State:** Context API + Zustand 4.5

#### Database
- **Provider:** PostgreSQL 15
- **Tables:** 18 tables
- **Schema Design:** UUID primary keys, JSONB for flexible data

---

## 2. Implemented Features

### 2.1. Authentication & User Management ✅

**User Registration:**
- Email/password with bcrypt (cost=12)
- Password validation (min 8 chars, mixed case, numbers)
- Default role: ANNOTATOR, status: inactive
- Requires admin activation

**User Login:**
- JWT authentication (15min access + 7 days refresh)
- HTTP-only cookies for refresh tokens
- Audit logging
- Google OAuth via Firebase

**Password Reset:**
- Email-based reset flow
- Secure tokens (32-byte random, 1 hour expiry)
- One-time use enforcement

**Admin User Management:**
- List/filter users (pagination support)
- Change user roles (ADMIN, MANAGER, REVIEWER, ANNOTATOR)
- Activate/deactivate accounts
- User impersonation for support
- Audit logging for all actions

### 2.2. Label Management System ✅

**Dynamic Label System:**
- Global labels (reusable across projects)
- Project-specific labels
- Label categories (Animals, Vehicles, Objects, etc.)
- Drag & drop reorganization

**Label CRUD:**
- Create/Update/Delete labels
- Color picker integration
- Category assignment
- Global/local toggle

**Label Request Workflow:**
- Annotators can request new labels during work
- Manager reviews requests
- Approve (auto-creates label) or Reject with feedback
- Real-time notifications on status change

**API Endpoints:**
```
GET    /api/v1/labels
GET    /api/v1/labels/global
GET    /api/v1/labels/categories
POST   /api/v1/labels
PUT    /api/v1/labels/:id
DELETE /api/v1/labels/:id
POST   /api/v1/labels/request
PUT    /api/v1/labels/requests/:id/approve
PUT    /api/v1/labels/requests/:id/reject
```

### 2.3. Real-Time Communication ✅

**WebSocket Events:**
- User-specific rooms: `user:{userId}`
- Role-based rooms: `role:{ROLE}`
- Event types:
  - TASK_ASSIGNED, TASK_SUBMITTED, TASK_APPROVED, TASK_REJECTED
  - DEADLINE_WARNING, COMMENT_MENTION
  - SYSTEM_ANNOUNCEMENT
  - LABEL_CREATED, LABEL_UPDATED, LABEL_DELETED
  - NOTIFICATION_CREATED

**Notification Inbox:**
- Paginated notification list
- Filter by read/unread, type, date range
- Mark as read (single/bulk)
- Soft delete
- Real-time badge counter

**Email Notifications:**
- SMTP configuration (Nodemailer)
- Template system (HTML + text fallback)
- Variable substitution
- Delivery tracking
- Supported: password reset, welcome (planned), task assignments (planned)

### 2.4. AI Integration ✅

**AI Chat Widget:**
- Google Gemini 2.0 Flash integration
- Role-based system prompts (MANAGER, ANNOTATOR, REVIEWER, ADMIN)
- Function calling support:
  - `create_labels_auto` - Auto-generate labels from description
  - `get_all_labels` - View system labels
  - `get_label_categories` - List categories
  - `get_users` - List users (admin)
  - `create_user` - Create user (admin)
  - `send_system_announcement` - Broadcast notifications (admin)
- Confirmation workflow before executing actions
- Quick reply suggestions
- Card, Table, Form renderers
- Admin can enable/disable globally
- Real-time updates via WebSocket

**AI-Assisted Annotation:**
- Google Gemini Vision API integration
- Object detection from images
- Bounding box generation
- Confidence scores
- Label matching
- **Status:** Backend ready, frontend integration pending

### 2.5. Annotation Workspace ✅ (Partial)

**Canvas Tools:**
- Konva.js canvas implementation
- Bounding box tool (rectangle)
- Zoom/Pan (mouse wheel)
- Select/Edit/Delete regions
- **Pending:** Polygon tool, polygon editing

**Components:**
- WorkspaceCanvas.tsx - Main drawing area
- AnnotationLayer.tsx - Annotation overlay
- WorkspaceToolbar.tsx - Tool selector
- RegionsList.tsx - Annotation list panel
- ImageNavigator.tsx - Multi-image navigation
- DiscussionPanel.tsx - Comments/notes

**State Management:**
- Zustand stores: annotationStore, workspaceStore, toolStore
- **Status:** Frontend UI complete, backend save/submit API missing

### 2.6. Admin Features ✅

**System Configuration:**
- Key-value config store
- Email service settings
- AI service API keys
- File storage credentials
- System limits
- Sensitive fields masked in responses

**Email Template Management:**
- CRUD for email templates
- Template preview with sample data
- Variable substitution: `{{user_name}}`, `{{project_name}}`, etc.
- HTML sanitization (XSS prevention)

**Dashboard Statistics:**
- Total users (by role breakdown)
- Total projects (by status)
- Active annotators (last 7 days)
- Recent registrations
- System activity trends

**Audit Logs:**
- Action tracking: login, role changes, password resets, config changes
- **Frontend viewer:** Pending

---

## 3. Missing Features (Critical Gaps)

### 3.1. Project Management ❌ HIGH PRIORITY

**Status:** Database schema ready, no API/UI implementation

**Required Endpoints:**
```
POST   /api/v1/projects              - Create project
GET    /api/v1/projects              - List projects (pagination)
GET    /api/v1/projects/:id          - Get project details
PUT    /api/v1/projects/:id          - Update project
DELETE /api/v1/projects/:id          - Delete project
POST   /api/v1/projects/:id/members  - Add team member
DELETE /api/v1/projects/:id/members/:userId - Remove member
POST   /api/v1/projects/:id/images   - Upload images
```

**Frontend Pages:**
- ProjectListPage.tsx (exists, uses mock data)
- ProjectDetailPage.tsx (exists, uses mock data)
- CreateProjectModal.tsx (needs implementation)

**Estimated Effort:** 5-7 days

### 3.2. Task Assignment System ❌ HIGH PRIORITY

**Status:** Database schema ready (tasks, task_assignments tables), no implementation

**Required Endpoints:**
```
POST   /api/v1/projects/:id/tasks/upload      - Batch upload images
POST   /api/v1/projects/:id/tasks/assign      - Manual assignment
POST   /api/v1/projects/:id/tasks/auto-assign - Automatic assignment
PUT    /api/v1/tasks/:id/reassign             - Reassign task
GET    /api/v1/tasks/my-tasks                 - Get assigned tasks
```

**Features Needed:**
- Consensus labeling support (min 2 annotators per image)
- Assignment algorithms:
  - Round-robin
  - Skill-based (reputation scores)
  - Workload balancing
- Deadline management
- Task filtering (status, deadline, project)

**Frontend:**
- AnnotatorTasks.tsx (exists, needs API)
- TaskAssignmentModal.tsx (needs creation)

**Estimated Effort:** 4-6 days

### 3.3. Annotation Save & Submit ❌ HIGH PRIORITY

**Status:** Frontend canvas works, backend API missing

**Required Endpoints:**
```
POST /api/v1/tasks/:id/annotations        - Save annotations (auto-save)
POST /api/v1/tasks/:id/submit             - Submit for review
GET  /api/v1/tasks/:id/annotations        - Load existing annotations
```

**Data Format:**
```json
{
  "regions": [
    {
      "id": "uuid",
      "type": "rectangle",
      "x": 100,
      "y": 150,
      "width": 200,
      "height": 300,
      "labelId": "uuid",
      "confidence": 0.95,
      "isAiGenerated": false
    }
  ]
}
```

**Features:**
- Auto-save draft every 30 seconds
- Validation (min 1 annotation before submit)
- Trigger reviewer notification on submit
- Update task status (IN_PROGRESS → SUBMITTED)

**Estimated Effort:** 2-3 days

### 3.4. Review System ❌ HIGH PRIORITY

**Status:** Database fields ready, no implementation

**Required Endpoints:**
```
GET  /api/v1/review/queue          - List submitted tasks
POST /api/v1/review/:id/approve    - Approve task
POST /api/v1/review/:id/reject     - Reject with feedback
POST /api/v1/review/:id/re-annotate - Reviewer re-annotation
```

**Workflow:**
1. Reviewer views submitted task in queue
2. Reviews annotations on canvas
3. Decision:
   - **Approve:** Update status, increment reputation
   - **Reject:** Provide feedback, return to annotator, decrement reputation
   - **Re-annotate:** Reviewer fixes minor issues, auto-approve

**Frontend:**
- ReviewerQueue.tsx (exists, needs API)
- ReviewInterface.tsx (comparison view for consensus)

**Estimated Effort:** 5-7 days

### 3.5. Data Export (YOLO Format) ❌ HIGH PRIORITY

**Status:** No implementation

**Required Endpoint:**
```
POST /api/v1/projects/:id/export
Body: {
  "format": "yolo",
  "split": { "train": 0.7, "val": 0.2, "test": 0.1 },
  "includeImages": true
}
```

**Output Structure:**
```
project-export.zip
├── images/
│   ├── train/
│   ├── val/
│   └── test/
├── labels/
│   ├── train/
│   ├── val/
│   └── test/
├── dataset.yaml
└── classes.txt
```

**YOLO Label Format:**
```
<class-id> <x-center> <y-center> <width> <height>
```
(Normalized 0-1)

**Additional Formats (Future):**
- COCO JSON
- Pascal VOC XML
- CSV export

**Estimated Effort:** 3-4 days

---

## 4. Recommended Features

### 4.1. Performance & Scalability

**Redis Caching Layer:**
- User sessions (if migrating from JWT)
- Socket.IO adapter (horizontal scaling)
- Frequent queries (projects, labels)
- Notification cache
- **Effort:** 3-4 days
- **Impact:** 50-70% reduction in DB load

**CDN for Static Assets:**
- CloudFlare/AWS CloudFront
- Annotation images
- Frontend static files
- **Effort:** 1 day
- **Impact:** 2-3x faster page loads

**Database Optimization:**
- Add missing indexes:
  ```sql
  CREATE INDEX idx_task_assignments_status ON task_assignments(status);
  CREATE INDEX idx_tasks_project_status ON tasks(projectId, status);
  CREATE INDEX idx_notifications_user_created ON notifications(userId, createdAt);
  ```
- Partition large tables (email_logs, audit_logs by date)
- Read replicas for SELECT queries
- **Effort:** 2-3 days

### 4.2. User Experience

**Onboarding Tutorial:**
- Interactive walkthrough with tooltips
- Video tutorials for annotation tools
- Sample project with practice tasks
- **Effort:** 3-4 days

**Keyboard Shortcuts:**
- `1-9` for label quick select
- `Delete` to remove annotation
- `Ctrl+Z/Y` for undo/redo
- `Esc` to deselect
- `?` to show shortcuts overlay
- **Effort:** 2 days
- **Status:** Partially implemented

**Dark Mode:**
- Theme toggle in user settings
- Persist preference (localStorage)
- **Effort:** 2 days
- **Status:** Package installed (`next-themes`), not implemented

### 4.3. Quality & Reliability

**Automated Testing:**
- Backend: Jest + Supertest (API tests)
- Frontend: Vitest + React Testing Library
- E2E: Playwright for critical workflows
- Target: 70% code coverage
- **Effort:** 7-10 days

**Error Tracking (Sentry):**
- Frontend + backend integration
- Real-time alerts for critical errors
- Performance monitoring
- **Effort:** 2-3 days

**API Documentation (OpenAPI/Swagger):**
- Auto-generate from Express routes
- Interactive API explorer (Swagger UI)
- TypeScript type generation
- **Effort:** 2-3 days

### 4.4. Advanced Features

**Polygon Annotation Tool:**
- Click-to-add-vertices drawing
- Edit vertices (drag handles)
- Close polygon on double-click
- **Effort:** 3-4 days

**Active Learning Loop:**
- Train custom model on approved annotations
- Replace Gemini with fine-tuned YOLO
- Continual learning from new data
- **Effort:** 2-3 weeks

**Consensus Metrics:**
- Inter-annotator agreement (IoU)
- Annotation comparison view
- Conflict resolution UI
- **Effort:** 4-5 days

**Mobile PWA:**
- Progressive Web App with manifest.json
- Offline support (Service Workers)
- Touch-optimized annotation tools
- **Effort:** 2-3 weeks

---

## 5. Priority Roadmap

### Phase 1: MVP Core (4-6 weeks) 🔴 CRITICAL

**Goal:** Get end-to-end workflow working

1. **Project Management CRUD** - 5-7 days
2. **Task Assignment System** - 4-6 days
3. **Annotation Save & Submit** - 2-3 days
4. **Review System** - 5-7 days
5. **YOLO Export** - 3-4 days

**Total:** 19-27 days (4-5.5 weeks)

### Phase 2: UX & Performance (2-3 weeks) 🟡 HIGH

**Goal:** Improve stability and user experience

6. **Project Dashboard Statistics** - 2-3 days
7. **Cloud Image Upload (S3/Cloudinary)** - 2-3 days
8. **Polygon Annotation Tool** - 3-4 days
9. **Automated Testing Setup** - 7-10 days
10. **Error Tracking (Sentry)** - 2-3 days

**Total:** 16-23 days (3-4.5 weeks)

### Phase 3: Advanced Features (3-4 weeks) 🟢 MEDIUM

**Goal:** Differentiation and optimization

11. **Auto-Assignment Algorithms** - 3-4 days
12. **Consensus Metrics** - 4-5 days
13. **Additional Export Formats** - 2-3 days each
14. **Redis Caching** - 3-4 days
15. **Onboarding Tutorial** - 3-4 days
16. **Dark Mode** - 2 days
17. **API Documentation (Swagger)** - 2-3 days

**Total:** 19-27 days (4-5.5 weeks)

---

## 6. Technical Debt

### Code Quality Issues 🟡

**Mock Data Dependencies:**
- Files: `mockData.ts`, `projects.mock.ts`
- **Impact:** Cannot test real workflows
- **Fix:** Replace with API integration in Phase 1

**Missing Error Boundaries:**
- **Impact:** App crashes can break entire UI
- **Fix:** Add React error boundary wrappers

**No TypeScript Strict Mode:**
- **Impact:** Type safety holes
- **Fix:** Enable `strict: true` in tsconfig.json

**Inconsistent Error Handling:**
- **Impact:** Fragile frontend error handling
- **Fix:** Standardize API error response format

### Performance Concerns 🔴

**Missing Database Indexes:**
```sql
-- Critical indexes to add:
CREATE INDEX idx_task_assignments_status ON task_assignments(status);
CREATE INDEX idx_tasks_project_status ON tasks(projectId, status);
CREATE INDEX idx_notifications_user_created ON notifications(userId, createdAt DESC);
CREATE INDEX idx_labels_global ON labels(isGlobal) WHERE isGlobal = true;
```

**N+1 Query Problem:**
- **Impact:** Multiple DB roundtrips
- **Fix:** Use Prisma `include` and `select` properly

**No Pagination on Some Lists:**
- **Impact:** Performance issues with large datasets
- **Fix:** Add pagination to all list endpoints

### Security Concerns 🟡

**No Rate Limiting on Upload Endpoints:**
- **Impact:** Potential abuse/DoS
- **Fix:** Add multer rate limiting

**No Input Sanitization on Rich Text:**
- Email templates and chat allow HTML
- **Impact:** Potential XSS
- **Fix:** Use DOMPurify (frontend), sanitize-html (backend)

### DevOps Issues 🟡

**No Automated Backups:**
- Backup script exists (`backup.sh`) but not scheduled
- **Impact:** Data loss risk
- **Fix:** Setup cron job as per deployment docs

**No Production Monitoring:**
- **Impact:** Cannot detect issues proactively
- **Fix:** Add Sentry/Datadog in Phase 2

---

## 7. Database Schema

### Tables (18 Total)

**Core Tables:**
1. `users` - User accounts (id, email, passwordHash, role, reputationScore)
2. `projects` - Annotation projects (id, name, labelConfig, deadline, status)
3. `project_members` - Project team (projectId, userId)
4. `tasks` - Images to annotate (id, projectId, imageUrl, status)
5. `task_assignments` - Work assignments (id, taskId, annotatorId, annotations, status)

**Label Management:**
6. `label_categories` - Label groupings (id, name, description)
7. `labels` - Annotation labels (id, name, color, isGlobal, categoryId)
8. `project_labels` - Project-label associations (projectId, labelId)
9. `label_requests` - Annotator label requests (id, labelName, status, reviewedBy)

**Communication:**
10. `notifications` - User notifications (id, userId, type, message, isRead)
11. `notification_templates` - Notification templates (id, type, titleTemplate)
12. `chat_messages` - Project chat (id, projectId, senderId, content)

**Admin & System:**
13. `audit_logs` - System audit trail (id, action, actorId, metadata)
14. `system_configs` - Key-value store (key, value)
15. `email_templates` - Email templates (id, type, htmlBody, enabled)
16. `email_configs` - SMTP settings (id, provider, config)
17. `email_logs` - Delivery tracking (id, to, status, sentAt)
18. `password_reset_tokens` - Password reset (id, userId, token, expiresAt)

**Schema Design Principles:**
- UUID primary keys (security, portability)
- JSONB for flexible metadata
- Soft deletes where applicable
- Audit timestamps (createdAt, updatedAt)
- Proper foreign key constraints
- Composite indexes for common queries

---

## 8. Security Implementation

### Authentication ✅
- JWT tokens (15min access, 7 days refresh)
- HTTP-only cookies for refresh tokens
- bcrypt password hashing (cost=12)
- Firebase Admin SDK for Google OAuth
- Token validation middleware

### Authorization ✅
- Role-based access control (RBAC)
- `requireRole()` middleware
- Resource-level permission checks

### Input Validation ✅
- Zod schemas for request validation
- SQL injection prevention (Prisma ORM)
- XSS prevention (React auto-escaping)

### Infrastructure Security ✅
- Helmet.js (security headers)
- CORS configuration
- Rate limiting (express-rate-limit)
- Request logging (Winston)

### Audit & Monitoring ✅
- Audit logs for sensitive actions
- Email delivery tracking
- Request/response logging

---

## 9. Critical Files for Implementation

### Backend Service Layer (Create These First)

1. **`server/src/services/project.service.ts`** ❌ CRITICAL
   - Business logic for project CRUD
   - Functions: createProject, getProjects, updateProject, deleteProject, addMember, removeMember
   - Dependencies: Prisma, notification service

2. **`server/src/services/task.service.ts`** ❌ CRITICAL
   - Task and assignment logic
   - Functions: createTasks, assignTasks, autoAssign, submitTask, saveAnnotations
   - Dependencies: Prisma, file upload, notifications

3. **`server/src/services/review.service.ts`** ❌ CRITICAL
   - Review workflow logic
   - Functions: getReviewQueue, approveTask, rejectTask, calculateReputation
   - Dependencies: Prisma, notifications

4. **`server/src/services/export.service.ts`** ❌ CRITICAL
   - Data export logic
   - Functions: exportYOLO, exportCOCO, generateZip
   - Dependencies: Prisma, archiver, file system

5. **`server/src/services/upload.service.ts`** ❌ CRITICAL
   - Cloud storage integration
   - Functions: uploadImage, deleteImage, getImageUrl
   - Dependencies: AWS SDK or Cloudinary SDK

### Controllers

6. **`server/src/controllers/project.controller.ts`** ❌
7. **`server/src/controllers/task.controller.ts`** ❌
8. **`server/src/controllers/review.controller.ts`** ❌

### Routes

9. **`server/src/routes/project.routes.ts`** ❌
10. **`server/src/routes/task.routes.ts`** ❌
11. **`server/src/routes/review.routes.ts`** ❌

### Frontend API Clients

12. **`client/src/services/project.api.ts`** ⏳
13. **`client/src/services/task.api.ts`** ❌
14. **`client/src/services/review.api.ts`** ❌

### Frontend Pages (Integrate with API)

15. **`client/src/features/manager/pages/ProjectListPage.tsx`** ⏳
16. **`client/src/features/manager/pages/ProjectDetailPage.tsx`** ⏳
17. **`client/src/features/annotator/pages/AnnotatorTasks.tsx`** ⏳
18. **`client/src/features/annotation/pages/WorkspacePage.tsx`** ✅ Partial
19. **`client/src/features/reviewer/pages/ReviewerQueue.tsx`** ⏳

---

## 10. Recommendations

### Immediate Actions (Week 1-2)

1. ✅ **Complete MVP Core Features** (Phase 1 priorities)
2. ✅ **Add Missing Database Indexes** (performance)
3. ✅ **Enable TypeScript Strict Mode** (type safety)
4. ✅ **Setup Automated Database Backups** (data protection)

### Short-term Actions (Week 3-4)

5. ✅ **Replace Mock Data with API Integration**
6. ✅ **Add Error Tracking (Sentry)**
7. ✅ **Implement Automated Testing** (critical paths first)
8. ✅ **Write API Documentation** (OpenAPI/Swagger)

### Medium-term Actions (Month 2)

9. ✅ **Performance Optimization** (Redis, CDN, query optimization)
10. ✅ **UX Enhancements** (onboarding, shortcuts, dark mode)
11. ✅ **Security Audit** (CORS review, penetration testing)

### Long-term Actions (Month 3+)

12. ✅ **Advanced Features** (active learning, mobile PWA, analytics)
13. ✅ **Scalability Infrastructure** (read replicas, horizontal scaling)
14. ✅ **Documentation Completion** (fill empty docs, video tutorials)

---

## 11. Conclusion

### System Maturity: ~35-40% Complete

**Strengths:**
- ✅ Solid architecture foundation (type-safe, well-documented)
- ✅ Complete database schema (18 tables, proper relationships)
- ✅ Authentication working (JWT, OAuth, RBAC)
- ✅ Real-time infrastructure (Socket.IO, notifications)
- ✅ Label management fully implemented
- ✅ AI integration ready (Gemini)
- ✅ Annotation UI mostly complete

**Critical Gaps:**
- ❌ Core workflow incomplete (no project creation, task assignment, review)
- ❌ No data export (ML-ready datasets)
- ❌ Mock data dependencies

**Recommended Next Steps:**

**This Sprint:**
1. Implement Project Management CRUD
2. Implement Task Assignment API
3. Connect annotation submission to backend

**Next 2 Sprints:**
4. Complete Review System
5. Implement YOLO export
6. Replace all mock data

**Month 2:**
7. Automated testing
8. Performance optimization
9. Error tracking

**Estimated Time to Production-Ready MVP:** 6-8 weeks

---

**Report Generated By:** Claude Sonnet 4.5
**Repository:** github.com/anthropics/claude-code
**Working Directory:** /Users/mr.triss/FPT University/SWP391/V-label_app/V-label-app
