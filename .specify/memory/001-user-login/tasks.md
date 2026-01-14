---
description: "Task list for User Login implementation (Prisma + Dev Tools)"
---

# Tasks: User Login

**Input**: Design documents from `.specify/memory/001-user-login/`
**Prerequisites**: plan.md, spec.md

## Phase 1: Setup & Infrastructure

**Purpose**: Prepare the environment and database tools.

- [ ] T001 Install dependencies (`bcrypt`, `jsonwebtoken`, `zod`, `@prisma/client`) in server/package.json
- [ ] T002 Update `server/src/config/env.ts` to include `JWT_SECRET`, `JWT_EXPIRES_IN`
- [ ] T003 Create `server/src/utils/jwt.utils.ts` for signing/verifying tokens
- [ ] T004 Create `server/src/utils/password.utils.ts` for Bcrypt hashing

---

## Phase 2: Database & Seeding (Prisma)

**Purpose**: Schema setup and test data.

- [x] T005 Define `User` model in `server/prisma/schema.prisma` (Done)
- [x] T006 Run migration `npm run db:migrate` (Done)
- [ ] T007 [P] Create `server/prisma/seed.ts` script
    - [ ] Create 1 Admin (`admin@vlabel.com`)
    - [ ] Create 1 Manager (`manager@vlabel.com`)
    - [ ] Create 1 Reviewer (`reviewer@vlabel.com`)
    - [ ] Create 1 Annotator (`annotator@vlabel.com`)
- [ ] T008 Add `seed` script to `server/package.json`

---

## Phase 3: Core Implementation (US1 & US4)

**Goal**: Login API + Developer Bypass.

### Backend Implementation
- [ ] T009 [P] Implement `AuthService.login(email, password)` via Prisma
- [ ] T010 [P] Implement `AuthService.devLogin(role)` (Bypass logic)
- [ ] T011 Create `AuthController.ts` with `login` and `devLogin` handlers
- [ ] T012 Define routes in `server/src/routes/auth.routes.ts`
- [ ] T013 Register auth routes in `server/src/index.ts` (or app.ts)

---

## Phase 4: Frontend Implementation

**Goal**: Login UI + Integration.

- [ ] T014 Create `client/src/services/auth.api.ts` (axios calls)
- [ ] T015 Create `client/src/context/AuthContext.tsx`
- [ ] T016 Implement `client/src/features/auth/LoginPage.tsx`
    - [ ] Standard Login Form
    - [ ] (Dev Mode Only) List of 4 "Fast Login" buttons

---

## Phase 5: Verification

- [ ] T017 Test `POST /auth/login` (Standard)
- [ ] T018 Test `POST /auth/dev/login` (Admin/Manager/Reviewer/Annotator)
- [ ] T019 Verify JWT contains correct Role claim
- [ ] T020 Ensure Dev Login fails in Production env
