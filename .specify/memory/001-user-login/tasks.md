---
description: "Task list for User Login implementation"
---

# Tasks: User Login

**Input**: Design documents from `.specify/memory/001-user-login/`
**Prerequisites**: plan.md, spec.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the environment for auth.

- [ ] T001 Install dependencies (`bcrypt`, `jsonwebtoken`, `zod`) in server/package.json
- [ ] T002 Update `server/src/config/env.ts` to include `JWT_SECRET`, `JWT_EXPIRES_IN`
- [ ] T003 [P] Create `server/src/utils/jwt.utils.ts` for signing/verifying tokens

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and core models.

- [ ] T004 Create `User` model migration in `server/src/migrations/`
- [ ] T005 Run migration to create `users` table
- [ ] T006 Create `User` entity/model class in `server/src/models/User.ts`

---

## Phase 3: User Story 1 - Email/Password Login (Priority: P1) 🎯 MVP

**Goal**: Basic login flow.

### Tests for US1
- [ ] T007 [P] [US1] write integration test `server/tests/integration/auth.test.ts` (Login success/fail)

### Implementation for US1
- [ ] T008 [P] [US1] Implement `AuthService.login(email, password)` in `server/src/services/AuthService.ts`
- [ ] T009 [US1] Implement `AuthController.login` endpoint in `server/src/controllers/AuthController.ts`
- [ ] T010 [US1] Define routes in `server/src/routes/auth.routes.ts`
- [ ] T011 [US1] Register routes in `server/src/app.ts`

### Frontend for US1
- [ ] T012 [P] [US1] Create `client/src/services/auth.api.ts` (axios calls)
- [ ] T013 [US1] Create `client/src/context/AuthContext.tsx`
- [ ] T014 [US1] Create `client/src/pages/auth/LoginPage.tsx` UI

**Checkpoint**: Validate standard login works via UI.

---

## Phase 4: User Story 2 - Google OAuth (Priority: P2)

**Goal**: Social login.

- [ ] T015 [US2] updates `env.ts` with Google Client ID/Secret
- [ ] T016 [US2] Implement `AuthService.googleLogin(token)`
- [ ] T017 [US2] Add "Login with Google" button in `LoginPage.tsx`

---

## Phase 5: Polish & Cross-Cutting

- [ ] T018 Add Rate Limiting to login endpoint
- [ ] T019 Audit code for security (ensure no logs password)
