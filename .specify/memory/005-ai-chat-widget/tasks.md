# Tasks: AI Chat Widget

- [ ] **Phase 1: Database & Configuration**
  - [ ] Create `SystemConfig` model in `schema.prisma`
  - [ ] Run migration `npx prisma migrate dev --name add_system_config`
  - [ ] Generate Prisma Client `npx prisma generate`

- [ ] **Phase 2: Backend API**
  - [ ] Create `GeminiService` to handle Google AI communication
  - [ ] Create `AdminController` for `getSystemConfig` / `updateSystemConfig`
  - [ ] Create `ChatController` for `handleChatCompletion`
  - [ ] Register Routes (`/admin/config`, `/chat/completion`)

- [ ] **Phase 3: Frontend - Admin Settings**
  - [x] Display chat timestamps
  - [ ] Create `ChatSettingsService` (API client)
  - [ ] Create `AdminChatSettingsPage` with form for:
    - Enable/Disable Toggle
    - Model Name Input
    - System Prompt Textarea
    - Theme Color Picker
    - Welcome Message Input
  - [ ] Add "AI Chat" tab to `AdminPanel` navigation

- [ ] **Phase 4: Frontend - Chat Widget**
  - [ ] Create `ChatWidget` component (Floating Button + Window)
  - [ ] Implement `useChatWidget` hook for logic (open/close, send message)
  - [ ] Implement Markdown rendering for AI responses
  - [ ] detailed typing indicators & scroll-to-bottom logic
  - [ ] Mount `ChatWidget` in `App.tsx` (protected by Auth check)

- [ ] **Phase 5: Verification**
  - [ ] Verify Admin can save settings
  - [ ] Verify User can chat with AI
  - [ ] Verify System Prompt behavior (custom instructions work)
