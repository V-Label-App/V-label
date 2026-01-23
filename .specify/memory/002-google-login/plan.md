# Implementation Plan - Google Login (Firebase)

This plan outlines the steps to implement Google Login using Firebase Authentication.

## Goal
Enable users to sign up and log in with Google account via Firebase, verified by the backend.

## User Review Required
> [!IMPORTANT]
> **Firebase Setup Needed**:
> 1. Create a Firebase Project at [console.firebase.google.com](https://console.firebase.google.com).
> 2. Enable **Authentication** and add **Google** as a provider.
> 3. **Client**: Get the configuration object (apiKey, authDomain, etc.).
> 4. **Server**: Generate a Private Key (JSON) from Project Settings -> Service Accounts.

## Proposed Changes

### 1. Setup & Infrastructure
#### [MODIFY] [.env]
- **Client**: Add `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, etc.
- **Server**: Add content of the service account JSON (e.g., `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_PROJECT_ID`).

#### [MODIFY] [server/prisma/schema.prisma](file:///server/prisma/schema.prisma)
- Update `User` model:
    - Add `googleId String? @unique` (Stores Firebase UID)
    - Add `avatar String?`

### 2. Backend Implementation (Node.js/Express)
#### [NEW] [server/src/config/firebase-admin.ts]
- Initialize `admin` app using credentials from env.

#### [NEW] [server/src/services/firebaseAuth.service.ts]
- Implement `verifyToken(idToken: string)`:
    - Use `admin.auth().verifyIdToken(idToken)`.
    - Return `DecodedIdToken` (which contains uid, email, picture).

#### [MODIFY] [server/src/services/auth.service.ts](file:///server/src/services/auth.service.ts)
- Add `loginWithGoogle(idToken: string)` method:
    - Verify token via `firebaseAuth.service`.
    - Find `User` by `googleId` (Firebase UID).
    - If not found, look up by `email`.
        - If found by email, link `googleId`.
        - If not, create new `User` (Role: ANNOTATOR).
    - Generate and return JWT session tokens.

#### [MODIFY] [server/src/controllers/auth.controller.ts](file:///server/src/controllers/auth.controller.ts)
- Add `googleLogin` handler.

### 3. Frontend Implementation (React)
#### [NEW] [client/src/config/firebase.ts]
- Initialize Firebase App and Auth with `env` vars.
- Export `auth` and `googleProvider`.

#### [NEW] [client/src/components/GoogleLoginButton.tsx]
- Button that triggers `signInWithPopup`.
- On success, gets `user.accessToken` (ID Token) and calls backend API.

#### [MODIFY] [client/src/features/auth/api/auth.api.ts](file:///client/src/features/auth/api/auth.api.ts)
- Add `loginWithGoogle(idToken)` endpoint.

#### [MODIFY] [client/src/features/auth/pages/LoginPage.tsx](file:///client/src/features/auth/pages/LoginPage.tsx)
- Integrate `GoogleLoginButton`.

## Verification Plan

### Automated Tests
- [ ] Backend: Unit test `verifyToken` (mocking `admin.auth()`).

### Manual Verification
1. **Google Sign-In**: Click button -> Popup opens -> Login -> Popup closes.
2. **Backend Verification**: API receives token -> Verify success -> Returns JWT.
3. **Database**: Check if `User` table has the correct `googleId` (matching Firebase UID).
