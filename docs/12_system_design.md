# V-Label System Design Document

**Version:** 1.0
**Last Updated:** 2026-01-23
**Author:** Development Team

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Layer Details](#3-layer-details)
4. [Technology Stack](#4-technology-stack)
5. [Component Specifications](#5-component-specifications)
6. [Data Flow](#6-data-flow)
7. [Security Architecture](#7-security-architecture)
8. [Scalability Considerations](#8-scalability-considerations)
9. [Design Decisions](#9-design-decisions)
10. [Future Enhancements](#10-future-enhancements)

---

## 1. System Overview

### 1.1 Purpose

V-Label is a collaborative image annotation platform that enables teams to efficiently label images for machine learning datasets. The system supports multiple user roles, real-time collaboration, AI-assisted annotation, and comprehensive project management.

### 1.2 Architecture Style

**Layered Monolithic Architecture** with the following characteristics:
- **Frontend:** React-based Single Page Application (SPA)
- **Backend:** Node.js RESTful API with WebSocket support
- **Database:** PostgreSQL with Prisma ORM
- **Real-time:** Socket.IO for bidirectional communication
- **AI Integration:** Google Gemini API for intelligent assistance

### 1.3 Key Design Principles

1. **Separation of Concerns:** Clear boundaries between presentation, business logic, and data layers
2. **Role-Based Access Control (RBAC):** Fine-grained permissions for 5 user roles
3. **Real-time Collaboration:** WebSocket-driven updates for multi-user scenarios
4. **Scalable Data Model:** Designed to handle millions of images and annotations
5. **Extensible Architecture:** Plugin-ready for new annotation tools and export formats

---

## 2. Architecture Diagram

See: `docs/diagrams/system_architecture.puml`

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Clients                         │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      │
│  │    Manager    │  │   Annotator   │  │   Reviewer    │  ...  │
│  │   Dashboard   │  │   Workspace   │  │     Queue     │      │
│  └───────────────┘  └───────────────┘  └───────────────┘      │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/WebSocket
┌─────────────────────────────┴────────────────────────────────────┐
│                       Backend API Server                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Express.js / Node.js                        │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────┴───────────────────────────────┐   │
│  │         Auth Middleware (JWT + RBAC)                     │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────┬───────────┴────────┬──────────────────────┐   │
│  │ Controllers: │ /projects          │ /tasks               │   │
│  │              │ /annotations       │ /reviews             │   │
│  │              │ /labels            │ /users               │   │
│  └──────────────┴────────────────────┴──────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────┴───────────────────────────────┐   │
│  │      WebSocket Server (Socket.IO)                        │   │
│  │      Real-time: Tasks, Notifications, Labels             │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼────────────────────────────────────┘
                              │
┌─────────────────────────────┴────────────────────────────────────┐
│                         Core Services                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   Assignment &   │  │    Reputation    │  │  Auto-Save / │  │
│  │Deadline Engine   │  │Scoring Service   │  │Draft Handler │  │
│  │                  │  │                  │  │              │  │
│  │ • Round-robin    │  │ • Quality score  │  │ • Periodic   │  │
│  │ • Skill-based    │  │ • Speed metrics  │  │ • On change  │  │
│  │ • Workload dist. │  │ • Accuracy rate  │  │ • Conflict   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   Notification   │  │   AI Assistant   │  │   Export     │  │
│  │     Service      │  │     Service      │  │   Service    │  │
│  │                  │  │                  │  │              │  │
│  │ • Email (SMTP)   │  │ • Gemini API     │  │ • YOLO       │  │
│  │ • In-app alerts  │  │ • Function call  │  │ • COCO       │  │
│  │ • WebSocket push │  │ • Auto-suggest   │  │ • Pascal VOC │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────┬────────────────────────────────────┘
                              │
┌─────────────────────────────┴────────────────────────────────────┐
│                      Data Persistence Layer                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   PostgreSQL     │  │      Redis       │  │Cloud Storage │  │
│  │   (Primary DB)   │  │ (Cache/Queue)    │  │   (Images)   │  │
│  │                  │  │                  │  │              │  │
│  │ • Users          │  │ • Session store  │  │ • AWS S3     │  │
│  │ • Projects       │  │ • Task queue     │  │ • Cloudinary │  │
│  │ • Images         │  │ • Rate limiting  │  │ • Local FS   │  │
│  │ • Annotations    │  │ • Real-time data │  │              │  │
│  │ • Labels         │  │                  │  │              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Layer Details

### 3.1 Presentation Layer (Frontend Clients)

**Technology:** React 19, TypeScript, Vite, TailwindCSS, Konva.js

#### Components:

1. **Manager Dashboard**
   - Project creation and management
   - Team member assignment
   - Progress tracking and analytics
   - Label category management
   - Export dataset functionality

2. **Annotator Workspace**
   - Canvas-based annotation tool (Konva.js)
   - Drawing tools: Bounding box, polygon, point, line
   - Zoom, pan, undo/redo functionality
   - Task queue and assignment view
   - AI suggestion integration

3. **Reviewer Queue**
   - Review pending submissions
   - Side-by-side comparison
   - Approve/reject with feedback
   - Consensus view for multi-annotator tasks
   - Quality metrics dashboard

4. **Admin Panel**
   - User management (CRUD, roles)
   - System configuration
   - Audit logs
   - Email template management
   - AI chat configuration

5. **Shared Components**
   - Authentication (Login, Register, Reset Password)
   - Notifications center
   - AI chat widget (floating)
   - Profile settings
   - Navigation and routing

#### State Management:
- **Zustand:** Global state (user, auth, notifications)
- **React Query:** Server state caching and synchronization
- **Context API:** Theme, socket connection

#### Communication:
- **Axios:** HTTP client for REST API calls
- **Socket.IO Client:** Real-time event handling

---

### 3.2 Application Layer (Backend API Server)

**Technology:** Node.js, Express.js, TypeScript

#### Middleware Stack:

1. **Authentication Middleware**
   - JWT token verification
   - Token extraction from `Authorization` header
   - User context injection into request object

2. **Authorization Middleware (RBAC)**
   - Role-based access control
   - Permission checking per endpoint
   - Resource ownership validation

3. **Validation Middleware**
   - Request body/query/params validation (Zod)
   - Type safety enforcement

4. **Error Handling Middleware**
   - Centralized error catching
   - Consistent error response format
   - Logging and monitoring integration

#### Controllers:

**Project Controller** (`/api/v1/projects`)
- `POST /` - Create new project
- `GET /` - List projects (with pagination, filters)
- `GET /:id` - Get project details
- `PUT /:id` - Update project
- `DELETE /:id` - Delete project
- `POST /:id/images` - Upload images to project
- `POST /:id/members` - Add team members

**Task Controller** (`/api/v1/tasks`)
- `GET /` - Get assigned tasks (for annotator)
- `GET /:id` - Get task details
- `POST /:id/assign` - Assign task (manual)
- `POST /auto-assign` - Auto-assign tasks
- `POST /:id/submit` - Submit task for review
- `POST /:id/annotations` - Save annotations

**Review Controller** (`/api/v1/reviews`)
- `GET /queue` - Get review queue
- `GET /:taskId` - Get task for review
- `POST /:taskId/approve` - Approve task
- `POST /:taskId/reject` - Reject task with feedback
- `GET /:taskId/consensus` - Compare multiple annotations

**Label Controller** (`/api/v1/labels`)
- `POST /` - Create label
- `GET /` - List labels (with categories)
- `PUT /:id` - Update label
- `DELETE /:id` - Delete label
- `POST /requests` - Submit label request
- `PUT /requests/:id/approve` - Approve label request

**User Controller** (`/api/v1/users`)
- `POST /register` - Register new user
- `POST /login` - Login (email/password)
- `POST /google-auth` - Google OAuth login
- `POST /reset-password` - Request password reset
- `GET /me` - Get current user profile
- `PUT /me` - Update profile

**Admin Controller** (`/api/v1/admin`)
- `GET /users` - List all users
- `PUT /users/:id/role` - Change user role
- `PUT /users/:id/status` - Activate/deactivate user
- `POST /announcements` - Send system announcement
- `GET /audit-logs` - View audit logs
- `PUT /settings/ai-chat` - Configure AI chat

**Notification Controller** (`/api/v1/notifications`)
- `GET /` - Get user notifications
- `PUT /:id/read` - Mark as read
- `DELETE /:id` - Delete notification

**AI Controller** (`/api/v1/ai`)
- `POST /chat` - Send chat message to AI
- `POST /suggest-annotations` - Get AI annotation suggestions

#### WebSocket Server:

**Events Emitted:**
- `system:event` - System-wide events (label created, task assigned)
- `notification:created` - New notification for user
- `task:assigned` - Task assigned to user
- `task:status:changed` - Task status update
- `project:updated` - Project data changed

**Events Received:**
- `subscribe:project` - Subscribe to project updates
- `unsubscribe:project` - Unsubscribe from project

---

### 3.3 Business Logic Layer (Core Services)

#### 1. Assignment & Deadline Engine

**Purpose:** Intelligently assign tasks to annotators and manage deadlines

**Features:**
- **Round-robin assignment:** Distribute tasks evenly
- **Skill-based assignment:** Match task complexity with annotator skill level
- **Workload balancing:** Consider current task count per user
- **Deadline calculation:** Auto-calculate based on image count and complexity
- **Reassignment logic:** Handle task expiration and reassignment

**Database Interactions:**
- Query: `task_assignment`, `users`, `images`
- Write: `task_assignment`, `notifications`

#### 2. Reputation Scoring Service

**Purpose:** Track and calculate annotator quality metrics

**Metrics:**
- **Quality Score:** Based on review approval rate
- **Speed Metrics:** Average time per annotation
- **Accuracy Rate:** Inter-annotator agreement (IoU)
- **Consistency:** Variance across similar images
- **Reputation Level:** Bronze, Silver, Gold, Platinum

**Database Interactions:**
- Query: `task_assignment`, `annotations`, `reviews`
- Write: `user_stats`, `reputation_history`

#### 3. Auto-Save / Draft Handler

**Purpose:** Prevent data loss with automatic drafting

**Features:**
- **Periodic auto-save:** Every 30 seconds (configurable)
- **On-change detection:** Debounced save on annotation changes
- **Conflict resolution:** Detect concurrent edits
- **Draft recovery:** Resume from last saved draft
- **Manual save:** Explicit save button for immediate persistence

**Database Interactions:**
- Query: `annotations`, `drafts`
- Write: `drafts`

#### 4. Notification Service

**Purpose:** Multi-channel notification delivery

**Channels:**
- **In-app:** Real-time notifications via WebSocket
- **Email:** SMTP integration for important events
- **Push (future):** Browser/mobile push notifications

**Event Types:**
- Task assigned
- Task reviewed (approved/rejected)
- Deadline approaching
- Label request approved/rejected
- System announcements

**Database Interactions:**
- Write: `notifications`
- Queue: Redis for email delivery queue

#### 5. AI Assistant Service

**Purpose:** Google Gemini integration for intelligent assistance

**Features:**
- **Chat interface:** Conversational Q&A
- **Function calling:** Execute actions via natural language
  - Create labels
  - Create users
  - Query system information
- **Auto-suggestion:** Recommend annotations based on image content (future)
- **Role-aware prompts:** Different system prompts per user role

**External Dependencies:**
- Google Gemini API (`@google/generative-ai`)

**Database Interactions:**
- Read: All tables (via function registry)
- Write: `labels`, `users` (via function calls)

#### 6. Export Service

**Purpose:** Convert annotations to various ML dataset formats

**Supported Formats:**
- **YOLO:** `.txt` files with normalized bounding boxes
- **COCO:** JSON format with categories, images, annotations
- **Pascal VOC:** XML format per image
- **CSV:** Flat file export for analytics

**Process:**
1. Query all annotations for project
2. Transform to target format schema
3. Generate ZIP archive with images + labels
4. Store temporarily and provide download link

**Database Interactions:**
- Query: `projects`, `images`, `annotations`, `labels`

---

### 3.4 Data Access Layer (Data Persistence)

#### PostgreSQL - Primary Database

**ORM:** Prisma (type-safe query builder)

**Schema Summary:** (18 tables)

**Core Tables:**
- `users` - User accounts and authentication
- `roles` - Role definitions (Guest, Annotator, Reviewer, Manager, Admin)
- `projects` - Annotation projects
- `images` - Images to be annotated
- `labels` - Label definitions with categories
- `annotations` - Bounding box/polygon data

**Workflow Tables:**
- `task_assignment` - Tasks assigned to annotators
- `reviews` - Review feedback and approval status
- `project_members` - Team membership per project

**System Tables:**
- `notifications` - In-app notifications
- `audit_logs` - System activity tracking
- `email_templates` - Customizable email content
- `system_settings` - Global configuration

**Features:**
- **Migrations:** Version-controlled schema changes
- **Seeding:** Mock data for development
- **Indexes:** Optimized for common queries (to be added)
- **Foreign Keys:** Referential integrity enforcement
- **Soft Deletes:** `deletedAt` timestamp for safety

#### Redis - Caching & Queue

**Use Cases:**
- **Session Store:** JWT token blacklist (logout)
- **Task Queue:** Async job processing (email sending, export generation)
- **Rate Limiting:** API throttling per user
- **Real-time Data:** Temporary storage for WebSocket state
- **Cache:** Frequently accessed data (user profiles, label lists)

**Data Structures:**
- Strings: Session tokens, cached JSON
- Lists: Job queues (Bull/BullMQ)
- Sets: Online users, active sessions
- Sorted Sets: Leaderboards, rate limit counters

**TTL Strategy:**
- Session tokens: 7 days
- Cache entries: 15 minutes
- Rate limit counters: 1 hour

#### Cloud Storage - Images

**Options:**
1. **AWS S3** (Production recommended)
   - Scalable, durable, CDN-ready
   - Presigned URLs for secure uploads
   - Lifecycle policies for cost optimization

2. **Cloudinary** (Alternative)
   - Built-in image transformations
   - Automatic format optimization
   - CDN included

3. **Local File System** (Development only)
   - `uploads/` directory
   - Not suitable for production

**Storage Structure:**
```
/projects/{projectId}/images/{imageId}.{ext}
/projects/{projectId}/exports/{exportId}.zip
/temp/{userId}/{tempFileId}
```

**Security:**
- Presigned URLs with expiration (1 hour)
- Content-type validation
- File size limits (10MB per image)
- Virus scanning (ClamAV integration planned)

---

## 4. Technology Stack

### 4.1 Frontend

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | React | 19.x | UI library |
| Language | TypeScript | 5.x | Type safety |
| Build Tool | Vite | 6.x | Fast bundler |
| Styling | TailwindCSS | 3.x | Utility-first CSS |
| Canvas | Konva.js | 9.x | Annotation drawing |
| State | Zustand | 5.x | Global state |
| Data Fetching | React Query | 5.x | Server state |
| HTTP Client | Axios | 1.x | API calls |
| WebSocket | Socket.IO Client | 4.x | Real-time |
| Routing | React Router | 7.x | SPA routing |
| Forms | React Hook Form | 7.x | Form handling |
| Validation | Zod | 3.x | Schema validation |
| UI Components | Radix UI | - | Accessible primitives |
| Notifications | React Hot Toast | 2.x | Toast messages |

### 4.2 Backend

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Runtime | Node.js | 20.x | JavaScript runtime |
| Framework | Express.js | 4.x | Web framework |
| Language | TypeScript | 5.x | Type safety |
| ORM | Prisma | 6.x | Database access |
| Database | PostgreSQL | 16.x | Primary database |
| Cache | Redis | 7.x | Caching/queue |
| WebSocket | Socket.IO | 4.x | Real-time |
| Auth | jsonwebtoken | 9.x | JWT tokens |
| Validation | Zod | 3.x | Input validation |
| Email | Nodemailer | 6.x | SMTP client |
| AI | @google/generative-ai | 0.21.x | Gemini API |
| File Upload | Multer | 1.x | Multipart handling |
| Logging | Winston | 3.x | Structured logging |
| Testing | Jest + Supertest | - | Unit/integration tests |

### 4.3 DevOps & Infrastructure

| Category | Technology | Purpose |
|----------|-----------|---------|
| Version Control | Git + GitHub | Source control |
| Package Manager | npm / pnpm | Dependency management |
| CI/CD | GitHub Actions | Automated testing/deployment |
| Containerization | Docker | Environment consistency |
| Reverse Proxy | Nginx | Load balancing, SSL termination |
| Monitoring | (Planned: Sentry) | Error tracking |
| Analytics | (Planned: Mixpanel) | User behavior tracking |

---

## 5. Component Specifications

### 5.1 Authentication Flow

```
┌─────────┐                 ┌─────────┐                ┌──────────┐
│  Client │                 │   API   │                │ Database │
└────┬────┘                 └────┬────┘                └────┬─────┘
     │                           │                          │
     │ POST /api/v1/users/login  │                          │
     │ { email, password }       │                          │
     ├──────────────────────────>│                          │
     │                           │                          │
     │                           │ SELECT * FROM users      │
     │                           │ WHERE email = ?          │
     │                           ├─────────────────────────>│
     │                           │                          │
     │                           │ User record              │
     │                           │<─────────────────────────┤
     │                           │                          │
     │                           │ bcrypt.compare()         │
     │                           │ (verify password)        │
     │                           │                          │
     │                           │ jwt.sign()               │
     │                           │ (generate token)         │
     │                           │                          │
     │ 200 OK                    │                          │
     │ { token, user }           │                          │
     │<──────────────────────────┤                          │
     │                           │                          │
     │ Store token in            │                          │
     │ localStorage              │                          │
     │                           │                          │
     │ Future requests:          │                          │
     │ Authorization: Bearer {token}                        │
     ├──────────────────────────>│                          │
     │                           │                          │
     │                           │ jwt.verify()             │
     │                           │ (decode token)           │
     │                           │                          │
     │                           │ req.user = decoded       │
     │                           │                          │
```

### 5.2 Task Assignment Flow

```
Manager creates project with 100 images
         │
         ▼
Manager adds 5 annotators to project
         │
         ▼
Manager clicks "Auto-Assign Tasks"
         │
         ▼
Assignment Engine calculates:
  - Images per annotator: 100 / 5 = 20 each
  - Considers current workload per user
  - Applies round-robin or skill-based logic
         │
         ▼
Creates task_assignment records:
  - Annotator A: Images 1-20
  - Annotator B: Images 21-40
  - Annotator C: Images 41-60
  - Annotator D: Images 61-80
  - Annotator E: Images 81-100
         │
         ▼
Notification Service sends:
  - In-app notification to each annotator
  - Email: "You have 20 new tasks assigned"
  - WebSocket event: "task:assigned"
         │
         ▼
Annotators see tasks in their queue
```

### 5.3 Annotation Submission Flow

```
Annotator opens task
         │
         ▼
Loads image in Konva canvas
         │
         ▼
Draws bounding boxes (stores in local state)
         │
         ▼
Auto-save every 30 seconds
  → POST /api/v1/tasks/:id/draft
  → Status: DRAFT
         │
         ▼
Annotator clicks "Submit for Review"
         │
         ▼
Frontend validates:
  - At least 1 annotation exists
  - All annotations have labels
         │
         ▼
POST /api/v1/tasks/:id/submit
  → Status: PENDING_REVIEW
  → Saves all annotations to DB
         │
         ▼
Backend creates notification for reviewer
         │
         ▼
WebSocket broadcasts:
  - "task:status:changed" to project members
  - "notification:created" to reviewer
         │
         ▼
Reviewer sees task in review queue
```

### 5.4 Review Workflow

```
Reviewer opens task from queue
         │
         ▼
Loads image + annotations
         │
         ▼
Reviews quality:
  - Bounding box accuracy
  - Label correctness
  - Annotation completeness
         │
         ├─────────────────┬─────────────────┐
         ▼                 ▼                 ▼
    APPROVE           REJECT            RE-ANNOTATE
         │                 │                 │
         ▼                 ▼                 ▼
  Status: COMPLETED  Status: REJECTED  Status: IN_PROGRESS
  Reputation +10     Reputation -5     Reassign to annotator
         │                 │                 │
         ▼                 ▼                 ▼
  Notify annotator  Notify annotator  Notify annotator
  (success)         (with feedback)    (redo request)
         │                 │                 │
         ▼                 ▼                 ▼
  Update project    Update project    Update project
  progress          progress          progress
```

### 5.5 Real-time Label Creation (WebSocket)

```
User A: Manager creates label via AI chat
         │
         ▼
AI Function: create_labels_with_category()
         │
         ▼
Database: INSERT INTO labels
         │
         ▼
Broadcast Service:
  broadcastToAll('label:created', {
    count: 3,
    labels: ['Car', 'Truck', 'Bus'],
    triggeredBy: 'user-a-id',
    source: 'ai'
  })
         │
         ├──────────────────────────────────┐
         ▼                                  ▼
    User A (Manager)              User B (Annotator)
    - Checks: isMyAction = true   - Checks: isMyAction = false
    - Checks: source = 'ai'       - Silently refreshes label list
    - Shows toast: "Created 3 labels"  - No toast shown
    - Refreshes label list        - Sees new labels immediately
```

---

## 6. Data Flow

### 6.1 Project Creation Flow

```
1. Manager fills project form:
   - Name, description
   - Label categories
   - Team members (optional)

2. POST /api/v1/projects
   Request: {
     name: "Self-Driving Car Dataset",
     description: "Urban traffic scenes",
     categories: ["Vehicle", "Pedestrian", "Traffic Sign"]
   }

3. Backend Service:
   a. Validate input (Zod schema)
   b. Check authorization (Manager role)
   c. BEGIN TRANSACTION
      - INSERT INTO projects
      - INSERT INTO label_categories (3 records)
      - INSERT INTO project_members (add creator)
   d. COMMIT TRANSACTION

4. Response:
   {
     "id": "proj-uuid",
     "name": "Self-Driving Car Dataset",
     "status": "ACTIVE",
     "imageCount": 0,
     "memberCount": 1,
     "createdAt": "2026-01-23T15:30:00Z"
   }

5. Frontend:
   - Navigate to project detail page
   - Show success toast
   - Display upload images wizard
```

### 6.2 Image Upload Flow

```
1. Manager uploads images (drag & drop / file picker)

2. Frontend:
   - Validates file types (jpg, png)
   - Validates file sizes (<10MB each)
   - Shows upload progress per file

3. POST /api/v1/projects/:id/images (multipart/form-data)
   - Uses multer middleware
   - Stores files in memory buffer

4. Backend Service:
   FOR EACH uploaded file:
     a. Generate unique filename
     b. Upload to cloud storage (S3/Cloudinary)
     c. Get public URL
     d. INSERT INTO images (projectId, url, filename, size)

5. Response:
   {
     "uploaded": 50,
     "failed": 0,
     "images": [
       { "id": "img-uuid-1", "url": "https://..." },
       ...
     ]
   }

6. Frontend:
   - Updates project image count
   - Enables "Auto-Assign Tasks" button
```

### 6.3 Annotation Data Flow

```
Annotation Object Structure:
{
  "id": "annot-uuid",
  "taskAssignmentId": "task-uuid",
  "imageId": "img-uuid",
  "labelId": "label-uuid",
  "type": "BOUNDING_BOX",
  "coordinates": {
    "x": 120,      // Top-left X
    "y": 80,       // Top-left Y
    "width": 200,  // Box width
    "height": 150  // Box height
  },
  "confidence": 1.0,  // 1.0 = manual, <1.0 = AI suggested
  "createdBy": "user-uuid",
  "createdAt": "2026-01-23T15:45:00Z"
}

Database Storage:
┌─────────────────────────────────────┐
│ annotations table                   │
├─────────────────────────────────────┤
│ id (uuid)                           │
│ task_assignment_id (fk)             │
│ image_id (fk)                       │
│ label_id (fk)                       │
│ type (enum)                         │
│ coordinates (jsonb)                 │
│ confidence (decimal)                │
│ created_by (fk)                     │
│ created_at (timestamp)              │
└─────────────────────────────────────┘

Export Format (YOLO):
# image1.txt
0 0.35 0.42 0.15 0.12   # Class 0 (Car): center_x, center_y, width, height (normalized)
1 0.65 0.38 0.10 0.18   # Class 1 (Person)

Export Format (COCO JSON):
{
  "images": [
    { "id": 1, "file_name": "image1.jpg", "width": 1920, "height": 1080 }
  ],
  "annotations": [
    {
      "id": 1,
      "image_id": 1,
      "category_id": 1,
      "bbox": [120, 80, 200, 150],  // [x, y, width, height]
      "area": 30000,
      "iscrowd": 0
    }
  ],
  "categories": [
    { "id": 1, "name": "Car", "supercategory": "Vehicle" }
  ]
}
```

---

## 7. Security Architecture

### 7.1 Authentication

**JWT Token Structure:**
```json
{
  "sub": "user-uuid",           // Subject (user ID)
  "email": "user@example.com",
  "role": "ANNOTATOR",
  "iat": 1706025600,            // Issued at
  "exp": 1706630400             // Expires (7 days)
}
```

**Token Storage:**
- Frontend: `localStorage` (key: `auth_token`)
- Backend validation: JWT secret key (environment variable)

**Token Refresh:** Not implemented yet (future: refresh token rotation)

### 7.2 Authorization (RBAC)

**Role Hierarchy:**
```
Guest (unauthenticated)
  │
  └─> Annotator (can annotate)
        │
        └─> Reviewer (can review)
              │
              └─> Manager (can manage projects)
                    │
                    └─> Admin (full access)
```

**Permission Matrix:**

| Resource | Guest | Annotator | Reviewer | Manager | Admin |
|----------|-------|-----------|----------|---------|-------|
| Register/Login | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Assigned Tasks | ❌ | ✅ | ✅ | ✅ | ✅ |
| Submit Annotations | ❌ | ✅ | ✅ | ✅ | ✅ |
| Review Tasks | ❌ | ❌ | ✅ | ✅ | ✅ |
| Approve/Reject | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create Project | ❌ | ❌ | ❌ | ✅ | ✅ |
| Assign Tasks | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage Labels | ❌ | ❌ | ❌ | ✅ | ✅ |
| Export Dataset | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ❌ | ✅ |
| System Settings | ❌ | ❌ | ❌ | ❌ | ✅ |

**Middleware Implementation:**
```typescript
// Example: Protect endpoint for Manager+ only
router.post('/projects',
  authenticate,           // Verify JWT
  authorize(['MANAGER', 'ADMIN']),  // Check role
  projectController.create
);

// Example: Resource ownership check
router.put('/tasks/:id/submit',
  authenticate,
  checkTaskOwnership,     // Ensure user is assigned to this task
  taskController.submit
);
```

### 7.3 Data Security

**Sensitive Data Protection:**
- Passwords: bcrypt hashing (salt rounds: 10)
- API keys: Environment variables, never committed to git
- JWT secret: Strong random string (256-bit)

**SQL Injection Prevention:**
- Prisma ORM: Parameterized queries by default
- Input validation: Zod schemas reject malicious input

**XSS Prevention:**
- React: Auto-escapes by default
- CSP headers: Content-Security-Policy (to be added)

**CSRF Prevention:**
- SameSite cookies (to be implemented)
- CSRF tokens for state-changing operations (to be implemented)

**Rate Limiting:**
```typescript
// Example: Login endpoint rate limit
// 5 attempts per 15 minutes per IP
limiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts, please try again later"
})
```

---

## 8. Scalability Considerations

### 8.1 Current Architecture Limitations

**Monolithic Design:**
- Single server handles all requests
- Vertical scaling only (add more CPU/RAM)
- Single point of failure

**Database:**
- PostgreSQL primary-only (no replicas)
- No connection pooling optimization
- Missing database indexes on frequent queries

**File Storage:**
- Local file system in development
- No CDN for image delivery

### 8.2 Horizontal Scaling Strategy

**Phase 1: Load Balancing (Target: 1000 concurrent users)**
```
                    ┌─────────────┐
                    │   Nginx     │
                    │Load Balancer│
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
      ┌─────▼────┐   ┌─────▼────┐   ┌─────▼────┐
      │ Node.js  │   │ Node.js  │   │ Node.js  │
      │Instance 1│   │Instance 2│   │Instance 3│
      └─────┬────┘   └─────┬────┘   └─────┬────┘
            │              │              │
            └──────────────┼──────────────┘
                           │
                    ┌──────▼──────┐
                    │  PostgreSQL │
                    │   Primary   │
                    └─────────────┘
```

**Requirements:**
- Stateless API servers (move sessions to Redis)
- Sticky sessions for WebSocket connections
- Shared Redis for session store and cache

**Phase 2: Database Replication (Target: 5000 concurrent users)**
```
Write requests → PostgreSQL Primary
                     │
                     │ Replication
                     ▼
Read requests  → PostgreSQL Replica 1
                 PostgreSQL Replica 2
```

**Benefits:**
- Read-heavy workloads distributed
- Failover capability
- Backup without impacting primary

**Phase 3: Microservices (Target: 50,000+ concurrent users)**
```
┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
│  API       │   │ Annotation │   │  Review    │   │  Export    │
│ Gateway    │   │  Service   │   │  Service   │   │  Service   │
└────────────┘   └────────────┘   └────────────┘   └────────────┘
      │                │                │                │
      └────────────────┴────────────────┴────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Message Queue    │
                    │  (RabbitMQ/Kafka) │
                    └───────────────────┘
```

**Services to Extract:**
1. **Annotation Service:** Handle canvas operations, auto-save
2. **Review Service:** Task review workflow
3. **Export Service:** Dataset generation (CPU-intensive)
4. **Notification Service:** Email and push notifications
5. **AI Service:** Gemini API calls (rate limit isolated)

### 8.3 Caching Strategy

**Redis Cache Layers:**

1. **User Profile Cache** (TTL: 1 hour)
   - Key: `user:{userId}`
   - Value: User object JSON
   - Invalidate on profile update

2. **Label List Cache** (TTL: 30 minutes)
   - Key: `labels:project:{projectId}`
   - Value: Array of label objects
   - Invalidate on label create/update/delete

3. **Project Metadata Cache** (TTL: 15 minutes)
   - Key: `project:{projectId}:meta`
   - Value: Project details + stats
   - Invalidate on project update

4. **Task Assignment Cache** (TTL: 5 minutes)
   - Key: `tasks:user:{userId}:pending`
   - Value: Array of task IDs
   - Invalidate on task status change

**Cache Invalidation Strategy:**
- Write-through: Update DB + cache simultaneously
- Cache-aside: Read from cache, fallback to DB on miss
- Pub/Sub: Redis pubsub for distributed cache invalidation

### 8.4 CDN Integration

**Static Asset Delivery:**
- Frontend bundle: CloudFlare CDN
- Images: AWS CloudFront (S3 origin)
- API responses: Not cached (dynamic content)

**Benefits:**
- Reduced latency (geographically distributed)
- Reduced bandwidth costs
- DDoS protection

---

## 9. Design Decisions

### 9.1 Why Monolithic Architecture?

**Decision:** Start with monolithic architecture, not microservices

**Rationale:**
1. **Team Size:** Small development team (3-5 developers)
2. **Faster Development:** Single codebase, easier debugging
3. **Lower Operational Complexity:** No container orchestration needed initially
4. **Cost:** Single server cheaper than multiple services
5. **MVP Focus:** Get to market faster, optimize later

**Trade-offs:**
- ✅ Simpler deployment and monitoring
- ✅ Easier local development setup
- ❌ Harder to scale horizontally
- ❌ Single point of failure
- ❌ Entire app redeploys for small changes

**Migration Path:** Extract services when specific bottlenecks identified (export service likely first)

### 9.2 Why PostgreSQL over NoSQL?

**Decision:** Use PostgreSQL as primary database

**Rationale:**
1. **Relational Data:** Strong relationships (projects → images → annotations → labels)
2. **ACID Transactions:** Critical for task assignment integrity
3. **Complex Queries:** JOIN operations for analytics and reporting
4. **Mature Ecosystem:** Well-understood, excellent tooling
5. **JSONB Support:** Flexible schema for annotation coordinates

**Trade-offs:**
- ✅ Data integrity guarantees
- ✅ Rich query capabilities (aggregations, window functions)
- ✅ Prisma ORM provides type safety
- ❌ Harder to scale horizontally than NoSQL
- ❌ Schema migrations require planning

**When NoSQL Makes Sense:**
- Redis: Session store, cache, queue (complementary use)
- MongoDB: If annotation schema becomes highly variable (not currently needed)

### 9.3 Why Socket.IO over Raw WebSockets?

**Decision:** Use Socket.IO library for WebSocket communication

**Rationale:**
1. **Automatic Reconnection:** Handles network issues gracefully
2. **Fallback Support:** Polling fallback for restrictive networks
3. **Room/Namespace Support:** Easy project-level broadcasting
4. **Built-in Heartbeat:** Detects stale connections
5. **Event-based API:** Cleaner than raw WebSocket message parsing

**Trade-offs:**
- ✅ Less boilerplate code
- ✅ Better error handling
- ✅ Scales with Redis adapter
- ❌ Slightly larger bundle size
- ❌ Adds abstraction layer

### 9.4 Why Konva.js over Canvas API?

**Decision:** Use Konva.js for annotation canvas

**Rationale:**
1. **Object Model:** Treat shapes as objects (not just pixels)
2. **Event Handling:** Built-in mouse/touch event system
3. **Layers:** Separate background/annotations/UI layers
4. **Transformers:** Easy resize/rotate handles
5. **Export:** Built-in toDataURL() for thumbnails

**Trade-offs:**
- ✅ Faster development of complex interactions
- ✅ Better performance for many shapes
- ✅ Mobile-friendly touch events
- ❌ Learning curve for developers
- ❌ Library dependency (40KB gzipped)

**Alternatives Considered:**
- Fabric.js: Similar features, larger bundle
- Raw Canvas API: Too low-level, slow development
- SVG-based: Performance issues with many annotations

### 9.5 Why Google Gemini over OpenAI?

**Decision:** Use Google Gemini API for AI features

**Rationale:**
1. **Function Calling:** Native support for tool use
2. **Cost:** Competitive pricing for similar capabilities
3. **Multimodal:** Future support for image understanding
4. **Rate Limits:** Generous free tier for development
5. **JSON Output:** Structured responses for UI rendering

**Trade-offs:**
- ✅ Integrated with Google Cloud ecosystem
- ✅ Lower latency in some regions
- ✅ Good TypeScript SDK
- ❌ Less mature than OpenAI
- ❌ Smaller community and fewer examples

**Migration Plan:** Abstract AI service interface to allow provider switching

---

## 10. Future Enhancements

### 10.1 Short-term (Next 3 Months)

1. **Database Optimization**
   - Add indexes on foreign keys
   - Add composite indexes for common queries
   - Implement connection pooling (PgBouncer)

2. **Testing Infrastructure**
   - Unit tests for services (Jest)
   - Integration tests for API endpoints (Supertest)
   - E2E tests for critical workflows (Playwright)
   - CI/CD pipeline with automated testing

3. **Error Monitoring**
   - Sentry integration for error tracking
   - Structured logging with Winston
   - Log aggregation (ELK stack or similar)

4. **Performance Monitoring**
   - APM tool (New Relic or DataDog)
   - Database query performance tracking
   - Frontend performance metrics (Web Vitals)

### 10.2 Medium-term (3-6 Months)

1. **Advanced Annotation Tools**
   - Polygon annotation (freehand + point-by-point)
   - Semantic segmentation (pixel-level masking)
   - Keypoint annotation (pose estimation)
   - 3D bounding boxes (autonomous driving)

2. **AI-Assisted Annotation**
   - Auto-suggestion using computer vision models
   - Active learning: prioritize uncertain images
   - Pre-labeling with YOLO/Detectron2
   - Smart polygon interpolation

3. **Enhanced Review System**
   - Consensus view for multi-annotator tasks
   - Inter-annotator agreement metrics (IoU, Dice)
   - Annotation diffing (highlight differences)
   - Bulk approve/reject operations

4. **Advanced Export Formats**
   - TensorFlow TFRecord
   - PyTorch dataset format
   - Labelbox JSON
   - Custom template system

### 10.3 Long-term (6-12 Months)

1. **Video Annotation**
   - Frame-by-frame annotation
   - Object tracking across frames
   - Keyframe interpolation
   - Video timeline scrubbing

2. **Collaborative Features**
   - Real-time collaborative editing (CRDT)
   - Annotation comments and discussion threads
   - @mentions in feedback
   - Version history and rollback

3. **Mobile App**
   - React Native mobile app
   - Offline annotation mode
   - Mobile-optimized drawing tools
   - Push notifications

4. **Enterprise Features**
   - SSO integration (SAML, LDAP)
   - Custom role definitions
   - Multi-tenancy support
   - Whitelabel customization
   - On-premise deployment option

5. **Analytics & Insights**
   - Annotator performance dashboard
   - Project timeline visualization
   - Cost estimation per project
   - Quality trends over time
   - Predictive task completion estimates

---

## Appendix

### A. Glossary

- **Annotation:** Labeled region on an image (bounding box, polygon, etc.)
- **Task Assignment:** Image assigned to specific annotator
- **Consensus:** Agreement between multiple annotators on the same image
- **IoU (Intersection over Union):** Metric to measure annotation overlap
- **Draft:** Saved but not submitted annotation
- **Reputation:** Quality score for annotators
- **YOLO:** Popular object detection dataset format
- **COCO:** Common Objects in Context dataset format
- **Pascal VOC:** Visual Object Classes dataset format

### B. References

- **Prisma Documentation:** https://www.prisma.io/docs
- **React Documentation:** https://react.dev
- **Socket.IO Documentation:** https://socket.io/docs
- **Konva.js Documentation:** https://konvajs.org/docs
- **Google Gemini API:** https://ai.google.dev/docs
- **YOLO Format Specification:** https://github.com/ultralytics/yolov5/wiki
- **COCO Format Specification:** https://cocodataset.org/#format-data

### C. Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-23 | Initial system design document created |

---

**Document Status:** ✅ Complete
**Review Required:** Yes (Team review recommended)
**Next Update:** 2026-02-23 (or when architecture changes)
