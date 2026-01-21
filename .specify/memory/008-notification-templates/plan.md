# Plan: Notification Templates Management

## Goal
Allow Admin to configure notification templates (title and message) for each system notification type. This replaces hardcoded strings with dynamic templates stored in the database.

## Architecture Change

### Database
- **New Model**: `NotificationTemplate`
  - `id`: UUID
  - `type`: `NotificationType` (Unique)
  - `titleTemplate`: String (supports variable interpolation, e.g., `{userName}`)
  - `messageTemplate`: String (supports variable interpolation)
  - `variables`: JSON (list of available variables for this type)
  - `isActive`: Boolean
  - `createdAt`, `updatedAt`

### Backend
- **Core Service**: `NotificationTemplateService`
  - `getTemplate(type)`: Fetches template from DB (or falls back to default).
  - `render(type, data)`: Renders title and message using data.
  - `upsertTemplate(type, data)`: For admin to update templates.
- **API**: `NotificationAdminController`
  - `GET /admin/notifications/templates`: List all templates.
  - `PUT /admin/notifications/templates/:type`: Update a template.
- **Variable Support**:
  - `SYSTEM_ANNOUNCEMENT`: `{adminName}`, `{status}` (enabled/disabled), `{eventType}`.
  - `TASK_ASSIGNED`: `{managerName}`, `{taskName}`, `{projectName}`.
  - `TASK_SUBMITTED`: `{annotatorName}`, `{taskName}`.
  - ...and so on.

### Frontend
- **Admin Page**: `AdminNotificationSettingsPage`
  - List of notification types.
  - Edit modal/drawer for each type.
  - Preview of available variables.
  - Toggle active status.

## Steps

### Phase 1: Database & Seed (Est: 1h)
1. Add `NotificationTemplate` to Prisma schema.
2. Run migration.
3. Create `NotificationTemplateService` with `seedDefaultTemplates` method.
4. Run seed on server start.

### Phase 2: Backend API (Est: 1h)
1. Implement `NotificationAdminController`.
2. Register routes: `/api/v1/admin/notifications/templates`.
3. Update `NotificationService` to use `NotificationTemplateService.render()` instead of hardcoded strings.

### Phase 3: Frontend UI (Est: 2h)
1. Create `AdminNotificationSettingsPage`.
2. Implement API service `client/src/services/notificationTemplate.api.ts`.
3. Add "Notifications" link to Admin Sidebar.

### Phase 4: Verification
1. Admin edits "System Announcement" template.
2. Admin toggles Chat Config.
3. Verify notification received matches the new template.
