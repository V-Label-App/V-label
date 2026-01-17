# Feature Specification: Google Login (Firebase)

**Feature Branch**: `002-google-login`
**Created**: 2026-01-16
**Status**: Draft
**Input**: User request: "Chuyển spec thành sử dụng firebase"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Google OAuth Login via Firebase (Priority: P1)

As a user, I want to log in using my Google account via Firebase so that I can access the platform quickly without remembering another password.

**Why this priority**: Reduces friction for new users and streamlines the login process.

**Independent Test**:
- **Success**: User clicks "Sign up with Google" -> Google Consent Screen (Firebase) -> Redirects to Dashboard -> Server verifies Firebase Token -> Application Session starts.
- **Failure**: User denies consent -> Firebase returns error -> Show error message.

**Acceptance Scenarios**:

1. **Given** a new user, **When** they login with Google (Firebase), **Then** the backend verifies the token, creates a user with `googleId` (Firebase UID) and `avatar`, and returns an app session token.
2. **Given** an existing user (registered via Google), **When** they login again, **Then** they are logged in directly.
3. **Given** an existing user (registered via Email/Password), **When** they login with Google, **Then** the system links the Firebase UID to their account (if email matches) and logs them in.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST uses `firebase/auth` on the client to handle Google Sign-In.
- **FR-002**: System MUST uses `firebase-admin` on the backend to verify the ID Token sent by the client.
- **FR-003**: System MUST NOT accept raw user profiles from frontend; only valid Firebase ID Tokens.
- **FR-004**: System MUST auto-register new users with the default role `ANNOTATOR`.
- **FR-005**: System MUST support account linking if email matches an existing local account.

### Key Entities Updates

- **User**:
  - `provider`: Support `GOOGLE` value.
  - `googleId`: String field (Unique, Nullable) to store Firebase UID.
  - `avatar`: String (Nullable) to store Google profile picture URL.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Google Login flow completes in < 2 seconds.
- **SC-002**: Backend successfully verifies Firebase ID Token using Admin SDK.
- **SC-003**: User data (Email, Name, Avatar) is correctly synced from Firebase to Postgres.
