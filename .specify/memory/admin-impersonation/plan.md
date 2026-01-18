# Admin User Management (CRUD)

## Goal Description
Enable ADMIN users to create, read, update, and delete any user account from the Admin Panel.

## Proposed Changes

### Server

#### [NEW] [role.middleware.ts](file:///Users/mr.triss/FPT%20University/SWP391/V-label_app/V-label-app/server/src/middlewares/role.middleware.ts)
- Create middleware to check `req.user.role` against allowed roles.

#### [MODIFY] [user.controller.ts](file:///Users/mr.triss/FPT%20University/SWP391/V-label_app/V-label-app/server/src/controllers/user.controller.ts)
- Add `getAllUsers`: Fetch all users with basic info.
- Add `createUser`: Admin creates user directly (email, password, name, role).
- Add `updateUser`: Update any user's fields (role, status, etc.).
- Add `deleteUser`: Delete user by ID.

#### [MODIFY] [user.routes.ts](file:///Users/mr.triss/FPT%20University/SWP391/V-label_app/V-label-app/server/src/routes/user.routes.ts)
- Add endpoints:
    - `GET /` (admin only)
    - `POST /` (admin only)
    - `PUT /:id` (admin only)
    - `DELETE /:id` (admin only)

### Client

#### [MODIFY] [auth.api.ts](file:///Users/mr.triss/FPT%20University/SWP391/V-label_app/V-label-app/client/src/services/auth.api.ts)
- Add admin methods: `getAllUsers`, `createUser`, `updateUserRole`, `toggleUserStatus`, `deleteUser`.

#### [MODIFY] [AdminPanel.tsx](file:///Users/mr.triss/FPT%20University/SWP391/V-label_app/V-label-app/client/src/features/admin/pages/AdminPanel.tsx)
- Replace mock `users` state with API data fetching.
- Implement forms and handlers for Create, Update, and Delete actions.

## Verification Plan

### Manual Verification
1. **List Users**: Log in as Admin -> Go to Admin Panel -> Verify list of users loads.
2. **Create User**: Click "Add User" -> Fill form -> Submit -> Verify new user appears.
3. **Update Role**: Change a user's role -> Refresh -> Verify role persists.
4. **Deactivate User**: Toggle status -> Verify user is locked.
5. **Delete User**: Delete a user -> Verify user is gone from list.
6. **Access Control**: Try to access these APIs as non-admin -> Verify 403 Forbidden.

# Admin Impersonation Feature

## Goal Description
Allow Admin users to "View as" other users (specifically Managers) to debug issues or view the system from their perspective.

## Proposed Changes

### Server

#### [MODIFY] [auth.controller.ts](file:///Users/mr.triss/FPT%20University/SWP391/V-label_app/V-label-app/server/src/controllers/auth.controller.ts)
- Add `impersonateUser`: Accepts `userId`. Verifies requester is Admin. Generates and returns a JWT for the target user.

#### [MODIFY] [auth.routes.ts](file:///Users/mr.triss/FPT%20University/SWP391/V-label_app/V-label-app/server/src/routes/auth.routes.ts)
- Add `POST /impersonate/:userId` (Protected, Admin Only).

### Client

#### [MODIFY] [AuthContext.tsx](file:///Users/mr.triss/FPT%20University/SWP391/V-label_app/V-label-app/client/src/context/AuthContext.tsx)
- Add `impersonateUser(userId)`:
    - Calls API to get new token.
    - Saves current Admin token to `originalToken` in storage.
    - Sets new token as `token`.
    - Triggers user reload.
- Add `stopImpersonation()`:
    - Restores `token` from `originalToken`.
    - Clears `originalToken`.
    - Triggers user reload.
- Add `isImpersonating` state (derived from presence of `originalToken`).

#### [NEW] [ImpersonationBanner.tsx](file:///Users/mr.triss/FPT%20University/SWP391/V-label_app/V-label-app/client/src/components/ImpersonationBanner.tsx)
- Use `useAuth` to check `isImpersonating`.
- Render a fixed top banner (orange/warning color).
- Show "Impersonating [User Name]".
- "Exit Impersonation" button calls `stopImpersonation`.

#### [MODIFY] [App.tsx](file:///Users/mr.triss/FPT%20University/SWP391/V-label_app/V-label-app/client/src/App.tsx)
- Include `<ImpersonationBanner />` at the top level.

#### [MODIFY] [AdminPanel.tsx](file:///Users/mr.triss/FPT%20University/SWP391/V-label_app/V-label-app/client/src/features/admin/pages/AdminPanel.tsx)
- Add "View As" button to user table row.
- `onClick` -> `impersonateUser(user.id)`.

## Verification Plan
1. **Impersonate**: Admin panel -> Click "View As" -> Verify redirected to user's dashboard + Banner appears.
2. **Persistence**: Refresh page -> Verify still impersonating.
3. **Exit**: Click "Exit" on banner -> Verify redirected back to Admin Panel/Dashboard + Banner gone.
