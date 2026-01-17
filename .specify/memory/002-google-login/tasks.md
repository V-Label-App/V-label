---
description: "Task list for Google Login implementation"
---

# Tasks: Google Login

**Input**: Design documents from `.specify/memory/002-google-login/`
**Prerequisites**: Google Cloud Console Project

## Phase 1: Setup & Infrastructure

**Purpose**: Configure Google OAuth and Database.

- [ ] T001 Create Google Cloud Project & OAuth Client ID (Manual Step)
    - [ ] Configure Consent Screen
    - [ ] Get `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- [ ] T002 Add Google Credentials to `.env` (Server & Client)
    - [ ] Server: `GOOGLE_CLIENT_ID`
    - [ ] Client: `VITE_GOOGLE_CLIENT_ID`
- [ ] T003 Update Schema in `server/prisma/schema.prisma`
    - [ ] Add `googleId` (String?, unique) to `User` model
    - [ ] Add `avatar` (String?) to `User` model
- [ ] T004 Run migration `npm run db:migrate`

---

## Phase 2: Backend Implementation

**Goal**: Verify Google Token and Manage Users.

- [ ] T005 Install `google-auth-library` in `server/`
- [ ] T006 Implement `GoogleAuthService.verifyToken(token)`
- [ ] T007 Update `AuthService.loginWithGoogle` logic
    - [ ] Verify Token
    - [ ] Find existing user by `googleId` OR `email`
    - [ ] Create user if not exists (Default Role: ANNOTATOR)
    - [ ] Generate JWT Pair (Access/Refresh)
- [ ] T008 Add `POST /api/v1/auth/google` route and controller

---

## Phase 3: Frontend Implementation

**Goal**: Google Login Button & Handler.

- [ ] T009 Install `@react-oauth/google` in `client/`
- [ ] T010 Configure `GoogleOAuthProvider` in `client/src/main.tsx`
- [ ] T011 Update `auth.api.ts` to add `loginWithGoogle(token)` function
- [ ] T012 Implement `GoogleLoginButton` component
- [ ] T013 Integrate Button into `LoginPage.tsx` and `RegisterPage.tsx`
    - [ ] Handle Success: Call API -> Save Token -> Redirect
    - [ ] Handle Failure: Show Error Notification

---

## Phase 4: Verification

- [ ] T014 Test Login with new Google Account (Registration flow)
- [ ] T015 Test Login with existing Google Account
- [ ] T016 Verify User Data (Avatar, Name) is saved correctly
