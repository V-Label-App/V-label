# V-Label - Project Overview

> Quick reference guide for understanding the V-Label architecture and system design

**Last Updated:** 2026-01-14

---

## What is V-Label?

**V-Label** is a web-based data labeling platform designed to support **manual image annotation workflows** for training and evaluating machine learning models. The system manages the **entire labeling lifecycle** from project creation and task assignment to annotation, review, quality monitoring, and data export.

### Core Purpose
- Enable structured and scalable **manual image annotation** for ML datasets
- Enforce **role-based access control** for labeling and review workflows
- Improve **label consistency and quality tracking** through review system
- Support **standardized data export** for machine learning pipelines
- Provide optional **AI-assisted labeling suggestions** to improve efficiency

### Core Problems Addressed
- Manual labeling is time-consuming and difficult to scale
- Inconsistent labels across multiple annotators
- Lack of visibility into progress and quality metrics
- Difficulty standardizing and exporting data into ML-ready formats

---

## Project Structure (Monorepo)

```
V-label-app/
├── client/                   # React frontend (Port 5173)
├── server/                   # Node.js/Express API server (Port 4000)
├── docs/                     # Project documentation
├── docker-compose.yml        # PostgreSQL setup
└── README.md                 # Quick start guide
```

### Key Documentation Files
- `docs/00_overview.md` - Project overview (this file)
- `docs/01_business.md` - Business requirements
- `docs/02_requirements.md` - Functional requirements
- `docs/03_architecture.md` - System architecture
- `docs/04_database.md` - Database design
- `docs/05_api.md` - API documentation
- `docs/06_security.md` - Security guidelines
- `docs/07_dev_guide.md` - Development guide
- `docs/08_deployment.md` - Deployment guide
- `docs/09_roadmap.md` - Project roadmap
- `docs/10_coding_rules.md` - Coding standards

---

## Technology Stack

### Backend (server/)
- **Runtime:** Node.js 18+ with TypeScript (ES Modules)
- **Framework:** Express.js 5.2
- **Database:** PostgreSQL 15/16 (via Docker)
- **ORM:** Prisma 6.19
- **Authentication:** JWT (jsonwebtoken) + bcrypt
- **Validation:** Zod 4.3
- **Security:** Helmet, CORS, rate-limit
- **Dev Tools:** TSX, Nodemon, Prisma Studio

### Frontend (client/)
- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 7.2
- **Routing:** React Router DOM 7.12
- **Styling:** Tailwind CSS 3.4
- **State Management:** Zustand 5.0
- **Canvas/Drawing:** Konva 10.0 + React-Konva 19.2
- **HTTP Client:** Axios 1.13
- **UI Notifications:** Sonner 2.0

### Database
- **Primary DB:** PostgreSQL 15 (Docker)
- **Port:** 5433 (to avoid conflicts with other instances)
- **ORM:** Prisma (type-safe queries, migrations)
- **Connection:** `postgresql://vlabel_user:vlabel_password@localhost:5433/vlabel_db`

---

## System Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────┐
│                  Client Layer                       │
│  ┌──────────────────────────────────────────────┐  │
│  │  React Frontend (Port 5173)                  │  │
│  │  - Annotation Canvas (Konva)                 │  │
│  │  - Project Management UI                     │  │
│  │  - Review Dashboard                          │  │
│  └──────────────┬───────────────────────────────┘  │
└─────────────────┼───────────────────────────────────┘
                  │ HTTP REST
                  │ (JWT Auth)
                  ▼
┌─────────────────────────────────────────────────────┐
│              Backend API (Port 4000)                │
│  ┌──────────────────────────────────────────────┐  │
│  │  Express.js + Middlewares                    │  │
│  │  - Helmet, CORS, Rate Limit                  │  │
│  │  - Request Logger, Error Handler             │  │
│  └──────────┬───────────────────────────────────┘  │
│             │                                       │
│  ┌──────────┴──────────┐                          │
│  │   Route Handlers     │                          │
│  │  /api/v1/auth       │                          │
│  │  /api/v1/projects   │                          │
│  │  /api/v1/tasks      │                          │
│  │  /api/v1/annotations│                          │
│  └──────────┬───────────┘                          │
│             │                                       │
│  ┌──────────┴──────────────────────────────┐      │
│  │         Services Layer                   │      │
│  │  - AuthService (Login, Register, JWT)   │      │
│  │  - ProjectService                        │      │
│  │  - TaskService                           │      │
│  │  - AnnotationService                     │      │
│  └──────────┬───────────────────────────────┘      │
└─────────────┼─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│         PostgreSQL Database (Port 5433)             │
│  ┌──────────────────────────────────────────────┐  │
│  │  Tables:                                     │  │
│  │  - users                                     │  │
│  │  - projects                                  │  │
│  │  - project_members                           │  │
│  │  - tasks                                     │  │
│  │  - task_assignments                          │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Key API Endpoints

**Authentication:**
- `POST /api/v1/auth/login` - User login (email/password)
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/dev/login` - Dev bypass login (dev only)
- `GET /api/v1/health` - Health check

**Projects (Planned):**
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/:id` - Get project details
- `PUT /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project

**Tasks (Planned):**
- `GET /api/v1/projects/:id/tasks` - List tasks
- `POST /api/v1/projects/:id/tasks` - Create tasks
- `PUT /api/v1/tasks/:id` - Update task
- `POST /api/v1/tasks/:id/assign` - Assign task

**Annotations (Planned):**
- `GET /api/v1/tasks/:id/annotations` - Get annotations
- `POST /api/v1/tasks/:id/annotations` - Submit annotations
- `PUT /api/v1/annotations/:id` - Update annotation
- `POST /api/v1/annotations/:id/review` - Review annotation

---

## Core Features

### 1. User Management & Authentication

**User Roles:**
- `ADMIN` - System administrator
- `MANAGER` - Project manager
- `REVIEWER` - Quality reviewer
- `ANNOTATOR` - Data annotator

**Authentication Providers:**
- `LOCAL` - Email/password authentication
- `GOOGLE` - Google OAuth (planned)

**User Features:**
- Email/password registration and login
- JWT-based authentication (access + refresh tokens)
- Role-based access control (RBAC)
- User profile management
- Reputation scoring system

### 2. Project Management

**Project Lifecycle:**
```
DRAFT → ACTIVE → PAUSED → COMPLETED → ARCHIVED
```

**Project Features:**
- Create and configure labeling projects
- Define custom label sets per project (stored as JSON)
- Set project deadlines
- Enable/disable AI assistance per project
- Invite team members to projects
- Track project progress and statistics

**Label Configuration:**
Projects can define custom label sets with properties like:
```json
[
  {"id": "car", "color": "#FF0000", "type": "bbox"},
  {"id": "person", "color": "#00FF00", "type": "polygon"}
]
```

### 3. Task Assignment System

**Task Status:**
```
TODO → IN_PROGRESS → DONE
```

**Assignment Status:**
```
ASSIGNED → IN_PROGRESS → SUBMITTED → 
    ↓ REJECTED (rework) → IN_PROGRESS
    ↓ APPROVED (final)
    ↓ SKIPPED
```

**Task Features:**
- Bulk task creation from image uploads
- Automatic or manual task assignment
- Task deadline management
- Task redistribution policies
- Progress tracking per user

### 4. Annotation Capabilities

**Supported Annotation Types:**
- **Image Classification** - Assign labels to entire images
- **Object Detection** - Bounding boxes around objects
- **Segmentation** - Polygon-based region annotation

**Annotation Features:**
- Interactive canvas-based annotation (Konva.js)
- Multi-object annotation support
- Annotation metadata storage (JSON format)
- AI-generated suggestions (optional flag)
- Annotation versioning and history
- Annotator notes and comments

**Data Model:**
```typescript
{
  annotations: {
    objects: [
      {
        type: "bbox" | "polygon" | "point",
        label: "car",
        coordinates: [...],
        confidence?: 0.95 // if AI-generated
      }
    ]
  },
  isAiGenerated: boolean
}
```

### 5. Review & Quality Control

**Review Workflow:**
1. Annotator submits completed task
2. System assigns task to reviewer
3. Reviewer inspects annotations
4. Reviewer provides score (1-10) and comments
5. Reviewer approves or rejects
6. If rejected, task returns to annotator

**Quality Metrics:**
- **Reputation Score** - Aggregated user quality score (default: 100.0)
- **Total Tasks Done** - Productivity metric
- **Review Score** - Per-task quality rating (1-10)
- **Approval Rate** - Percentage of approved annotations
- **Rejection Tracking** - Common rejection reasons

### 6. Reputation System

**Purpose:** Incentivize high-quality work and identify top performers

**Scoring Mechanism:**
- All users start with reputation score: 100.0
- Score increases with approved tasks
- Score decreases with rejected tasks
- Score displayed on user profile and leaderboards

**Use Cases:**
- Prioritize task assignment to high-reputation users
- Identify users needing additional training
- Gamification and incentives

---

## Database Schema Overview

### Users Table
- UUID-based unique identifiers
- Email-based authentication
- Role-based access (enum: ADMIN, MANAGER, REVIEWER, ANNOTATOR)
- Provider support (LOCAL, GOOGLE)
- Reputation scoring fields
- Timestamps (createdAt, updatedAt)

### Projects Table
- Project metadata (name, description, status)
- Custom label configuration (JSON)
- AI assistance flag (per-project toggle)
- Deadline tracking
- Status lifecycle management

### Tasks Table
- Link to parent project
- Image URL storage
- Task status tracking
- One-to-many relationship with assignments

### Task Assignments Table
- Links task to annotator and reviewer
- Stores annotation data (JSON)
- Assignment status workflow
- Review scoring and feedback
- AI generation flag
- Deadline and timestamp tracking

### Project Members Table
- Many-to-many relationship (users ↔ projects)
- Join date tracking
- Access control enforcement

---

## Labeling Workflow (Detailed)

### Phase 1: Project Setup (Manager)
```
1. Manager creates project
2. Manager defines label configuration
3. Manager sets project parameters
4. Manager invites team members
5. Manager uploads images
6. System creates tasks from images
```

### Phase 2: Task Assignment (Manager/Auto)
```
7. Manager assigns tasks to annotators
   OR
   System auto-assigns based on availability/reputation
8. Annotator receives task notification
```

### Phase 3: Annotation (Annotator)
```
9. Annotator opens task
10. Annotator views image and guidelines
11. Annotator draws annotations on canvas
12. (Optional) System provides AI suggestions
13. Annotator reviews and corrects
14. Annotator adds notes (optional)
15. Annotator submits for review
```

### Phase 4: Review (Reviewer)
```
16. Reviewer receives assigned task
17. Reviewer inspects annotations
18. Reviewer provides score (1-10)
19. Reviewer writes feedback comments
20. Reviewer approves or rejects
    → If approved: task moves to DONE
    → If rejected: task returns to annotator
```

### Phase 5: Export (Manager/Admin)
```
21. Manager views completed tasks
22. Manager selects export format
23. System generates dataset export
24. Manager downloads ML-ready data
```

---

## Supported Annotation Types (Detail)

### 1. Image Classification
- **Use Case:** Categorize entire image (e.g., "cat", "dog", "car")
- **Output:** Single label or multi-label tags per image
- **UI:** Tag selector or dropdown

### 2. Object Detection (Bounding Box)
- **Use Case:** Locate objects with rectangular boxes
- **Output:** `{x, y, width, height, label}`
- **UI:** Click-and-drag rectangle tool

### 3. Segmentation (Polygon)
- **Use Case:** Precise object boundary annotation
- **Output:** Array of polygon vertices `{x, y}[]`
- **UI:** Click-to-place polygon points

> Future support may include: keypoint detection, instance segmentation, 3D cuboids

---

## Quality Management

### Metrics Tracked
- **Per-User Metrics:**
  - Total tasks completed
  - Average review score
  - Approval rate (approved / total reviewed)
  - Rejection rate
  - Reputation score

- **Per-Project Metrics:**
  - Total tasks (TODO, IN_PROGRESS, DONE)
  - Completion percentage
  - Average annotation time
  - Average review score
  - Inter-annotator agreement (planned)

### Quality Enforcement
- Tasks below quality threshold require rework
- Low-reputation users may receive simpler tasks
- High-reputation users unlock priority assignments
- Review comments guide improvement

---

## Data Export (Planned)

### Export Formats
- **COCO JSON** - Common Objects in Context format
- **YOLO TXT** - YOLO model training format
- **Pascal VOC XML** - Pascal VOC challenge format
- **CSV** - Simple tabular export

### Export Options
- Export all or selected tasks
- Filter by status (approved only, all submitted, etc.)
- Include metadata (annotator, review score, timestamps)
- Export history and versioning

---

## Optional: AI-Assisted Annotation

**Feature Flag:** `enableAiAssistance` (per-project)

**How It Works:**
1. System pre-annotates images using AI model
2. Annotator receives task with AI suggestions
3. Annotations marked as `isAiGenerated: true`
4. Annotator reviews, corrects, and approves
5. Final decision remains human-controlled

**Benefits:**
- Faster annotation (pre-filled labels)
- Reduced manual effort for simple cases
- Focus human effort on edge cases

**Limitations:**
- AI suggestions may be incorrect
- Requires human verification
- Model quality depends on training data

---

## User Roles (Detailed)

### Annotator
- **Primary Job:** Label images according to guidelines
- **Permissions:**
  - View assigned tasks
  - Submit annotations
  - View own statistics
- **Cannot:**
  - Create projects
  - Assign tasks
  - Delete data

### Reviewer
- **Primary Job:** Ensure annotation quality
- **Permissions:**
  - Everything Annotator can do
  - Review submitted annotations
  - Approve or reject tasks
  - Provide feedback and scores
- **Cannot:**
  - Create projects
  - Manage users

### Manager
- **Primary Job:** Manage labeling projects
- **Permissions:**
  - Everything Reviewer can do
  - Create and configure projects
  - Upload images and create tasks
  - Assign tasks to users
  - View project analytics
  - Export datasets
- **Cannot:**
  - Manage system users (only project members)
  - Change system settings

### Admin
- **Primary Job:** System administration
- **Permissions:**
  - Full access to all features
  - Manage all users and roles
  - Configure system settings
  - View system logs
  - Enable/disable AI features
- **Responsibility:**
  - Ensure system health
  - Manage access control
  - Monitor activity

---

## Development Setup

### Prerequisites
- **Node.js:** v18+ (recommended: v22)
- **Docker:** For PostgreSQL database
- **npm:** v8+

### Running Locally

```bash
# Clone repository
cd V-label-app

# Install dependencies (both client & server)
npm install

# Setup database
cd server
npm run db:setup          # Start PostgreSQL (port 5433)
npm run db:migrate        # Run Prisma migrations
npm run db:seed           # Seed dev users (optional)

# Start backend
npm run dev               # Port 4000 (with Prisma Studio)
# OR
npm run dev:watch         # With auto-reload

# Start frontend (new terminal)
cd client
npm run dev               # Port 5173
```

### Required Environment Variables

**Server (.env):**
```bash
PORT=4000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5433
DB_NAME=vlabel_db
DB_USER=vlabel_user
DB_PASSWORD=vlabel_password
DATABASE_URL=postgresql://vlabel_user:vlabel_password@localhost:5433/vlabel_db?schema=public

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Logging
LOG_LEVEL=debug
```

**Client (.env):**
```bash
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

### Common Commands

```bash
# Backend
npm run dev              # Start server (no auto-reload)
npm run dev:watch        # Start server (with auto-reload)
npm run db:setup         # Start PostgreSQL
npm run db:stop          # Stop PostgreSQL
npm run db:reset         # Reset database (removes all data)
npm run db:migrate       # Apply schema changes & migrate
npm run db:studio        # Open Prisma Studio GUI
npm run db:generate      # Regenerate Prisma Client
npm run db:seed          # Seed development data

# Frontend
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Lint code
```

---

## Current Status

### Phase: Early Development

**Implemented:**
- ✅ Database schema (Prisma)
- ✅ User authentication (JWT, bcrypt)
- ✅ User roles and RBAC foundation
- ✅ Development environment setup
- ✅ Docker PostgreSQL setup
- ✅ Basic Express server with middleware
- ✅ Authentication endpoints (login, register, dev login)
- ✅ Frontend routing foundation
- ✅ Reputation system (database level)

**In Progress:**
- 🔄 Project management endpoints
- 🔄 Task assignment endpoints
- 🔄 Annotation canvas UI (Konva)
- 🔄 Review workflow

**Planned:**
- 📋 Data export functionality
- 📋 AI-assisted annotation integration
- 📋 Analytics dashboard
- 📋 Google OAuth integration
- 📋 Real-time notifications
- 📋 Batch operations
- 📋 Advanced quality metrics
- 📋 Inter-annotator agreement calculation

**Mock/Placeholder:**
- ⚠️ AI model integration (flag exists, no implementation)
- ⚠️ Export formats (schema ready, pending implementation)

---

## Scope Boundary

### In Scope

✅ Image-based data annotation  
✅ Manual labeling workflows  
✅ Role-based access control  
✅ Annotation review and approval  
✅ Quality tracking and reputation system  
✅ Dataset export (multiple formats)  
✅ Project and task management  
✅ User authentication and authorization  
✅ Optional AI-assisted pre-annotation  

### Out of Scope (Current)

❌ Model training or evaluation  
❌ Real-time inference services  
❌ Fully automated labeling without human review  
❌ Video or audio annotation  
❌ 3D data annotation  
❌ Active learning loops  
❌ Payment or pricing system  
❌ Multi-language support (UI is English)  

---

## Key Files Reference

### Backend
- `server/src/index.ts` - Express server entry point
- `server/src/config/env.ts` - Environment configuration
- `server/src/controllers/auth.controller.ts` - Authentication logic
- `server/src/services/auth.service.ts` - Auth business logic
- `server/src/middlewares/request-logger.ts` - HTTP logging
- `server/src/middlewares/error-handler.ts` - Global error handling
- `server/src/utils/jwt.utils.ts` - JWT token utilities
- `server/src/utils/password.utils.ts` - Password hashing
- `server/src/utils/database.ts` - Database connection
- `server/prisma/schema.prisma` - Database schema definition
- `server/prisma/seed.ts` - Development data seeding

### Frontend
- `client/src/main.tsx` - React app entry point
- `client/src/App.tsx` - Root component
- `client/src/routes/` - Route definitions
- `client/src/features/auth/` - Authentication UI
- `client/src/features/project/` - Project management UI
- `client/src/features/annotation/` - Annotation canvas UI
- `client/src/api/axiosClient.ts` - API client configuration
- `client/src/store/` - Zustand state management

---

## Technical Highlights

### Type Safety
- **Full TypeScript** across frontend and backend
- **Prisma** generates type-safe database client
- **Zod** for runtime schema validation
- End-to-end type safety from DB → API → UI

### Security
- **Helmet** - HTTP security headers
- **CORS** - Cross-origin request protection
- **Rate Limiting** - DDoS protection
- **JWT** - Stateless authentication
- **bcrypt** - Password hashing
- **HTTP-only cookies** - Refresh token storage

### Developer Experience
- **Hot reload** - Fast development iteration
- **Prisma Studio** - Visual database browsing
- **TypeScript** - IntelliSense and type checking
- **ESLint + Prettier** - Code formatting
- **Modular architecture** - Easy to extend

### Database Design
- **UUID primary keys** - Distributed-friendly
- **Enum types** - Type-safe status values
- **Cascade deletes** - Referential integrity
- **JSON columns** - Flexible annotation storage
- **Timestamps** - Audit trail (createdAt, updatedAt)

---

## Quick Reference Commands

```bash
# Project Setup
npm install                          # Install all dependencies
cd server && npm run db:setup        # Start PostgreSQL
cd server && npm run db:migrate      # Run migrations

# Development
cd server && npm run dev:watch       # Backend (auto-reload)
cd client && npm run dev             # Frontend

# Database
cd server && npm run db:studio       # Open Prisma Studio
cd server && npm run db:reset        # Reset database
cd server && npm run db:seed         # Seed dev data

# Production Build
cd client && npm run build           # Build frontend
cd server && npm run build           # Build backend (if configured)

# Cleanup
cd server && npm run db:stop         # Stop PostgreSQL
docker-compose down -v               # Full cleanup
```

---

## Summary

**V-Label** is a comprehensive data labeling platform that combines:

1. **Structured Workflows** - Clear separation of annotation, review, and management
2. **Role-Based Access** - Four distinct user roles with appropriate permissions
3. **Quality Control** - Review system with scoring and reputation tracking
4. **Flexible Schema** - JSON-based annotation storage for any label type
5. **Modern Stack** - React 19, TypeScript, Express, Prisma, PostgreSQL
6. **Type Safety** - End-to-end TypeScript with Prisma and Zod
7. **Developer-Friendly** - Hot reload, visual DB tools, modular architecture
8. **Production-Ready Design** - Security, logging, error handling, scalable architecture

The system enables teams to **efficiently annotate image datasets** for machine learning while maintaining **high quality standards** through structured review processes and reputation-based quality tracking. Optional AI assistance support allows teams to leverage pre-annotation while keeping humans in the loop for final validation.
