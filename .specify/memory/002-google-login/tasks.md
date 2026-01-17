---
description: "Task list for Google Login implementation (Firebase)"
---

# Tasks: Google Login (Firebase)

**Input**: Design documents from `.specify/memory/002-google-login/`
**Prerequisites**: Firebase Project

## Phase 1: Setup & Infrastructure

**Purpose**: Configure Firebase and Database.

- [ ] T001 Create Firebase Project
    - [ ] Enable Authentication -> Google Sign-In
    - [ ] Get Firebase Config (Client)
    - [ ] Generate Service Account Key (Server)
- [ ] T002 Add Credentials to `.env`
    - [ ] Client: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc.
    - [ ] Server: `FIREBASE_SERVICE_ACCOUNT_PATH` or individual env vars
- [ ] T003 Update Schema in `server/prisma/schema.prisma`
    - [ ] Add `googleId` (String?, unique) to `User` model
    - [ ] Add `avatar` (String?) to `User` model
- [ ] T004 Run migration `npm run db:migrate`

---

## Phase 2: Backend Implementation

**Goal**: Verify Firebase Token and Manage Users.

- [ ] T005 Install `firebase-admin` in `server/`
- [ ] T006 Initialize Firebase Admin application
- [ ] T007 Implement `FirebaseAuthService.verifyToken(token)`
- [ ] T008 Update `AuthService.loginWithGoogle` logic
    - [ ] Verify Firebase ID Token
    - [ ] Get User Info (uid, email, picture) from decoded token
    - [ ] Find/Create/Link User in Postgres
    - [ ] Generate access/refresh tokens for the app
- [ ] T009 Add `POST /api/v1/auth/google` route and controller

---

## Phase 3: Frontend Implementation

**Goal**: Firebase Sign-In & Backend Exchange.

- [ ] T010 Install `firebase` in `client/`
- [ ] T011 Create `client/src/config/firebase.ts` (Initialize App)
- [ ] T012 Implement `FirebaseLoginButton` component
    - [ ] `signInWithPopup(auth, googleProvider)`
    - [ ] Get `idToken` from result
- [ ] T013 Integrate into `LoginPage.tsx`
    - [ ] On Success: Send `idToken` to Backend API
    - [ ] Handle Backend Response (Store JWT, Redirect)

---

## Phase 4: Verification

- [ ] T014 Test Login flow end-to-end
- [ ] T015 Verify Firebase UID is stored in DB
