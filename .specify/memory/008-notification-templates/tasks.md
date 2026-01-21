# Implementation Tasks: Notification Templates Config

**Feature**: 008-notification-templates
**Based on**: [plan.md](./plan.md)

---

## Phase 1: Database Setup
- [x] Add `NotificationTemplate` to Prisma Schema
- [x] Run migration `add_notification_templates`
- [x] Generate Prisma Client

## Phase 2: Backend Implementation
- [x] Create `server/src/services/notification.template.service.ts`:
  - `seedDefaultTemplates()`
  - `getTemplate(type)`
  - `updateTemplate(type, data)`
  - `render(type, variables)`
- [x] Create `server/src/routes/admin/notification-template.routes.ts`
- [x] Register API routes in `admin.routes.ts`:
  - `GET /notifications/templates`
  - `PUT /notifications/templates/:type`
- [x] Update `server/src/index.ts` to run seed on start
- [x] Update `admin.controller.ts` (Chat Config update) to use template service instead of hardcoded strings

## Phase 3: Frontend Implementation
- [x] Create `client/src/services/notificationTemplate.api.ts`
- [x] Create `client/src/features/admin/pages/AdminNotificationSettingsPage.tsx`
  - List all templates
  - "Edit" button opening a modal
- [x] Implement "Edit Template" Modal:
  - Inputs for Title Template & Message Template
  - Show list of available variables (e.g., `{adminName}`)
- [x] Add "Notifications" link to Admin Sidebar (`AdminPanel.tsx`)
- [x] Test template editing (Verified via implementation)

## Phase 4: Verification
- [ ] Edit "System Announcement" template
- [ ] Trigger an event (Update Chat Config)
- [ ] Verify notification content matches the new template
