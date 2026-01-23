# Profile & Me API Specification

## 1. Overview
This feature implements the `GET /api/v1/users/me` endpoint to retrieve the currently authenticated user's information and designs the Profile/Dashboard UI tailored to each user role (Admin, Manager, Reviewer, Annotator).

## 2. API Specification

### 2.1. GET /api/v1/users/me
- **Auth**: Required (Bearer Token)
- **Description**: Returns the profile of the currently logged-in user.
- **Response**:
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "avatarUrl": "https://...",
    "role": "ANNOTATOR", // ADMIN, MANAGER, REVIEWER
    "reputationScore": 100,
    "totalTasksDone": 0,
    "createdAt": "2024-01-01T00:00:00Z"
  }
  ```

## 3. UI/UX Specification

## 3. UI/UX Specification

### 3.1. Header & Navigation (Global)
- **Top-Right User Menu**: 
    - **Trigger**: Display **User Avatar** and **Full Name** (text to the right of avatar).
    - **Interaction**: Click triggers a **Dropdown Menu**.
    - **Dropdown Items**:
        1. **Profile**: Navigates to `/profile` (Detailed Info).
        2. **Log out**: Clears session and redirects to `/login`.

### 3.2. Detailed Profile Page (/profile)
- **Access**: Accessed via Header User Menu -> "Profile".
- **Layout**:
    - **Identity Section**: Large Avatar, Full Name, Email, Role Badge, Member Since.
    - **Actions**: "Update Information" button.
    - **Role-Specific Stats**: (See below).

### 3.3. Role-Based Dashboards (Conceptual)
The "Profile" page focuses on user identity. The "Dashboard" is the landing page.

#### **Annotator**
- **Stats Card**: Tasks Completed, Reputation Score, Earnings (if applicable).
- **Recent Activity**: List of recently submitted tasks.
- **Action**: "Go to Workspace".

#### **Reviewer**
- **Stats Card**: Tasks Reviewed, Approval Rate.
- **Queue**: Pending tasks waiting for review.
- **Action**: "Start Reviewing".

#### **Manager**
- **Stats Card**: Active Projects, Total Team Members.
- **Project List**: Quick access to managed projects.
- **Action**: "Create Project", "Add Member".

#### **Admin**
- **Stats Card**: Total Users, System Health.
- **User Management**: Link to user list.
- **System Config**: Link to settings.

## 4. Requirements
- **Backend**:
  - Implement `AuthMiddleware` to verify JWT.
  - Create `UserController` with `me` method.
  - Add route `GET /users/me`.
- **Frontend**:
  - Update `AuthContext` to fetch `me` on initialization (persist login).
  - Create `ProfilePage` component.
  - Implement Role-Based Rendering for the dashboard sections.
