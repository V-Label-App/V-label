# Implementation Plan - Profile & Me API

## 1. Backend Implementation
- [ ] **Middleware**: Verify `src/middlewares/auth.middleware.ts` exists and functions correctly (extracts userId from JWT).
- [ ] **Controller**: Create `src/controllers/user.controller.ts`.
    - `getMe(req, res)`: Fetch user by ID from `req.user.id`.
- [ ] **Route**: Create `src/routes/user.routes.ts`.
    - `GET /me`: Apply `authMiddleware`.
- [ ] **App Integration**: Register `userRoutes` in `src/index.ts` (or `app.ts`).

## 2. Frontend Integration
- [ ] **API Service**: Update `src/services/auth.api.ts` or create `user.api.ts`.
    - `getMe()`: Calls `GET /users/me`.
- [ ] **Auth Context**:
    - Update `AuthProvider` to call `getMe()` on mount if a token exists in localStorage.
    - If `getMe` fails (401), clear token and logout.
- [ ] **Global UI Components**:
    - Create `src/components/common/UserNav.tsx` (or `UserMenu`).
    - Implement Avatar + Name trigger.
    - Implement Dropdown (Shadcn `DropdownMenu`) with "Profile" and "Logout".
- [ ] **Profile UI**:
    - Create `src/features/profile/pages/ProfilePage.tsx`.
    - Implement responsive layout with User Avatar and Stats.
    - Add Role-Based Sections (Switch statement on `user.role`).

## 3. Verification
- [ ] **Backend Test**: Curl `GET /me` with valid token.
- [ ] **Frontend Test**: detailed functional test of Login persistence (refresh page keeps user logged in).
