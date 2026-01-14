# Implementation Plan: User Login

**Branch**: `001-user-login` | **Date**: 2026-01-13 | **Spec**: [Link](./spec.md)
**Input**: Feature specification from `.specify/memory/001-user-login/spec.md`

## Summary

Implement secure Email/Password and Google OAuth authentication using JWT (Access + Refresh tokens). The backend will use Express + Passport/Manual + PostgreSQL, and the frontend will use React Context for auth state management.

## Technical Context

**Language/Version**: TypeScript (Node.js 18+ / React 18+)
**Primary Dependencies**: 
- Backend: `bcrypt`, `jsonwebtoken`, `zod`, `@prisma/client`.
- Frontend: `react-hook-form`, `axios`.
**Storage**: PostgreSQL (via Prisma ORM).
**Testing**: Jest, Supertest.
**Target Platform**: Web, Server.

## Constitution Check

*GATE: Passed. Complies with "No Hardcoding" (Env vars for secrets) and "Type Safety" (TypeScript & Prisma).*

## Project Structure

### Documentation (this feature)

```text
.specify/memory/001-user-login/
├── spec.md              # Feature Spec
├── plan.md              # This file
├── tasks.md             # Task Decomposition
├── data-model.md        # (Deprecated - See server/prisma/schema.prisma)
└── contracts/           # API Contracts
```

### Source Code (V-label App)

```text
server/
├── prisma/                  # schema.prisma (User Model defined here)
├── src/
│   ├── config/              # env.ts
│   ├── services/            # auth.service.ts (Prisma logic)
│   ├── controllers/         # auth.controller.ts
│   ├── routes/              # auth.routes.ts
│   ├── middlewares/         # auth.middleware.ts
│   └── utils/               # jwt.utils.ts, password.utils.ts
└── tests/integration/       # auth.test.ts

client/
├── src/
│   ├── context/             # AuthContext.tsx
│   ├── services/            # auth.api.ts
│   ├── features/auth/       # LoginPage.tsx, RegisterPage.tsx
│   └── components/ui/       # Reusable UI (Input, Button)
└── tests/
```

**Structure Decision**: 
- Replaced `models/User.ts` (Raw SQL) with **Prisma Client** (auto-generated).
- Auth logic resides in `AuthService` interacting directly with `prisma.user`.
- **Developer Experience**: Added `prisma/seed.ts` to create 4 fixed test accounts (admin, manager, reviewer, annotator) and a `/dev/login` endpoint for instant access.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Refresh Tokens | Security | Long-lived access tokens are insecure if stolen. |
