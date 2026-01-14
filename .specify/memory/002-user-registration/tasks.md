---
description: "Task list for User Registration implementation"
---

# Tasks: User Registration

**Input**: Design documents from `.specify/memory/002-user-registration/`  
**Prerequisites**: spec.md, plan.md

## Phase 1: Backend Implementation

**Purpose**: Create registration API endpoint with validation and security.

- [ ] T001 [P] Add `registerSchema` validation in `server/src/controllers/auth.controller.ts`
    - [ ] Validate email format (Zod `.email()`)
    - [ ] Validate password min length (Zod `.min(8)`)
    - [ ] Optional fullName field
- [ ] T002 [P] Implement `AuthService.register()` in `server/src/services/auth.service.ts`
    - [ ] Check if email already exists (return null if true)
    - [ ] Hash password with `hashPassword()` utility
    - [ ] Create user with Prisma (role: ANNOTATOR, provider: LOCAL, isActive: true)
    - [ ] Generate access + refresh tokens
    - [ ] Return `{ accessToken, refreshToken, user }`
- [ ] T003 Add `register` handler in `server/src/controllers/auth.controller.ts`
    - [ ] Validate request body with `registerSchema`
    - [ ] Call `AuthService.register()`
    - [ ] Return 409 Conflict if email exists
    - [ ] Set refresh token in HTTP-only cookie
    - [ ] Return 200 with `{ accessToken, user }`
- [ ] T004 Add route `POST /api/v1/auth/register` in `server/src/routes/auth.routes.ts`

---

## Phase 2: Frontend API Integration

**Purpose**: Connect frontend to registration endpoint.

- [ ] T005 Add `RegisterCredentials` interface to `client/src/services/auth.api.ts`
- [ ] T006 Implement `authApi.register()` function
    - [ ] Call `POST /auth/register`
    - [ ] Return `AuthResponse` (accessToken + user)

---

## Phase 3: Frontend State Management

**Purpose**: Enable registration functionality in auth context.

- [ ] T007 Add `register` to `AuthContextType` in `client/src/context/AuthContext.tsx`
- [ ] T008 Implement `register` function
    - [ ] Call `authApi.register()`
    - [ ] Decode JWT token with `decodeToken()`
    - [ ] Update state (accessToken, user)
    - [ ] Save accessToken to localStorage

---

## Phase 4: Frontend UI Implementation

**Purpose**: Complete registration page with validation.

- [ ] T009 Add state management to `client/src/features/auth/pages/RegisterPage.tsx`
    - [ ] fullName, email, password, confirmPassword
    - [ ] error, isLoading
- [ ] T010 Implement client-side validation
    - [ ] Email format validation
    - [ ] Password length ≥ 8 characters
    - [ ] Password confirmation match
- [ ] T011 Implement form submit handler
    - [ ] Prevent default
    - [ ] Validate inputs
    - [ ] Call `useAuth().register()`
    - [ ] Handle success → navigate to `/dashboard`
    - [ ] Handle errors → display error message
- [ ] T012 Add loading state (disable form during submission)
- [ ] T013 Disable social login buttons (not yet implemented)
- [ ] T014 Uncomment `/register` route in `client/src/routes/AppRoutes.tsx`

---

## Phase 5: Verification

**Purpose**: Ensure feature works end-to-end.

- [ ] T015 Test registration API endpoint (Postman/Curl)
    - [ ] Valid data → 200 OK + JWT token
    - [ ] Duplicate email → 409 Conflict
    - [ ] Invalid email → 400 Bad Request
    - [ ] Short password → 400 Bad Request
- [ ] T016 Test frontend registration form
    - [ ] Fill valid data → success + redirect to dashboard
    - [ ] Duplicate email → error message displayed
    - [ ] Password mismatch → validation error shown
    - [ ] Short password → validation error shown
- [ ] T017 Verify password hashing
    - [ ] Check database (Prisma Studio) → passwordHash is hashed, not plain text
- [ ] T018 Verify auto-login
    - [ ] After registration → accessToken in localStorage
    - [ ] User state populated correctly
    - [ ] Dashboard loads with authenticated user
- [ ] T019 Verify default role assignment
    - [ ] New users have role = ANNOTATOR
- [ ] T020 Test navigation
    - [ ] Click "Log in" from register page → goes to /login
    - [ ] Click "Sign up" from login page → goes to /register
