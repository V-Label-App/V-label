# Feature Specification: User Registration

**Feature Branch**: `002-user-registration`  
**Created**: 2026-01-14  
**Status**: Draft  
**Input**: User request: "Tôi muốn implement tính năng đăng ký"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Email/Password Registration (Priority: P1)

As a new user, I want to create an account using my email and password so that I can access the application.

**Why this priority**: User registration is essential for acquiring new users. Without this, only manually created accounts can exist.

**Independent Test**:
- Can be tested via Postman/Curl (API) or Registration Screen (UI) independently.
- **Success**: User provides valid details → account created → auto-login → redirect to Dashboard.
- **Failure**: User provides invalid/duplicate email → receives 400/409 error + error message.

**Acceptance Scenarios**:

1. **Given** a new user with email "newuser@example.com", password "Password123", and name "John Doe", **When** they submit registration, **Then** the system creates account + returns 200 OK with JWT token.
2. **Given** an already registered email, **When** they attempt registration, **Then** the system returns 409 Conflict with "Email already exists".
3. **Given** a password shorter than 8 characters, **When** they submit, **Then** the system returns 400 Bad Request with validation error.
4. **Given** mismatched password confirmation, **When** they submit (client-side), **Then** the form shows "Passwords do not match" error.

---

### User Story 2 - Auto-Login After Registration (Priority: P1)

As a newly registered user, I want to be automatically logged in after successful registration so that I don't have to login again immediately.

**Why this priority**: Improves user experience and reduces friction in onboarding flow.

**Acceptance Scenarios**:

1. **Given** successful registration, **When** account is created, **Then** JWT token is issued and user is logged in automatically.
2. **Given** auto-login success, **When** redirect occurs, **Then** user lands on Dashboard with authenticated state.

---

### User Story 3 - Password Strength Validation (Priority: P2)

As a security-conscious system, I want to enforce password strength requirements to protect user accounts.

**Acceptance Scenarios**:

1. **Given** a password with less than 8 characters, **When** submitted, **Then** validation fails.
2. **Given** a password meeting requirements (≥8 chars), **When** submitted, **Then** validation passes.

---

### Edge Cases

- **Duplicate Email**: What happens if two users try to register with same email simultaneously? (Database unique constraint + proper error handling).
- **SQL Injection**: Ensure Prisma parameterized queries prevent injection attacks.
- **XSS**: Frontend should sanitize/encode any user input displayed back.
- **Rate Limiting**: Prevent spam registrations (e.g., max 5 registrations per IP per hour).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST validate email format (RFC 5322 standard).
- **FR-002**: System MUST enforce minimum password length of 8 characters.
- **FR-003**: System MUST hash passwords using `bcrypt` before storage (cost factor ≥ 10).
- **FR-004**: System MUST check for duplicate emails and return 409 Conflict.
- **FR-005**: System MUST set default role as `ANNOTATOR` for new users.
- **FR-006**: System MUST set provider as `LOCAL` for email/password registrations.
- **FR-007**: System MUST auto-login user after successful registration (issue JWT tokens).
- **FR-008**: System MUST validate password confirmation on client-side.

### Key Entities

- **User** (existing model in `prisma/schema.prisma`):
  - `id` (UUID) - Auto-generated
  - `email` (Unique, String, required)
  - `passwordHash` (String, nullable - but required for LOCAL)
  - `fullName` (String, optional)
  - `provider` (Enum: LOCAL | GOOGLE) - Default: LOCAL
  - `role` (Enum: ADMIN | MANAGER | REVIEWER | ANNOTATOR) - Default: ANNOTATOR
  - `isActive` (Boolean) - Default: true
  - `reputationScore` (Float) - Default: 100.0
  - `totalTasksDone` (Int) - Default: 0
  - `createdAt`, `updatedAt` - Auto-generated

### Non-Functional Requirements

- **NFR-001**: Registration API should respond in < 500ms (P95).
- **NFR-002**: Passwords MUST NEVER be logged or exposed in responses.
- **NFR-003**: UI should provide real-time validation feedback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of passwords are hashed before database storage.
- **SC-002**: Duplicate email attempts return 409 status code.
- **SC-003**: Registration API responds in < 500ms (P95).
- **SC-004**: Zero plain-text passwords in logs or database.
- **SC-005**: New users automatically assigned ANNOTATOR role.
- **SC-006**: Auto-login success rate: 100% after registration.

### Definition of Done

- [ ] Backend API endpoint `/api/v1/auth/register` implemented and tested
- [ ] Frontend registration form with validation implemented
- [ ] Password hashing verified (bcrypt)
- [ ] Duplicate email detection working
- [ ] Auto-login flow working (JWT issued)
- [ ] Client-side password confirmation validation
- [ ] Manual testing completed for all acceptance scenarios
- [ ] Code reviewed and merged
