# Use Case Specifications - V-Label Platform

**Version:** 1.0
**Date:** 2026-01-23
**Status:** Draft

---

## Table of Contents

1. [Actors](#actors)
2. [Use Case Diagram](#use-case-diagram)
3. [Use Case List](#use-case-list)
4. [Detailed Use Cases](#detailed-use-cases)
   - [Guest/Unauthenticated](#guest-use-cases)
   - [Annotator](#annotator-use-cases)
   - [Reviewer](#reviewer-use-cases)
   - [Manager](#manager-use-cases)
   - [Admin](#admin-use-cases)

---

## Actors

### Primary Actors

**1. Guest (Unauthenticated User)**
- **Description:** Visitor who has not logged in
- **Goals:** Register account, login, reset password
- **Permissions:** Public pages only

**2. Annotator**
- **Description:** Team member who performs image annotation
- **Goals:** Complete assigned tasks, improve reputation score
- **Permissions:** View assigned tasks, annotate images, submit work, request labels
- **Typical Users:** Junior data labelers, crowd workers, students

**3. Reviewer**
- **Description:** Quality controller who validates annotations
- **Goals:** Ensure annotation quality, provide feedback
- **Permissions:** Review submitted tasks, approve/reject work, re-annotate
- **Typical Users:** Senior annotators, QA specialists

**4. Manager**
- **Description:** Project manager who organizes annotation work
- **Goals:** Create projects, assign tasks, monitor progress, export datasets
- **Permissions:** All Annotator/Reviewer permissions + project management + team management
- **Typical Users:** Team leads, project coordinators, ML engineers

**5. Admin (System Administrator)**
- **Description:** Technical administrator with full system access
- **Goals:** Maintain system health, manage users, configure settings
- **Permissions:** All system features, user management, system configuration
- **Typical Users:** IT administrators, DevOps engineers

### Secondary Actors

**6. AI Assistant (Google Gemini)**
- **Description:** External AI service for assistance
- **Purpose:** Generate annotation suggestions, answer questions, auto-create labels
- **Interactions:** Called by primary actors through chat interface

**7. Email Service**
- **Description:** External email delivery service (SMTP, SendGrid)
- **Purpose:** Send notifications, password resets, reports

**8. Cloud Storage**
- **Description:** External file storage (AWS S3, Cloudinary)
- **Purpose:** Store uploaded images, exported datasets

---

## Use Case Diagram

### System Boundary: V-Label Platform

```
┌─────────────────────────────────────────────────────────────────────┐
│                        V-Label Platform                              │
│                                                                       │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │                  Authentication                           │     │
│   │  UC-01: Register Account                                  │     │
│   │  UC-02: Login (Email/Password)                            │     │
│   │  UC-03: Login (Google OAuth)                              │     │
│   │  UC-04: Reset Password                                    │     │
│   │  UC-05: Logout                                            │     │
│   └──────────────────────────────────────────────────────────┘     │
│                                                                       │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │                    Annotation                             │     │
│   │  UC-10: View Assigned Tasks                               │     │
│   │  UC-11: Open Annotation Workspace                         │     │
│   │  UC-12: Draw Annotations (Bounding Box/Polygon)           │     │
│   │  UC-13: Request AI Suggestions                            │     │
│   │  UC-14: Save Annotations (Draft)                          │     │
│   │  UC-15: Submit Task for Review                            │     │
│   │  UC-16: Request New Label                                 │     │
│   └──────────────────────────────────────────────────────────┘     │
│                                                                       │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │                     Review                                │     │
│   │  UC-20: View Review Queue                                 │     │
│   │  UC-21: Review Submitted Task                             │     │
│   │  UC-22: Approve Task                                      │     │
│   │  UC-23: Reject Task with Feedback                         │     │
│   │  UC-24: Re-annotate Task                                  │     │
│   │  UC-25: Compare Consensus Annotations                     │     │
│   └──────────────────────────────────────────────────────────┘     │
│                                                                       │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │                Project Management                         │     │
│   │  UC-30: Create Project                                    │     │
│   │  UC-31: Upload Images                                     │     │
│   │  UC-32: Add Team Members                                  │     │
│   │  UC-33: Assign Tasks (Manual)                             │     │
│   │  UC-34: Assign Tasks (Automatic)                          │     │
│   │  UC-35: View Project Dashboard                            │     │
│   │  UC-36: Export Dataset (YOLO/COCO)                        │     │
│   │  UC-37: Delete Project                                    │     │
│   └──────────────────────────────────────────────────────────┘     │
│                                                                       │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │                  Label Management                         │     │
│   │  UC-40: Create Label                                      │     │
│   │  UC-41: Create Label Category                             │     │
│   │  UC-42: Edit Label                                        │     │
│   │  UC-43: Delete Label                                      │     │
│   │  UC-44: Review Label Requests                             │     │
│   │  UC-45: Approve/Reject Label Request                      │     │
│   └──────────────────────────────────────────────────────────┘     │
│                                                                       │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │                 System Administration                     │     │
│   │  UC-50: Manage Users                                      │     │
│   │  UC-51: Change User Role                                  │     │
│   │  UC-52: Activate/Deactivate User                          │     │
│   │  UC-53: Impersonate User                                  │     │
│   │  UC-54: Configure System Settings                         │     │
│   │  UC-55: Manage Email Templates                            │     │
│   │  UC-56: View Audit Logs                                   │     │
│   │  UC-57: Send System Announcement                          │     │
│   │  UC-58: Configure AI Chat                                 │     │
│   └──────────────────────────────────────────────────────────┘     │
│                                                                       │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │                    Notifications                          │     │
│   │  UC-60: View Notifications                                │     │
│   │  UC-61: Mark Notification as Read                         │     │
│   │  UC-62: Delete Notification                               │     │
│   └──────────────────────────────────────────────────────────┘     │
│                                                                       │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │                     AI Assistant                          │     │
│   │  UC-70: Chat with AI                                      │     │
│   │  UC-71: AI Auto-Create Labels                             │     │
│   │  UC-72: AI Create User                                    │     │
│   └──────────────────────────────────────────────────────────┘     │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘

   Guest          Annotator       Reviewer        Manager         Admin
    │                │               │               │              │
    │                │               │               │              │
    ▼                ▼               ▼               ▼              ▼
  UC-01-04       UC-10-16        UC-20-25        UC-30-45       UC-50-58
                                                 (+ UC-10-25)   (+ All)
```

---

## Use Case List

### Guest Use Cases
| ID | Use Case | Priority | Status |
|----|----------|----------|--------|
| UC-01 | Register Account | High | ✅ Implemented |
| UC-02 | Login (Email/Password) | High | ✅ Implemented |
| UC-03 | Login (Google OAuth) | Medium | ✅ Implemented |
| UC-04 | Reset Password | Medium | ✅ Implemented |
| UC-05 | Logout | High | ✅ Implemented |

### Annotator Use Cases
| ID | Use Case | Priority | Status |
|----|----------|----------|--------|
| UC-10 | View Assigned Tasks | High | ❌ Not Implemented |
| UC-11 | Open Annotation Workspace | High | ✅ Implemented (UI only) |
| UC-12 | Draw Annotations | High | ✅ Implemented |
| UC-13 | Request AI Suggestions | Medium | ⏳ Backend Ready |
| UC-14 | Save Annotations | High | ❌ Not Implemented |
| UC-15 | Submit Task for Review | High | ❌ Not Implemented |
| UC-16 | Request New Label | Medium | ✅ Implemented |
| UC-60 | View Notifications | Medium | ✅ Implemented |

### Reviewer Use Cases
| ID | Use Case | Priority | Status |
|----|----------|----------|--------|
| UC-20 | View Review Queue | High | ❌ Not Implemented |
| UC-21 | Review Submitted Task | High | ❌ Not Implemented |
| UC-22 | Approve Task | High | ❌ Not Implemented |
| UC-23 | Reject Task with Feedback | High | ❌ Not Implemented |
| UC-24 | Re-annotate Task | Medium | ❌ Not Implemented |
| UC-25 | Compare Consensus Annotations | Medium | ❌ Not Implemented |

### Manager Use Cases
| ID | Use Case | Priority | Status |
|----|----------|----------|--------|
| UC-30 | Create Project | High | ❌ Not Implemented |
| UC-31 | Upload Images | High | ❌ Not Implemented |
| UC-32 | Add Team Members | High | ❌ Not Implemented |
| UC-33 | Assign Tasks (Manual) | High | ❌ Not Implemented |
| UC-34 | Assign Tasks (Automatic) | Medium | ❌ Not Implemented |
| UC-35 | View Project Dashboard | Medium | ⏳ UI Ready (Mock) |
| UC-36 | Export Dataset | High | ❌ Not Implemented |
| UC-37 | Delete Project | Low | ❌ Not Implemented |
| UC-40 | Create Label | Medium | ✅ Implemented |
| UC-41 | Create Label Category | Medium | ✅ Implemented |
| UC-42 | Edit Label | Medium | ✅ Implemented |
| UC-43 | Delete Label | Low | ✅ Implemented |
| UC-44 | Review Label Requests | Medium | ✅ Implemented |
| UC-45 | Approve/Reject Label Request | Medium | ✅ Implemented |

### Admin Use Cases
| ID | Use Case | Priority | Status |
|----|----------|----------|--------|
| UC-50 | Manage Users | High | ✅ Implemented |
| UC-51 | Change User Role | High | ✅ Implemented |
| UC-52 | Activate/Deactivate User | High | ✅ Implemented |
| UC-53 | Impersonate User | Medium | ✅ Implemented |
| UC-54 | Configure System Settings | Medium | ✅ Implemented |
| UC-55 | Manage Email Templates | Medium | ✅ Implemented |
| UC-56 | View Audit Logs | Low | ⏳ Backend Ready |
| UC-57 | Send System Announcement | Medium | ✅ Implemented |
| UC-58 | Configure AI Chat | Medium | ✅ Implemented |

### AI Assistant Use Cases
| ID | Use Case | Priority | Status |
|----|----------|----------|--------|
| UC-70 | Chat with AI | Medium | ✅ Implemented |
| UC-71 | AI Auto-Create Labels | Medium | ✅ Implemented |
| UC-72 | AI Create User | Low | ✅ Implemented |

---

## Detailed Use Cases

---

## Guest Use Cases

### UC-01: Register Account

**Actor:** Guest
**Priority:** High
**Status:** ✅ Implemented

**Description:**
A visitor creates a new account to access the platform.

**Preconditions:**
- User is not logged in
- User has a valid email address

**Postconditions:**
- New user account created with status "inactive"
- User receives welcome email (planned)
- Admin notified of new registration (optional)

**Main Flow:**
1. User navigates to registration page
2. System displays registration form
3. User enters:
   - Email address
   - Full name
   - Password (min 8 chars, mixed case, number)
   - Password confirmation
4. User clicks "Register" button
5. System validates input:
   - Email format valid
   - Email not already registered
   - Password meets requirements
   - Passwords match
6. System creates user account:
   - Role: ANNOTATOR (default)
   - Status: INACTIVE
   - Password hashed with bcrypt (cost=12)
7. System displays success message: "Registration successful. Please wait for admin approval."
8. System sends welcome email (planned)
9. User redirected to login page

**Alternative Flows:**

**5a. Email already exists:**
- System displays error: "Email already registered"
- User can click "Login instead" or try different email

**5b. Password too weak:**
- System displays error: "Password must contain at least 8 characters, including uppercase, lowercase, and numbers"
- User corrects password

**5c. Passwords don't match:**
- System displays error: "Passwords do not match"
- User re-enters confirmation

**UI Mockup:**
```
┌────────────────────────────────────┐
│  Register New Account              │
│                                    │
│  Email:     [                    ] │
│  Full Name: [                    ] │
│  Password:  [                    ] │
│  Confirm:   [                    ] │
│                                    │
│  [    Register    ]                │
│                                    │
│  Already have account? Login       │
└────────────────────────────────────┘
```

**API Endpoint:**
```
POST /api/v1/auth/register
Body: {
  "email": "user@example.com",
  "fullName": "John Doe",
  "password": "SecurePass123"
}

Response 201:
{
  "success": true,
  "message": "Registration successful. Awaiting admin approval."
}
```

---

### UC-02: Login (Email/Password)

**Actor:** Guest
**Priority:** High
**Status:** ✅ Implemented

**Description:**
A registered user logs into the system using email and password.

**Preconditions:**
- User has registered account
- User account is activated by admin

**Postconditions:**
- User authenticated
- JWT tokens generated (access + refresh)
- User redirected to dashboard based on role

**Main Flow:**
1. User navigates to login page
2. System displays login form
3. User enters email and password
4. User clicks "Login" button
5. System validates credentials:
   - User exists
   - Account is active
   - Password matches (bcrypt verify)
6. System generates JWT tokens:
   - Access token (15 minutes expiry)
   - Refresh token (7 days expiry)
7. System sets HTTP-only cookie for refresh token
8. System logs audit event (login success)
9. System redirects based on role:
   - ADMIN → Admin Dashboard
   - MANAGER → Projects List
   - REVIEWER → Review Queue
   - ANNOTATOR → My Tasks

**Alternative Flows:**

**5a. Invalid credentials:**
- System displays error: "Invalid email or password"
- System logs failed login attempt (audit log)
- User can retry

**5b. Account inactive:**
- System displays error: "Your account is pending approval. Please contact admin."
- User cannot login until activated

**5c. Account deactivated:**
- System displays error: "Your account has been deactivated. Please contact admin."

**UI Mockup:**
```
┌────────────────────────────────────┐
│  Login to V-Label                  │
│                                    │
│  Email:    [                     ] │
│  Password: [                     ] │
│                                    │
│  ☐ Remember me                     │
│                                    │
│  [       Login       ]             │
│                                    │
│  Forgot password?                  │
│  Don't have account? Register      │
│                                    │
│  ─── OR ───                        │
│                                    │
│  [  Sign in with Google  ]         │
└────────────────────────────────────┘
```

**API Endpoint:**
```
POST /api/v1/auth/login
Body: {
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response 200:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "ANNOTATOR",
      "avatarUrl": null
    }
  }
}

Response 401:
{
  "success": false,
  "error": "Invalid email or password"
}
```

---

### UC-04: Reset Password

**Actor:** Guest
**Priority:** Medium
**Status:** ✅ Implemented

**Description:**
User who forgot password can reset it via email link.

**Preconditions:**
- User has registered account
- User has access to registered email

**Postconditions:**
- Password changed
- Old password invalid
- User can login with new password

**Main Flow:**
1. User clicks "Forgot password?" on login page
2. System displays "Reset Password" form
3. User enters email address
4. User clicks "Send Reset Link"
5. System validates email exists
6. System generates secure reset token:
   - 32-byte random token
   - 1 hour expiry
   - Stored in password_reset_tokens table
7. System sends email with reset link:
   - Link: https://app.com/reset-password?token=abc123
   - Template includes user name, expiry time
8. System displays: "If email exists, reset link sent"
9. User checks email and clicks link
10. System validates token:
    - Token exists
    - Not expired
    - Not already used
11. System displays "New Password" form
12. User enters new password (2x)
13. User clicks "Reset Password"
14. System validates password requirements
15. System updates password (bcrypt hash)
16. System marks token as used
17. System logs password reset (audit log)
18. System displays success message
19. User redirected to login page

**Alternative Flows:**

**5a. Email doesn't exist:**
- System still displays "If email exists, reset link sent" (security: don't reveal if email registered)

**10a. Token expired:**
- System displays: "Reset link expired. Please request a new one."
- User redirected to step 2

**10b. Token already used:**
- System displays: "Reset link already used. Please request a new one."

**14a. Weak password:**
- System displays validation errors
- User corrects password

**API Endpoints:**
```
POST /api/v1/auth/forgot-password
Body: { "email": "user@example.com" }
Response 200: { "success": true, "message": "If email exists, reset link sent" }

POST /api/v1/auth/reset-password
Body: {
  "token": "abc123",
  "password": "NewSecurePass123"
}
Response 200: { "success": true, "message": "Password reset successful" }
```

---

## Annotator Use Cases

### UC-10: View Assigned Tasks

**Actor:** Annotator
**Priority:** High
**Status:** ❌ Not Implemented

**Description:**
Annotator views list of tasks assigned to them.

**Preconditions:**
- User logged in as Annotator
- Tasks assigned to user

**Postconditions:**
- Task list displayed
- User can navigate to annotation workspace

**Main Flow:**
1. Annotator navigates to "My Tasks" page
2. System retrieves assigned tasks:
   - Filter: assignedTo = current user
   - Sort: deadline ASC (urgent first)
3. System displays task list with:
   - Task image thumbnail
   - Project name
   - Status (TODO, IN_PROGRESS, SUBMITTED, REJECTED)
   - Deadline (with visual indicator if urgent)
   - Progress (annotations saved)
4. System shows filters:
   - Status filter (All, TODO, In Progress, Rejected)
   - Project filter (dropdown)
   - Search by image name
5. Annotator can:
   - Click task to open workspace (UC-11)
   - Filter/search tasks
   - Sort by deadline, project, status

**Alternative Flows:**

**2a. No tasks assigned:**
- System displays: "No tasks assigned yet. Check back later!"
- Show illustration

**UI Mockup:**
```
┌──────────────────────────────────────────────────────────┐
│ My Tasks                                [Filter] [Sort ▼] │
├──────────────────────────────────────────────────────────┤
│                                                            │
│ ┌────────────────────────────────────────────────────┐   │
│ │ [IMG] Project: Traffic Dataset                     │   │
│ │       image_001.jpg                                │   │
│ │       Status: TODO                                 │   │
│ │       Deadline: 2026-01-25 (2 days) 🔴            │   │
│ │       Progress: 0/1 annotations                    │   │
│ │                                    [Start Annotating] │
│ └────────────────────────────────────────────────────┘   │
│                                                            │
│ ┌────────────────────────────────────────────────────┐   │
│ │ [IMG] Project: Animal Recognition                  │   │
│ │       cat_01.jpg                                   │   │
│ │       Status: IN_PROGRESS                          │   │
│ │       Deadline: 2026-01-28 (5 days)                │   │
│ │       Progress: Draft saved 10 mins ago            │   │
│ │                                       [Continue] │       │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

**API Endpoint:**
```
GET /api/v1/tasks/my-tasks?status=TODO&project=uuid&page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "imageUrl": "https://cdn.com/img.jpg",
        "imageName": "image_001.jpg",
        "project": {
          "id": "uuid",
          "name": "Traffic Dataset"
        },
        "status": "TODO",
        "deadline": "2026-01-25T23:59:59Z",
        "annotationProgress": {
          "saved": false,
          "lastSavedAt": null,
          "regionCount": 0
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### UC-12: Draw Annotations

**Actor:** Annotator
**Priority:** High
**Status:** ✅ Implemented (UI), ❌ Not Implemented (Save API)

**Description:**
Annotator draws bounding boxes or polygons on image to label objects.

**Preconditions:**
- User in annotation workspace (UC-11)
- Image loaded on canvas
- Labels available

**Postconditions:**
- Annotations created and saved
- Annotations stored in JSONB format

**Main Flow:**
1. Annotator selects annotation tool:
   - Rectangle (bounding box)
   - Polygon (planned)
2. Annotator selects label from sidebar
3. **For Rectangle:**
   - Click and drag on canvas
   - Rectangle drawn with label color
   - Region added to regions list
4. **For Polygon (planned):**
   - Click to add vertices
   - Double-click to close polygon
5. Annotator can edit annotation:
   - Click to select
   - Drag to move
   - Drag corners/edges to resize
   - Delete with Delete key
6. System auto-saves every 30 seconds (UC-14)
7. Annotation data format:
   ```json
   {
     "id": "uuid",
     "type": "rectangle",
     "x": 100,
     "y": 150,
     "width": 200,
     "height": 300,
     "labelId": "uuid",
     "labelName": "Car",
     "color": "#FF5733",
     "confidence": 1.0,
     "isAiGenerated": false
   }
   ```

**Alternative Flows:**

**3a. No label selected:**
- System displays tooltip: "Please select a label first"

**6a. Auto-save fails:**
- System shows warning icon
- Annotations stored in localStorage as backup
- Retry auto-save on next interval

**Keyboard Shortcuts:**
- `1-9`: Quick label selection
- `Delete`: Remove selected annotation
- `Ctrl+Z`: Undo last action
- `Ctrl+Y`: Redo
- `Esc`: Deselect annotation

**UI Mockup:**
```
┌──────────────────────────────────────────────────────────────┐
│ [<] image_001.jpg  [□ Rectangle] [⬡ Polygon]     [Submit] │
├─────────┬────────────────────────────────────────┬─────────┤
│ Labels  │                                        │ Regions │
│         │                                        │         │
│ □ Car   │         [Image with                   │ 1. Car  │
│ □ Person│          bounding boxes]               │    x:100│
│ □ Tree  │                                        │    y:150│
│         │                                        │         │
│ [+ Request│                                      │ 2. Person│
│  Label] │                                        │    x:350│
│         │                                        │    y:200│
│         │                                        │         │
│ [AI Hint│    [Zoom: 100%]  [Pan]  [Fit]         │ [Delete]│
└─────────┴────────────────────────────────────────┴─────────┘
             Auto-saved 30 seconds ago ✓
```

**Component Structure:**
- WorkspaceCanvas.tsx - Konva canvas
- AnnotationLayer.tsx - Annotation overlay
- Rectangle.tsx - Bounding box component
- WorkspaceSidebar.tsx - Label list
- RegionsList.tsx - Annotation list

---

### UC-15: Submit Task for Review

**Actor:** Annotator
**Priority:** High
**Status:** ❌ Not Implemented

**Description:**
Annotator submits completed task for reviewer approval.

**Preconditions:**
- User in annotation workspace
- At least 1 annotation drawn
- Annotations saved

**Postconditions:**
- Task status changed to SUBMITTED
- Reviewer notified
- Task removed from annotator's active queue

**Main Flow:**
1. Annotator clicks "Submit for Review" button
2. System validates:
   - At least 1 annotation exists
   - All annotations have valid labels
   - Annotations saved successfully
3. System displays confirmation dialog:
   - "Are you sure you want to submit? You cannot edit after submission."
   - "Annotations: 5 objects labeled"
4. Annotator confirms
5. System updates task_assignment:
   - Status: SUBMITTED
   - submittedAt: current timestamp
   - annotations: JSONB array
6. System creates notification for reviewer:
   - Type: TASK_SUBMITTED
   - Title: "New task submitted by {annotator}"
   - Link to review interface
7. System sends email to reviewer (if enabled)
8. System displays success message:
   - "Task submitted successfully! ✓"
   - "Reputation: +2 (pending review)"
9. System redirects to task list (UC-10)

**Alternative Flows:**

**2a. No annotations:**
- System displays error: "Cannot submit empty task. Please add at least 1 annotation."
- Submit button disabled

**2b. Unsaved changes:**
- System displays warning: "You have unsaved changes. Save before submitting?"
- Options: [Save & Submit] [Cancel]

**4a. User cancels:**
- Dialog closes
- Remain in workspace

**API Endpoint:**
```
POST /api/v1/tasks/:id/submit

Response 200:
{
  "success": true,
  "message": "Task submitted successfully",
  "data": {
    "taskId": "uuid",
    "status": "SUBMITTED",
    "submittedAt": "2026-01-23T10:30:00Z",
    "annotationCount": 5
  }
}

Response 400:
{
  "success": false,
  "error": "Cannot submit task with no annotations"
}
```

---

## Reviewer Use Cases

### UC-20: View Review Queue

**Actor:** Reviewer
**Priority:** High
**Status:** ❌ Not Implemented

**Description:**
Reviewer views list of tasks submitted for review.

**Preconditions:**
- User logged in as Reviewer
- Tasks submitted by annotators

**Postconditions:**
- Review queue displayed
- Reviewer can select task to review

**Main Flow:**
1. Reviewer navigates to "Review Queue" page
2. System retrieves submitted tasks:
   - Filter: status = SUBMITTED
   - Filter: reviewerId = current user (if assigned)
   - Sort: submittedAt ASC (oldest first)
3. System displays task list with:
   - Task image thumbnail
   - Project name
   - Annotator name
   - Submission date
   - Number of annotations
   - Priority indicator (deadline, consensus count)
4. System shows filters:
   - Project filter
   - Annotator filter
   - Consensus filter (tasks with 2+ annotations)
   - Date range
5. Reviewer can:
   - Click task to open review interface (UC-21)
   - Filter tasks
   - Sort by date, project, annotator

**Alternative Flows:**

**2a. No tasks in queue:**
- System displays: "No tasks awaiting review. Great job!"

**UI Mockup:**
```
┌──────────────────────────────────────────────────────────┐
│ Review Queue                          [Filter] [Sort ▼]   │
├──────────────────────────────────────────────────────────┤
│                                                            │
│ ┌────────────────────────────────────────────────────┐   │
│ │ [IMG] Project: Traffic Dataset                     │   │
│ │       Annotator: John Doe                          │   │
│ │       Submitted: 2 hours ago                       │   │
│ │       Annotations: 8 objects                       │   │
│ │       Consensus: 2/2 annotators completed 🟢      │   │
│ │                                       [Review Now] │   │
│ └────────────────────────────────────────────────────┘   │
│                                                            │
│ ┌────────────────────────────────────────────────────┐   │
│ │ [IMG] Project: Animal Recognition                  │   │
│ │       Annotator: Jane Smith                        │   │
│ │       Submitted: 1 day ago                         │   │
│ │       Annotations: 3 objects                       │   │
│ │       Consensus: 1/2 annotators (waiting) 🟡      │   │
│ │                                       [Review Now] │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

**API Endpoint:**
```
GET /api/v1/review/queue?project=uuid&consensus=true&page=1

Response 200:
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "imageUrl": "https://cdn.com/img.jpg",
        "project": { "id": "uuid", "name": "Traffic Dataset" },
        "annotator": {
          "id": "uuid",
          "fullName": "John Doe",
          "reputationScore": 85
        },
        "submittedAt": "2026-01-23T08:30:00Z",
        "annotationCount": 8,
        "consensusInfo": {
          "required": 2,
          "completed": 2,
          "agreementScore": 0.87
        }
      }
    ],
    "pagination": { "page": 1, "total": 23 }
  }
}
```

---

### UC-22: Approve Task

**Actor:** Reviewer
**Priority:** High
**Status:** ❌ Not Implemented

**Description:**
Reviewer approves high-quality annotations.

**Preconditions:**
- User in review interface (UC-21)
- Task status is SUBMITTED

**Postconditions:**
- Task status changed to APPROVED
- Annotator reputation increased
- Annotator notified
- Task available for export

**Main Flow:**
1. Reviewer reviews annotations on canvas
2. Reviewer verifies:
   - All objects labeled
   - Bounding boxes accurate (tight fit)
   - Correct labels applied
   - Quality meets project standards
3. Reviewer clicks "Approve" button
4. System displays optional feedback form:
   - Review score (1-5 stars)
   - Optional comment (positive feedback)
5. Reviewer submits approval
6. System updates task_assignment:
   - Status: APPROVED
   - reviewedBy: current user ID
   - reviewedAt: current timestamp
   - reviewScore: star rating (1-5)
   - reviewComment: feedback text
7. System updates annotator reputation:
   - If reviewScore >= 4: +5 points
   - If reviewScore == 3: +2 points
   - If reviewScore < 3: +0 points
8. System creates notification for annotator:
   - Type: TASK_APPROVED
   - Title: "Your task was approved! ⭐ {score}/5"
   - Message: reviewer comment
9. System sends email notification (if enabled)
10. System displays success message
11. System loads next task in queue (or return to queue)

**Alternative Flows:**

**5a. Reviewer skips feedback:**
- Default score: 5 stars
- Default comment: "Good work!"
- Continue with approval

**Business Rules:**
- Only approved tasks included in dataset export
- Approval cannot be reversed (unless admin)
- Reviewer can approve their own annotations (if role dual)

**API Endpoint:**
```
POST /api/v1/review/:id/approve
Body: {
  "reviewScore": 5,
  "reviewComment": "Excellent work! Very accurate bounding boxes."
}

Response 200:
{
  "success": true,
  "message": "Task approved successfully",
  "data": {
    "taskId": "uuid",
    "status": "APPROVED",
    "reviewedBy": "uuid",
    "reviewScore": 5,
    "annotatorReputationChange": +5
  }
}
```

---

### UC-23: Reject Task with Feedback

**Actor:** Reviewer
**Priority:** High
**Status:** ❌ Not Implemented

**Description:**
Reviewer rejects poor-quality annotations and provides feedback.

**Preconditions:**
- User in review interface
- Task status is SUBMITTED

**Postconditions:**
- Task status changed to REJECTED
- Task returned to annotator
- Annotator reputation decreased
- Annotator notified with feedback

**Main Flow:**
1. Reviewer identifies quality issues:
   - Missed objects
   - Incorrect labels
   - Loose bounding boxes
   - Wrong objects labeled
2. Reviewer clicks "Reject" button
3. System displays feedback form (required):
   - Review score (1-5 stars, default 2)
   - Feedback reason (required, min 20 chars):
     - "Missed objects"
     - "Incorrect labels"
     - "Loose bounding boxes"
     - "Other" (text field)
   - Specific comments (e.g., "Missed 3 cars on the right side")
4. Reviewer submits rejection
5. System validates feedback provided
6. System updates task_assignment:
   - Status: REJECTED
   - reviewedBy: current user ID
   - reviewedAt: timestamp
   - reviewScore: star rating
   - reviewComment: detailed feedback
7. System updates annotator reputation:
   - If reviewScore == 2: -2 points
   - If reviewScore == 1: -5 points
8. System creates notification for annotator:
   - Type: TASK_REJECTED
   - Title: "Task rejected - please review feedback"
   - Message: reviewer comment
   - Priority: High
   - Action button: "Fix & Resubmit"
9. System sends email notification
10. System displays success message
11. System loads next task in queue

**Alternative Flows:**

**5a. Feedback too short:**
- System displays error: "Please provide specific feedback (min 20 characters)"
- Reviewer adds more detail

**5b. Reviewer cancels:**
- Return to review interface without rejecting

**Business Rules:**
- Rejected tasks returned to annotator's queue (status: TODO)
- Annotator can resubmit after fixing
- Multiple rejections significantly impact reputation
- After 3 rejections, annotator may require training

**API Endpoint:**
```
POST /api/v1/review/:id/reject
Body: {
  "reviewScore": 2,
  "reviewComment": "Missed 3 cars on the right side. Bounding boxes too loose around pedestrians. Please review annotation guidelines."
}

Response 200:
{
  "success": true,
  "message": "Task rejected and returned to annotator",
  "data": {
    "taskId": "uuid",
    "status": "REJECTED",
    "reviewedBy": "uuid",
    "reviewScore": 2,
    "annotatorReputationChange": -2
  }
}
```

---

## Manager Use Cases

### UC-30: Create Project

**Actor:** Manager
**Priority:** High
**Status:** ❌ Not Implemented

**Description:**
Manager creates new annotation project.

**Preconditions:**
- User logged in as Manager
- Labels exist in system (or will be created)

**Postconditions:**
- New project created
- Manager is project owner
- Project ready for image upload (UC-31)

**Main Flow:**
1. Manager navigates to Projects page
2. Manager clicks "Create New Project" button
3. System displays project creation form
4. Manager fills in:
   - **Project Name** (required, max 100 chars)
     - Example: "Traffic Object Detection Dataset"
   - **Description** (optional, markdown supported)
     - Example: "Dataset for autonomous vehicle training. Includes cars, pedestrians, traffic signs."
   - **Labels** (required, select from existing or create new)
     - Select global labels: Car, Person, Bicycle
     - Create project-specific: Traffic Sign, Road Marking
   - **Deadline** (optional, date picker)
   - **Consensus Labeling** (checkbox):
     - ☑ Require 2 annotators per image (recommended)
     - ☐ Require 3 annotators per image (high quality)
   - **AI Assistance** (checkbox):
     - ☑ Enable AI suggestions (Gemini Vision)
5. Manager clicks "Create Project"
6. System validates:
   - Project name unique
   - At least 1 label selected
   - If consensus enabled, enough annotators available
7. System creates project:
   - Status: DRAFT (until images uploaded)
   - Owner: current user
   - Members: [owner]
   - Labels: associated via project_labels table
8. System displays success message:
   - "Project created! Next: Upload images"
9. System redirects to project detail page (UC-35)

**Alternative Flows:**

**6a. Project name already exists:**
- System displays error: "Project name already exists. Choose another name."

**6b. No labels selected:**
- System displays error: "Please select at least 1 label"
- Option: [Create Labels First]

**6c. Not enough annotators for consensus:**
- System displays warning: "Only 3 annotators available. Consider adding more team members for consensus labeling."
- Manager can proceed anyway or adjust settings

**UI Mockup:**
```
┌──────────────────────────────────────────────────────────┐
│ Create New Project                          [X] Close     │
├──────────────────────────────────────────────────────────┤
│                                                            │
│ Project Name *                                             │
│ [                                                        ] │
│                                                            │
│ Description (Markdown supported)                           │
│ [                                                        ] │
│ [                                                        ] │
│                                                            │
│ Labels *                                                   │
│ ┌────────────────────────────────────────────────────┐   │
│ │ ☑ Car     ☑ Person    ☐ Bicycle                    │   │
│ │ ☐ Tree    ☑ Building  ☐ Traffic Sign              │   │
│ │                                      [+ Create New] │   │
│ └────────────────────────────────────────────────────┘   │
│                                                            │
│ Deadline                      ☑ Enable AI Assistance      │
│ [    Select Date    ]                                      │
│                                                            │
│ Consensus Labeling                                         │
│ ☑ Require 2 annotators per image (recommended)            │
│ ☐ Require 3 annotators per image (high quality)           │
│                                                            │
│                        [Cancel]  [Create Project]         │
└──────────────────────────────────────────────────────────┘
```

**API Endpoint:**
```
POST /api/v1/projects
Body: {
  "name": "Traffic Object Detection",
  "description": "Dataset for autonomous vehicles",
  "labelIds": ["uuid1", "uuid2"],
  "deadline": "2026-02-28T23:59:59Z",
  "consensusCount": 2,
  "enableAiAssistance": true
}

Response 201:
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Traffic Object Detection",
    "status": "DRAFT",
    "owner": { "id": "uuid", "fullName": "Manager Name" },
    "labels": [...],
    "createdAt": "2026-01-23T10:00:00Z"
  }
}
```

---

### UC-33: Assign Tasks (Manual)

**Actor:** Manager
**Priority:** High
**Status:** ❌ Not Implemented

**Description:**
Manager manually assigns tasks to specific annotators.

**Preconditions:**
- Project created (UC-30)
- Images uploaded (UC-31)
- Team members added (UC-32)

**Postconditions:**
- Tasks assigned to annotators
- Annotators notified
- Tasks appear in annotator queue (UC-10)

**Main Flow:**
1. Manager opens project detail page
2. Manager navigates to "Tasks" tab
3. System displays list of unassigned tasks (images)
4. Manager selects tasks:
   - Individual selection (checkboxes)
   - Bulk selection (select all, select page)
   - Filter: by image name, date uploaded
5. Manager clicks "Assign Tasks" button
6. System displays assignment dialog:
   - **Assign to:** (dropdown, multi-select)
     - List of team annotators
     - Show current workload (e.g., "John Doe - 15 tasks pending")
     - Show reputation score (e.g., "⭐ 87")
   - **Consensus mode:**
     - Auto-assign to {N} annotators (from project settings)
   - **Deadline:** (date picker, default: project deadline)
   - **Priority:** Normal / High / Urgent
7. Manager selects annotators and confirms
8. System validates:
   - Selected annotators are project members
   - If consensus mode: correct number of annotators
   - Annotators have capacity (max 50 active tasks per annotator)
9. System creates task_assignments:
   - One record per task per annotator
   - Status: ASSIGNED
   - Deadline: specified date
   - assignedAt: current timestamp
10. System creates notifications for each annotator:
    - Type: TASK_ASSIGNED
    - Title: "New task assigned: {project name}"
    - Count: "{N} tasks assigned"
11. System sends email notifications (if enabled)
12. System displays success message:
    - "Assigned {N} tasks to {M} annotators"
13. System updates task list (assigned tasks removed)

**Alternative Flows:**

**8a. Annotator at capacity:**
- System displays warning: "John Doe has 50 active tasks (max limit). Consider assigning to others or wait for completion."
- Manager can override or choose different annotator

**8b. Consensus conflict:**
- If consensus requires 2 annotators but only 1 selected:
- System displays error: "Consensus mode requires 2 annotators. Please select more."

**8c. No annotators selected:**
- System displays error: "Please select at least 1 annotator"

**UI Mockup:**
```
┌──────────────────────────────────────────────────────────┐
│ Assign Tasks                                              │
├──────────────────────────────────────────────────────────┤
│                                                            │
│ Selected: 10 tasks                                         │
│                                                            │
│ Assign to: *                                               │
│ ┌────────────────────────────────────────────────────┐   │
│ │ ☑ John Doe (⭐ 87) - 15 tasks pending               │   │
│ │ ☑ Jane Smith (⭐ 92) - 8 tasks pending              │   │
│ │ ☐ Bob Wilson (⭐ 65) - 45 tasks ⚠️ Near limit       │   │
│ └────────────────────────────────────────────────────┘   │
│                                                            │
│ Consensus Mode: Each task assigned to 2 annotators        │
│                                                            │
│ Deadline                       Priority                    │
│ [  2026-01-31  ]              ● Normal ○ High ○ Urgent    │
│                                                            │
│ Note: Annotators will be notified via email               │
│                                                            │
│                        [Cancel]  [Assign Tasks]           │
└──────────────────────────────────────────────────────────┘
```

**API Endpoint:**
```
POST /api/v1/projects/:id/tasks/assign
Body: {
  "taskIds": ["uuid1", "uuid2", ...],
  "annotatorIds": ["uuid1", "uuid2"],
  "deadline": "2026-01-31T23:59:59Z",
  "priority": "normal"
}

Response 200:
{
  "success": true,
  "message": "Assigned 10 tasks to 2 annotators",
  "data": {
    "assignedCount": 10,
    "annotators": ["John Doe", "Jane Smith"],
    "notificationsSent": 2
  }
}
```

---

### UC-36: Export Dataset

**Actor:** Manager
**Priority:** High
**Status:** ❌ Not Implemented

**Description:**
Manager exports approved annotations in ML-ready format (YOLO, COCO, etc.).

**Preconditions:**
- Project has approved tasks
- Annotations completed and reviewed

**Postconditions:**
- Dataset exported in selected format
- ZIP file generated and downloaded
- Export logged (audit trail)

**Main Flow:**
1. Manager opens project detail page
2. Manager clicks "Export Dataset" button
3. System validates:
   - At least 1 approved task exists
   - Project is in ACTIVE or COMPLETED status
4. System displays export configuration dialog:
   - **Format:** (radio buttons)
     - ○ YOLO (recommended for object detection)
     - ○ COCO JSON (for segmentation)
     - ○ Pascal VOC XML
     - ○ CSV (tabular format)
   - **Train/Val/Test Split:**
     - Train: [70]% slider
     - Val:   [20]% slider
     - Test:  [10]% slider
     - Total: 100% (auto-adjust)
   - **Include Images:** ☑ (checkbox)
   - **Include Metadata:** ☑ (checkbox)
     - Annotator names, review scores, timestamps
5. Manager configures options
6. Manager clicks "Export" button
7. System displays progress indicator
8. System generates export:
   - Query approved tasks
   - Split datasets (random shuffle with seed)
   - Generate format-specific files:
     - **YOLO:**
       - `dataset.yaml` (config)
       - `classes.txt` (label mapping)
       - `train/images/` and `train/labels/`
       - `val/images/` and `val/labels/`
       - `test/images/` and `test/labels/`
     - **COCO:**
       - `instances_train.json`
       - `instances_val.json`
       - `instances_test.json`
       - `images/` folder
   - Create ZIP archive
9. System logs export (audit trail):
   - Project ID, format, timestamp, user
10. System provides download link:
    - Direct download (if < 500MB)
    - S3 signed URL (if > 500MB, expires in 1 hour)
11. System displays success message:
    - "Dataset exported successfully! ✓"
    - "Total images: 1000 (train: 700, val: 200, test: 100)"
    - Download button
12. Manager downloads ZIP file

**Alternative Flows:**

**3a. No approved tasks:**
- System displays error: "No approved tasks to export. Please complete and review annotations first."
- Show project statistics

**8a. Export exceeds size limit (> 5GB):**
- System displays warning: "Large export detected. This may take 10-15 minutes."
- Option to receive email when ready
- Background processing

**8b. Export fails:**
- System displays error with details
- Option to retry or contact support

**YOLO Format Example:**
```
dataset.yaml:
---
path: /dataset
train: images/train
val: images/val
test: images/test

nc: 3
names: ['car', 'person', 'bicycle']
```

```
labels/train/image_001.txt:
0 0.5 0.3 0.2 0.4
1 0.7 0.6 0.1 0.2

Format: <class-id> <x-center> <y-center> <width> <height>
(normalized 0-1)
```

**API Endpoint:**
```
POST /api/v1/projects/:id/export
Body: {
  "format": "yolo",
  "split": {
    "train": 0.7,
    "val": 0.2,
    "test": 0.1
  },
  "includeImages": true,
  "includeMetadata": true
}

Response 200:
{
  "success": true,
  "data": {
    "exportId": "uuid",
    "format": "yolo",
    "status": "completed",
    "fileSize": "125.4 MB",
    "downloadUrl": "https://cdn.com/exports/dataset.zip?signature=...",
    "expiresAt": "2026-01-23T11:00:00Z",
    "statistics": {
      "totalImages": 1000,
      "train": 700,
      "val": 200,
      "test": 100,
      "totalAnnotations": 5432
    }
  }
}
```

---

## Admin Use Cases

### UC-50: Manage Users

**Actor:** Admin
**Priority:** High
**Status:** ✅ Implemented

**Description:**
Admin views and manages all user accounts.

**Preconditions:**
- User logged in as Admin

**Postconditions:**
- User list displayed
- Admin can perform actions on users

**Main Flow:**
1. Admin navigates to "User Management" page
2. System retrieves all users with pagination
3. System displays user table:
   - Columns: Avatar, Name, Email, Role, Status, Registered, Actions
   - Pagination: 20 users per page
   - Total count displayed
4. System provides filters:
   - Role filter (All, Admin, Manager, Reviewer, Annotator)
   - Status filter (All, Active, Inactive)
   - Search by name or email
   - Date range (registration date)
5. System provides actions (per user):
   - Edit role (UC-51)
   - Activate/Deactivate (UC-52)
   - Impersonate (UC-53)
   - View details (popup modal)
   - View audit logs (user activity)
6. Admin can:
   - Sort by any column
   - Bulk select users
   - Bulk activate/deactivate
   - Export user list (CSV)

**Alternative Flows:**

**2a. No users match filter:**
- System displays: "No users found matching your criteria"

**UI Mockup:**
```
┌──────────────────────────────────────────────────────────────┐
│ User Management                     [+ Invite User] [Export] │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│ Filters: [All Roles ▼] [All Status ▼] [Search...        ]   │
│                                                                │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ ☐ │ Avatar │ Name        │ Email    │ Role  │ Status│ │   │
│ ├───┼────────┼─────────────┼──────────┼───────┼───────┤ │   │
│ │ ☐ │ [JD]   │ John Doe    │ john@... │ ANNOT │ ✅    │●│   │
│ │ ☐ │ [JS]   │ Jane Smith  │ jane@... │ REVIEW│ ✅    │●│   │
│ │ ☐ │ [BW]   │ Bob Wilson  │ bob@...  │ MANAG │ ⏸️     │●│   │
│ └────────────────────────────────────────────────────────┘   │
│                                                                │
│ Showing 1-20 of 145 users            [◀] Page 1 of 8 [▶]    │
└──────────────────────────────────────────────────────────────┘

[●] Actions menu: Edit Role, Activate, Deactivate, Impersonate
```

**API Endpoint:**
```
GET /api/v1/admin/users?role=ANNOTATOR&status=active&search=john&page=1&limit=20

Response 200:
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "john@example.com",
        "fullName": "John Doe",
        "role": "ANNOTATOR",
        "isActive": true,
        "reputationScore": 85,
        "totalTasksDone": 120,
        "createdAt": "2025-12-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 145,
      "totalPages": 8
    }
  }
}
```

**Status:** ✅ Fully implemented

---

## Summary Statistics

### Implementation Status

| Category | Total | Implemented | In Progress | Not Implemented |
|----------|-------|-------------|-------------|-----------------|
| **Guest** | 5 | 5 (100%) | 0 | 0 |
| **Annotator** | 8 | 2 (25%) | 1 (13%) | 5 (62%) |
| **Reviewer** | 6 | 0 (0%) | 0 | 6 (100%) |
| **Manager** | 17 | 7 (41%) | 1 (6%) | 9 (53%) |
| **Admin** | 9 | 9 (100%) | 0 | 0 |
| **AI** | 3 | 3 (100%) | 0 | 0 |
| **Total** | **48** | **26 (54%)** | **2 (4%)** | **20 (42%)** |

### Priority Breakdown

| Priority | Total | Status |
|----------|-------|--------|
| **High** | 25 | 13 ✅  12 ❌ |
| **Medium** | 18 | 11 ✅  7 ❌ |
| **Low** | 5 | 2 ✅  1 ⏳  2 ❌ |

---

**Document Version:** 1.0
**Last Updated:** 2026-01-23
**Maintained By:** Development Team
**Next Review:** 2026-02-01
