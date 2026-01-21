# Feature Specification: Admin Impersonation ("View As")

**Feature Branch**: `feature/admin-impersonation`
**Created**: 2026-01-18
**Status**: Draft
**Input**: User request for "View As Manager" functionality similar to provided screenshots.

## User Scenarios & Testing

### User Story 1 - View Tenant Details (Priority: P1)

As an Admin, I want to click on a user/manager in the list to navigate to a "Tenant Detail" page first, where I can see their overall information (stats, usage, status) before deciding to impersonate them.

**Why this priority**: Improved workflow. Admins need context before impersonating.

**Independent Test**: Click a user row -> verify navigation to `/admin/users/[ID]` -> verify details are shown.

**Acceptance Scenarios**:

1. **Given** I am on the User Management list, **When** I click on a user row, **Then** I am navigated to `/admin/users/:userId`.
2. **Given** I am on the Tenant Detail page, **When** I look at the page actions, **Then** I see the "View As Manager" button.

### User Story 2 - Start Impersonation (Priority: P1)

As an Admin, I want to click "View As Manager" **from the Tenant Detail page** to enter the impersonation mode.

**Why this priority**: Core functionality.

**Independent Test**: Can be tested by clicking the button on detail page and verify redirection.

**Acceptance Scenarios**:

1. **Given** I am on the Tenant Detail page, **When** I click "View As Manager", **Then** the page reloads/redirects and I am shown the Manager Dashboard.

### User Story 3 - Impersonation Banner & Exit (Priority: P1)
*(Same as before)*

---

### Edge Cases

- **Session Expiry**: If the impersonation session expires, the user should be logged out completely or returned to Admin login.
- **Self-Impersonation**: Admin should not be able to "View As" themselves (button disabled or hidden).
- **Concurrent Usage**: The real user should not be logged out when an Admin impersonates them.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide an API endpoint `POST /auth/impersonate/:userId` accessible only to Admins.
- **FR-002**: The API MUST return an authentication token valid for the target user.
- **FR-003**: The Client MUST display a `UserDetailPage` showing at least: Name, Email, Role, Status, ID.
- **FR-004**: The Client MUST store the original Admin token securely before using the impersonation token.
- **FR-005**: The Client MUST display a distinct visual indicator (banner) whenever an impersonation session is active.
- **FR-006**: The "Exit" action MUST restore the original Admin session without requiring re-login.
- **FR-007**: The System MUST log all impersonation start events to an `AuditLog` table for security auditing.

### Key Entities

- **User**: The target entity being viewed.
- **AuthToken**: JWT tokens for both the Admin (original) and the Impersonated User.
- **AuditLog**: Record of administrative actions (actor, action, target, timestamp).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Admin can navigate to details + switch to a target user's view in under 3 seconds total.
- **SC-002**: Visual indicator (banner) is 100% persistent across all routes during impersonation.
- **SC-003**: "Exit" action successfully restores Admin session 100% of the time.
