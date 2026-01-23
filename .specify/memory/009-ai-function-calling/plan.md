# AI Function Calling Implementation Plan

## Overview
Implement "Function Calling" (Tool Use) capabilities for the AI Assistant, allowing it to interact with the system (e.g., assign tasks, query database) based on user prompts.

## Implementation Steps

### Phase 1: Backend Foundation

#### 1. Update System Config Schema
**File**: `server/src/services/system.config.service.ts`

Extend `SystemConfig` type to include `chat_functions`:

```typescript
export interface ChatFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  enabled: boolean;
  roles: UserRole[]; // Restrict usage by role
}

export interface ChatConfig {
  // ... existing fields
  functions: ChatFunctionDefinition[];
}
```

#### 2. Create Function Registry
**File**: `server/src/services/ai/function-registry.ts` (NEW)

Create a registry to map function names to actual implementations:

```typescript
export class FunctionRegistry {
  private static registry = new Map<string, Function>();

  static register(name: string, fn: Function) {
    this.registry.set(name, fn);
  }

  static get(name: string) {
    return this.registry.get(name);
  }
  
  // Pre-defined internal functions
  static {
    this.register('create_task', TaskService.createTask);
    this.register('lookup_user', UserService.findUser);
  }
}
```

#### 3. Update Admin API
**File**: `server/src/controllers/admin.controller.ts`

Add endpoints to manage function definitions:
- `GET /admin/chat/functions` (Retrieve from SystemConfig)
- `POST /admin/chat/functions` (Update definition in SystemConfig)

---

### Phase 2: Frontend Implementation

#### 4. Admin UI Updates
**File**: `client/src/features/admin/pages/AdminChatSettingsPage.tsx`

Add **"Tools & Functions"** Tab:
- **Function List**: Display defined functions with Enable/Disable toggle.
- **JSON Editor**: Allow admins to paste JSON Schema for new functions.
- **Presets**: Button to "Load Default Presets" (populate with standard V-Label tools).

**Components**:
- `FunctionEditorDialog`: Form to edit Name, Description, and JSON Schema.
- `RoleSelector`: Checkboxes to select which roles can use this tool.

---

### Phase 3: AI Integration

#### 5. Gemini Service Update
**File**: `server/src/services/gemini.service.ts`

Update initialization to inject tools:
```typescript
const chat = model.startChat({
  tools: [
    {
      functionDeclarations: enabledFunctions.map(f => ({
         name: f.name,
         description: f.description,
         parameters: f.parameters
      }))
    }
  ]
});
```

#### 6. Handle Function Calls
**File**: `server/src/services/chat.service.ts`

Process response:
1. Check if response contains `functionCall`.
2. Validate user permission (Role check).
3. Execute function via `FunctionRegistry`.
4. Feed result back to AI.
5. Return final text to user.

---

### Phase 4: Testing & Verification

#### 7. Verification Steps
- [ ] **Admin Config**: Create a dummy function `echo_test` in Admin UI.
- [ ] **Persistence**: Verify it saves to DB `SystemConfig`.
- [ ] **AI Execution**: Ask AI "Run echo test with message 'Hello'".
- [ ] **Logs**: Check server logs for `[AI] Function Call: echo_test`.

## Security Considerations
- **Role-Based Access**: Critical functions (e.g., `delete_user`) must be restricted to ADMIN role.
- **Validation**: All function inputs must be validated against the schema before execution.
- **Audit Logging**: All AI function executions must be logged to `AuditLog`.
