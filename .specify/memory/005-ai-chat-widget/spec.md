## 1. Goal
Implement a system-wide AI Chat Widget powered by Google Gemini (Model: `gemini-2.5-pro`).
Admins should have full control over the widget's behavior and appearance via the Admin Panel.

## 2. Core Features

### User Side (Client)
- **Access**: Logged-in users only.
- **Interface**: Floating Chat Widget (Bottom Right).
- **History**: Temporary (Session-based, cleared on reload).
- **Features**:
  - Chat with AI.
  - Markdown rendering.
  - Typing indicators.

### Admin Side (Configuration)
- **Global Toggle**: Enable/Disable widget for the entire system.
- **AI Settings**:
  - Model Name: `gemini-2.5-pro` (Configurable via Env/UI).
  - System Prompt: Custom instructions for the AI behavior.
  - Temperature/TopK: Fine-tune creativity.
- **UI Customization**:
  - Widget Theme Color.
  - Widget Position (Left/Right).
  - Welcome Message.
  - Widget Icon/Avatar (URL).

### Backend
- **Database**: New `SystemConfig` model to store Admin settings (Key-Value store or specific table).
- **API**: 
  - `POST /api/v1/chat/completion`: Proxies request to Google Gemini.
  - `GET /api/v1/admin/config`: Fetch widget settings.
  - `PUT /api/v1/admin/config`: Update widget settings.

## 3. Future Scope (Not in V1)
- Context Awareness (Reading project data).
- Persistent Chat History.

