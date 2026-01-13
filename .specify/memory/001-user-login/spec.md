# Feature Specification: User Login

**Feature Branch**: `001-user-login`  
**Created**: 2026-01-13  
**Status**: Draft  
**Input**: User description: "Ví dụ cho feature login đi"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Email/Password Login (Priority: P1)

As a user, I want to log in using my registered email and password so that I can access my account.

**Why this priority**: Core authentication is the gateway to all other features. Without this, users cannot access personal data.

**Independent Test**:
- Can be tested via Postman/Curl (API) or Login Screen (UI) independently.
- **Success**: User provides valid credentials -> receives JWT token + redirected to Dashboard.
- **Failure**: User provides invalid credentials -> receives 401 error + error message.

**Acceptance Scenarios**:

1. **Given** a registered user with email "test@example.com" and password "Password123", **When** they enter these credentials, **Then** the system returns a 200 OK with an HTTP-only JWT cookie.
2. **Given** an unregistered email, **When** they attempt login, **Then** the system returns a 401 Unauthorized with "Invalid email or password".
3. **Given** a valid email but wrong password, **When** they attempt login, **Then** the system returns a 401 Unauthorized with "Invalid email or password" (no distinction for security).

---

### User Story 2 - Google OAuth Login (Priority: P2)

As a user, I want to log in using my Google account so that I don't have to remember another password.

**Why this priority**: Improves user experience and conversion rate (frictionless login).

**Independent Test**:
- Can be tested by clicking "Login with Google".
- **Success**: User approves permissions -> Redirected back to app with JWT token.

**Acceptance Scenarios**:

1. **Given** a user with a Google account, **When** they click "Login with Google", **Then** they are redirected to Google's consent screen.
2. **Given** a successful Google callback, **When** the system processes the auth code, **Then** a user account is created (if new) or found (if existing) and logged in.

---

### User Story 3 - Password Reset Flow (Priority: P3)

As a user, I want to reset my password via email if I forget it.

**Why this priority**: Critical for account recovery, but less frequent than login.

**Independent Test**:
- **Success**: User requests reset -> Receives email with token -> Sets new password -> Can login with new password.

**Acceptance Scenarios**:

1. **Given** a valid email, **When** requesting reset, **Then** send an email with a 15-minute expiration link.

---

### Edge Cases

- **Rate Limiting**: What happens if a user tries 100 wrong passwords? (Should lock account/wait for 5 mins).
- **Session Expiry**: What happens when the JWT token expires? (Should auto-refresh or logout).
- **Database Down**: Graceful error message "Service temporarily unavailable".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST validate email format and password strength (min 8 chars, 1 number).
- **FR-002**: System MUST use `bcrypt` or `argon2` for password hashing.
- **FR-003**: System MUST issue JWT access tokens (15 min) and refresh tokens (7 days).
- **FR-004**: System MUST store refresh tokens in HTTP-Only, Secure cookies.

### Key Entities

- **User**: id, email, password_hash, google_id, created_at, updated_at.
- **Session**: id, user_id, refresh_token_hash, expires_at (Optional, if using stateful refresh tokens).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Login API responds in < 200ms (P95).
- **SC-002**: 100% of passwords are hashed before storage.
- **SC-003**: Zero plain-text credentials in logs.
