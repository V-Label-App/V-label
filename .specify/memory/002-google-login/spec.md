# Feature Specification: Google Login

**Feature Branch**: `002-google-login`
**Created**: 2026-01-16
**Status**: Draft
**Input**: User request: "Lập plan để làm tính năng đăng nhập với google"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Google OAuth Login (Priority: P1)

As a user, I want to log in using my Google account so that I can access the platform quickly without remembering another password.

**Why this priority**: Reduces friction for new users and streamlines the login process.

**Independent Test**:
- **Success**: User clicks "Sign up with Google" -> Google Consent Screen -> Redirects to Dashboard -> JWT Token issued.
- **Failure**: User denies consent -> Redirects to Login with error.

**Acceptance Scenarios**:

1. **Given** a new user, **When** they login with Google, **Then** a new account is created with their Google email and name, and they are logged in.
2. **Given** an existing user (registered via Google), **When** they login again, **Then** they are logged in directly without creating a duplicate account.
3. **Given** an existing user (registered via Email/Password), **When** they login with Google (same email), **Then** the system links the Google provider to their account and logs them in.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST verify the Google ID Token via Google's OAuth2 API (backend verification).
- **FR-002**: System MUST NOT accept raw user profiles from frontend; only valid ID Tokens.
- **FR-003**: System MUST auto-register new users with the default role `ANNOTATOR`.
- **FR-004**: System MUST support account linking if email matches an existing local account.

### Key Entities Updates

- **User**:
  - `provider`: Support `GOOGLE` value (already defined in Enum).
  - `googleId`: New String field (Unique, Nullable) to store Google's Subject ID.
  - `avatar`: String (Nullable) to store Google profile picture URL.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Google Login flow completes in < 2 seconds.
- **SC-002**: Correctly retrieves User's Name and Avatar from Google.
- **SC-003**: Backend successfully validates `aud` (Audience) claim in Google Token.
