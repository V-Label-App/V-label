# Implementation Plan: User Registration

**Branch**: `002-user-registration` | **Date**: 2026-01-14 | **Spec**: [Link](./spec.md)  
**Input**: Feature specification from `.specify/memory/002-user-registration/spec.md`

## Summary

Implement user registration feature allowing new users to create accounts with email/password authentication. Users will be automatically logged in after successful registration and assigned the ANNOTATOR role by default.

## Technical Context

**Language/Version**: TypeScript (Node.js 18+ / React 18+)  
**Primary Dependencies**: 
- Backend: `bcrypt`, `jsonwebtoken`, `zod`, `@prisma/client` (already installed).
- Frontend: `axios`, `react-router-dom` (already installed).  
**Storage**: PostgreSQL (via Prisma ORM).  
**Testing**: Manual testing via browser and Postman.  
**Target Platform**: Web, Server.

## Constitution Check

*GATE: Passed. Complies with "No Hardcoding" (Env vars for secrets), "Type Safety" (TypeScript & Prisma), and "Security Best Practices" (bcrypt hashing, validation).*

## Project Structure

### Documentation (this feature)

```text
.specify/memory/002-user-registration/
├── spec.md              # Feature Spec
├── plan.md              # This file
└── tasks.md             # Task Decomposition
```

### Source Code (V-label App)

```text
server/
├── src/
│   ├── services/auth.service.ts         # [MODIFY] Add register() method
│   ├── controllers/auth.controller.ts   # [MODIFY] Add register handler
│   ├── routes/auth.routes.ts            # [MODIFY] Add POST /auth/register
│   └── utils/                           # [EXISTING] password.utils.ts, jwt.utils.ts
└── prisma/schema.prisma                 # [EXISTING] User model already defined

client/
├── src/
│   ├── context/AuthContext.tsx          # [MODIFY] Add register() function
│   ├── services/auth.api.ts             # [MODIFY] Add register API call
│   ├── features/auth/pages/
│   │   └── RegisterPage.tsx             # [MODIFY] Add form logic + validation
│   ├── routes/AppRoutes.tsx             # [MODIFY] Uncomment /register route
│   └── utils/jwt.utils.ts               # [EXISTING] For token decoding
```

**Structure Decision**: 
- Leverage existing authentication infrastructure (JWT utils, password hashing, Prisma)
- RegisterPage.tsx skeleton already exists, just needs state management + API integration
- No new database migrations needed (User model already supports registration)

## Implementation Approach

### Backend Implementation

1. **Add Registration Validation Schema** (`auth.controller.ts`):
   - Use Zod to validate: email (format), password (min 8 chars), fullName (optional)
   - Add confirmPassword check (though final validation happens client-side)

2. **Implement Registration Service** (`auth.service.ts`):
   ```typescript
   static async register(email: string, password: string, fullName?: string) {
     // 1. Check if email exists (return null if duplicate)
     // 2. Hash password with bcrypt
     // 3. Create user with Prisma (role: ANNOTATOR, provider: LOCAL)
     // 4. Generate JWT tokens
     // 5. Return { accessToken, refreshToken, user }
   }
   ```

3. **Add Controller Handler** (`auth.controller.ts`):
   - Validate request body
   - Call `AuthService.register()`
   - Return 409 if email exists
   - Set refresh token cookie
   - Return accessToken + user

4. **Add Route** (`auth.routes.ts`):
   - `POST /api/v1/auth/register` → `AuthController.register`

### Frontend Implementation

1. **Update API Service** (`auth.api.ts`):
   ```typescript
   interface RegisterCredentials {
     email: string
     password: string
     fullName?: string
   }
   register(credentials: RegisterCredentials): Promise<AuthResponse>
   ```

2. **Update Auth Context** (`AuthContext.tsx`):
   - Add `register` to context type
   - Implement register function (call API + decode JWT + save to state)

3. **Complete RegisterPage** (`RegisterPage.tsx`):
   - Add state: fullName, email, password, confirmPassword, error, isLoading
   - Client-side validation:
     - Email format
     - Password length ≥ 8
     - Password === confirmPassword
   - Submit handler → call `useAuth().register()`
   - Redirect to /dashboard on success
   - Display error messages

4. **Enable Route** (`AppRoutes.tsx`):
   - Uncomment `/register` route

## Complexity Tracking

| Decision | Why Needed | Simpler Alternative Rejected Because |
|----------|------------|--------------------------------------|
| Auto-login after registration | Better UX | Requiring separate login adds friction |
| Client-side password confirmation | Reduce unnecessary API calls | Server validation alone wastes bandwidth |
| Bcrypt hashing | Security standard | Plain-text passwords are unacceptable |

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Duplicate email race condition | Rely on database UNIQUE constraint |
| Password visible in network logs | Use HTTPS in production, never log passwords |
| Spam registrations | Add rate limiting (future enhancement) |

## Dependencies

- **Blocking**: None (all infrastructure exists)
- **Blocked by**: None
- **Related features**: `001-user-login` (shares auth infrastructure)
