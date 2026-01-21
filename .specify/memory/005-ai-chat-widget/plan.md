# Implementation Plan: AI Chat Widget

## 1. Database Schema
We need to store the system configuration. Since this is a singleton-like setting (system-wide), we can create a `SystemConfig` model where `key` is unique.

### `schema.prisma`
```prisma
model SystemConfig {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
  
  @@map("system_configs")
}
```

**Example Config Structure (stored in `value`):**
```json
{
  "chatWidget": {
    "enabled": true,
    "modelName": "gemini-2.5-pro",
    "systemPrompt": "You are a helpful assistant...",
    "ui": {
      "themeColor": "#0ea5e9",
      "position": "right",
      "welcomeMessage": "Hello! How can I help you?"
    }
  }
}
```

## 2. Backend Implementation

### Features
- **Config Management**: APIs to read/write `SystemConfig`.
- **Chat Proxy**: API to handle chat completions.

### Files to Create/Modify
- `server/src/controllers/admin.controller.ts`: Add `getSystemConfig`, `updateSystemConfig`.
- `server/src/controllers/chat.controller.ts`: Add `handleChatCompletion`.
- `server/src/routes/admin.routes.ts`: Add config routes.
- `server/src/routes/chat.routes.ts`: Add chat route.
- `server/src/services/gemini.service.ts`: Handle communication with Google Gemini API.

## 3. Frontend Implementation

### Features
- **Admin Settings**: A new tab in Admin Panel to configure the widget.
- **Chat Widget**: The floating UI component visible to logged-in users.

### Files to Create/Modify
- `client/src/features/admin/pages/AdminChatSettingsPage.tsx`: Form to edit config.
- `client/src/features/chat-widget/`: New feature directory.
  - `components/ChatWidget.tsx`: Main floating button & window.
  - `components/ChatWindow.tsx`: Message list & input.
  - `hooks/useChatWidget.ts`: Logic for toggling, sending messages.
  - `services/chatWidget.api.ts`: API calls for config & completion.
- `client/src/App.tsx`: Mount `ChatWidget` globally (conditionally for logged-in users).

## 4. Dependencies
- `react-markdown`: For rendering AI responses.
- `@google/generative-ai`: (Optional) SDK for server, or just use `fetch`.

## 5. Execution Steps
1.  **Database**: Update Prisma schema & migrate.
2.  **Backend**: Implement Config APIs & Gemini Service.
3.  **Frontend Admin**: Build the settings page to control the widget.
4.  **Frontend Widget**: Build the user-facing chat widget.
5.  **Integration**: Connect the widget to the backend API.
