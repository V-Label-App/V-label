# Specification: AI Function Calling Configuration

## 1. Overview
The goal is to enable "Function Calling" (Tool Use) capabilities for the AI Assistant. This feature allows the AI to perform actions (e.g., "Assign Task", "Query Database", "Check Status") by calling defined functions instead of just generating text.

This specification focuses on the **Configuration Interface** and **Storage**, allowing Admins to define available tools.

## 2. User Stories
- **As an Admin**, I want to define function signatures (Name, Description, Parameters) so the AI knows what tools are available.
- **As an Admin**, I want to enable/disable specific functions without deploying code.
- **As an Admin**, I want to test if the AI correctly "calls" a function when prompted.

## 3. Technical Architecture

### 3.1 Data Model
We will extend the `SystemConfig` generic storage or add a specific `chat_functions` key.

**Storage Format (JSON in DB):**
```json
{
  "functions": [
    {
      "name": "create_task",
      "description": "Create a new annotation task for a user",
      "parameters": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "assigneeId": { "type": "string" },
          "priority": { "enum": ["LOW", "MEDIUM", "HIGH"] }
        },
        "required": ["title", "assigneeId"]
      },
      "enabled": true,
      "roles": ["MANAGER", "ADMIN"] // Optional: Restrict tool use by role
    }
  ]
}
```

### 3.2 Backend API
- `GET /api/admin/chat/functions`: Retrieve defined functions.
- `POST /api/admin/chat/functions`: Update function definitions.
- **Runtime**: When initializing the Chat session (Gemini), we fetch enabled functions and pass them to the `tools` parameter of the model.

## 4. UI Design (Admin Chat Settings)
Add a new Tab **"Tools & Functions"** to `AdminChatSettingsPage`.

**Features:**
- **List View**: Show defined functions with Toggle (Active/Inactive).
- **Editor**: JSON Editor or Form to define `name`, `description`, and `parameters` (JSON Schema).
- **Presets**: "Load Preset" button for common internal tools (e.g., `lookup_user`, `assign_task`).

## 5. Security & Limitations
- **Role-Based Access Control (RBAC)**:
    - Each function definition includes an allowed `roles` list (e.g., `['ADMIN', 'MANAGER']`).
    - **Runtime Enforcement**: When a user starts a chat, the backend filters the list of available functions based on the user's role *before* sending them to the AI model.
    - **Execution Guard**: Even if the AI tries to hallucinate a call to a forbidden function, the `FunctionRegistry` will block execution if the user lacks permission.
- **Constraint**: The AI only *requests* a function call. The Backend must execute it. The Admin UI only configures the *definition*, not the *execution logic*.
- **Validation**: Backend must validate that the execution logic exists for the defined function name.

## 6. Future Work
- Dynamic execution registry (map function name -> TS service method).
- Client-side tools vs Server-side tools.
