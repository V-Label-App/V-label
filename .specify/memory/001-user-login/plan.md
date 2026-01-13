# Implementation Plan: User Login

**Branch**: `001-user-login` | **Date**: 2026-01-13 | **Spec**: [Link](./spec.md)
**Input**: Feature specification from `.specify/memory/001-user-login/spec.md`

## Summary

Implement secure Email/Password and Google OAuth authentication using JWT (Access + Refresh tokens). The backend will use Express + Passport/Manual + PostgreSQL, and the frontend will use React Context for auth state management.

## Technical Context

**Language/Version**: TypeScript (Node.js 18+ / React 18+)
**Primary Dependencies**: `bcrypt`, `jsonwebtoken`, `zod` (validation), `react-hook-form`.
**Storage**: PostgreSQL (Users table).
**Testing**: Jest (Unit), Supertest (API Integration).
**Target Platform**: Web, Server.
**Project Type**: Monorepo.

## Constitution Check

*GATE: Passed. Complies with "No Hardcoding" (Env vars for secrets) and "Type Safety" (TypeScript).*

## Project Structure

### Documentation (this feature)

```text
.specify/memory/001-user-login/
├── spec.md              # Feature Spec
├── plan.md              # This file
├── tasks.md             # Task Decomposition
├── data-model.md        # DB Schema changes
└── contracts/           # API Contracts
```

### Source Code (V-label App)

```text
server/
├── src/
│   ├── config/              # env.ts (Add JWT_SECRET, GOOGLE_ID)
│   ├── models/              # User.ts
│   ├── services/            # AuthService.ts
│   ├── controllers/         # AuthController.ts
│   ├── routes/              # auth.routes.ts
│   ├── middlewares/         # auth.middleware.ts (JWT verification)
│   └── utils/               # jwt.utils.ts
└── tests/integration/       # auth.test.ts

client/
├── src/
│   ├── context/             # AuthContext.tsx
│   ├── services/            # auth.api.ts
│   ├── pages/auth/          # LoginPage.tsx, RegisterPage.tsx
│   └── components/auth/     # LoginForm.tsx
└── tests/
```

**Structure Decision**: Using a centralized `AuthService` in the backend and an `AuthContext` in the frontend to manage global state.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Refresh Tokens | Security | Long-lived access tokens are insecure if stolen. |
