# AI Interactive UI Components

## Overview

This feature transforms AI function call responses into rich, interactive UI components (forms, tables, cards) instead of plain text. This enables users to interact with AI through structured interfaces rather than conversational text only.

**Key Benefits:**
- **Better UX**: Forms instead of asking for data via chat
- **Structured Data**: Tables for listing, cards for info display
- **Consistency**: Same UI components across Chat Widget and Admin Testing
- **Extensibility**: Easy to add new component types

---

## Architecture

### High-Level Flow

```
User Message
    ↓
AI Processes → Detects Intent
    ↓
Calls Function (via FunctionRegistry)
    ↓
Function Returns AIResponse {type, content}
    ↓
GeminiService Detects Structured Response
    ↓
Returns JSON String to Frontend
    ↓
Frontend parseAIResponse()
    ↓
AIMessageRenderer Selects Component
    ↓
Renders: TableRenderer | FormRenderer | CardRenderer | TextRenderer
    ↓
User Interacts (Submit Form, Click Button)
    ↓
onAction() → New Message → Repeat
```

---

## Backend Components

### 1. Type System (`server/src/types/aiResponse.types.ts`)

Defines 6 response types:
- `text` - Markdown content
- `table` - Data tables with headers, rows, actions
- `form` - Interactive forms with validation
- `card` - Info cards with fields and action buttons
- `action_buttons` - Quick action buttons
- `chart` - Data visualizations (future)

**Core Interface:**
```typescript
interface AIResponse {
  type: AIResponseType;
  content: any;
  metadata?: ResponseMetadata;
}
```

### 2. ResponseFormatter (`server/src/services/ai/responseFormatter.ts`)

Utility class for converting raw data into typed `AIResponse` objects.

**Methods:**
- `asTable(data[])` - Convert array of objects to table
- `asForm(config)` - Generate interactive form
- `asCard(data)` - Create info card
- `asText(message)` - Plain markdown
- `auto(result)` - Smart detection with fallback

**Example Usage:**
```typescript
// In function.registry.ts
const users = await prisma.user.findMany();
return ResponseFormatter.asTable(users);
```

**Logging:**
Each method logs via `logger.info()`:
- `[ResponseFormatter] 📊 asTable() called`
- `[ResponseFormatter] 📝 asForm() called`
- `[ResponseFormatter] 💳 asCard() called`

### 3. Function Registry (`server/src/services/ai/function.registry.ts`)

Registers AI functions and their implementations.

**Updated Functions:**

**`get_users`:**
- Returns: Table with Email, Full Name, Role, Created
- Formatting: Dates in `vi-VN` locale, no ID column

**`create_user`:**
- Missing params → Interactive form with validation
- Success → Success card with action buttons
- **Important:** Function called immediately even without params

**`get_user_count`:**
- Returns: Info card with icon and user count

**`echo_test`:**
- Returns: Formatted text with JSON code block

### 4. GeminiService (`server/src/services/gemini.service.ts`)

**Key Enhancement:**
Detects structured `AIResponse` and bypasses Gemini's text generation:

```typescript
// Check if function returned structured response
if (lastFunctionResult && typeof lastFunctionResult === 'object' && lastFunctionResult.type) {
    console.log('[Gemini] Returning structured AIResponse directly');
    return JSON.stringify(lastFunctionResult);
}
```

**System Prompt Injection:**
Forces AI to call functions immediately:
```
# Function Calling (CRITICAL)
- When user requests an action, call the function IMMEDIATELY.
- DO NOT ask for information if function can handle missing parameters.
- Functions may return interactive forms to collect missing information.
- Example: If user says "create user", call create_user() right away.
```

---

## Frontend Components

### 1. Type Definitions (`client/src/types/aiResponse.ts`)

Mirrors backend types for type safety.

### 2. Renderer Components (`client/src/features/chat-widget/components/renderers/`)

#### **TextRenderer.tsx**
- Renders markdown using `react-markdown` + `remark-gfm`
- Supports GFM (tables, strikethrough, task lists)

#### **TableRenderer.tsx**
- HTML table with `<thead>` and `<tbody>`
- Responsive with horizontal scroll
- Hover effects and dark mode
- Action buttons below table

#### **FormRenderer.tsx**
- **Validation:** required, minLength, maxLength, pattern
- **Input Types:** text, email, password, select, textarea, number, date
- **Error Display:** Real-time validation feedback
- **Submit Handler:** Calls `onSubmit(formId, formData)`

**Example Form Flow:**
1. User: "tạo người dùng mới"
2. AI calls `create_user()` with no params
3. Function returns form response
4. FormRenderer displays form
5. User fills and submits
6. onAction → new message with data
7. AI calls `create_user(email, password, fullName)`
8. Success card displayed

#### **CardRenderer.tsx**
- **Variants:** default, success, warning, error
- **Icon Support:** Emoji or text icons
- **Fields:** Key-value pairs displayed
- **Actions:** Buttons with `onClick` handlers

### 3. Component Registry (`client/src/features/chat-widget/components/renderers/index.tsx`)

**AIMessageRenderer:**
Main component that dynamically selects renderer based on `response.type`:

```typescript
const COMPONENT_REGISTRY = {
    text: TextRenderer,
    table: TableRenderer,
    form: FormRenderer,
    card: CardRenderer,
    action_buttons: TextRenderer, // Fallback
    chart: TextRenderer           // Fallback
};
```

**parseAIResponse:**
Utility to parse and validate AI responses:
- If already `AIResponse` → return as-is
- If JSON string → parse and validate
- If plain text → wrap as `{type: 'text', content}`

**Logging:**
```javascript
console.log('🔍 [parseAIResponse] INPUT:', content);
console.log('🎨 [AIMessageRenderer]', {responseType, selectedRenderer});
```

### 4. ChatWidget Integration (`client/src/features/chat-widget/components/ChatWidget.tsx`)

**Changes:**
1. Import `AIMessageRenderer` and `parseAIResponse`
2. Replace `ReactMarkdown` with `AIMessageRenderer` in both variants
3. Add action handler:

```tsx
<AIMessageRenderer 
    response={parseAIResponse(cleanContent)} 
    onAction={(action, data) => {
        const message = data 
            ? `Execute ${action} with: ${JSON.stringify(data)}`
            : action;
        handleSendMessage(undefined, message);
    }}
/>
```

---

## Data Flow Examples

### Example 1: List Users (Table)

**User Input:**
```
"xem danh sách người dùng"
```

**Backend Logs:**
```
[Gemini] Executing function: get_users
[ResponseFormatter] 📊 asTable() called {rowCount: 5, columnCount: 4}
[Gemini] Returning structured AIResponse directly
```

**Response:**
```json
{
  "type": "table",
  "content": {
    "headers": ["Email", "Full Name", "Role", "Created"],
    "rows": [
      ["admin@vlabel.com", "Admin User", "ADMIN", "14/1/2026"],
      ["manager@vlabel.com", "Manager User", "MANAGER", "14/1/2026"]
    ]
  }
}
```

**Frontend Logs:**
```
🔍 [parseAIResponse] INPUT: {type: 'table', content: {...}}
✅ [parseAIResponse] Already AIResponse object
🎨 [AIMessageRenderer] {responseType: 'table', selectedRenderer: 'TableRenderer'}
```

**UI Result:**
Interactive table with hover effects

---

### Example 2: Create User (Form → Card)

**User Input:**
```
"tạo người dùng mới"
```

**Step 1: AI Calls Function Immediately**
```
[Gemini] Executing function: create_user
[Gemini] Calling Registry with params: {}
```

**Step 2: Function Returns Form**
```
[ResponseFormatter] 📝 asForm() called {formId: 'create_user', fieldCount: 4}
```

**Response:**
```json
{
  "type": "form",
  "content": {
    "id": "create_user",
    "title": "Create New User",
    "fields": [
      {
        "name": "email",
        "type": "email",
        "label": "Email Address",
        "required": true
      },
      {
        "name": "password",
        "type": "password",
        "label": "Password",
        "required": true,
        "minLength": 8
      }
    ]
  }
}
```

**Step 3: User Fills and Submits Form**
Frontend calls:
```javascript
onAction('create_user', {
  email: 'test@example.com',
  password: '12345678',
  fullName: 'Test User',
  role: 'ANNOTATOR'
})
```

**Step 4: New Message Sent**
```
"Execute create_user with: {email: '...', password: '...', ...}"
```

**Step 5: AI Calls Function With Data**
```
[Gemini] Executing function: create_user
[Gemini] Calling Registry with params: {email, password, fullName, role}
```

**Step 6: Success Card Returned**
```
[ResponseFormatter] 💳 asCard() called {title: '✅ User Created Successfully'}
```

**Response:**
```json
{
  "type": "card",
  "content": {
    "title": "✅ User Created Successfully",
    "variant": "success",
    "fields": {
      "Email": "test@example.com",
      "Full Name": "Test User",
      "Role": "ANNOTATOR"
    },
    "actions": [
      {"label": "View All Users", "action": "get_users"},
      {"label": "Create Another", "action": "create_user"}
    ]
  }
}
```

**UI Result:**
Green success card with action buttons

---

## How to Add New Component Type

### 1. Backend: Define Type

**File:** `server/src/types/aiResponse.types.ts`
```typescript
export interface MyNewContent {
  title: string;
  data: any;
}

export type AIResponseType = 'text' | 'table' | 'form' | 'card' | 'my_new_type';
```

### 2. Backend: Add Formatter

**File:** `server/src/services/ai/responseFormatter.ts`
```typescript
static asMyNewType(config: MyNewContent): AIResponse {
  logger.info('ResponseFormatter', '🔷 asMyNewType() called', {
    title: config.title
  });
  
  return {
    type: 'my_new_type' as const,
    content: config
  };
}
```

### 3. Frontend: Mirror Type

**File:** `client/src/types/aiResponse.ts`
```typescript
export interface MyNewContent {
  title: string;
  data: any;
}
```

### 4. Frontend: Create Renderer

**File:** `client/src/features/chat-widget/components/renderers/MyNewRenderer.tsx`
```tsx
import type { MyNewContent } from '../../../../types/aiResponse';

interface MyNewRendererProps {
  content: MyNewContent;
  onAction?: (action: string, data?: any) => void;
}

export function MyNewRenderer({ content, onAction }: MyNewRendererProps) {
  return (
    <div className="my-new-component">
      <h3>{content.title}</h3>
      {/* Render your UI */}
    </div>
  );
}
```

### 5. Frontend: Register Component

**File:** `client/src/features/chat-widget/components/renderers/index.tsx`
```tsx
import { MyNewRenderer } from './MyNewRenderer';

const COMPONENT_REGISTRY = {
  text: TextRenderer,
  table: TableRenderer,
  form: FormRenderer,
  card: CardRenderer,
  my_new_type: MyNewRenderer  // Add here
};
```

### 6. Use in Function

**File:** `server/src/services/ai/function.registry.ts`
```typescript
FunctionRegistry.register('my_function', async (params, context) => {
  return ResponseFormatter.asMyNewType({
    title: 'My Data',
    data: someData
  });
}, {
  description: 'My function description',
  parameters: {...}
});
```

---

## Configuration

### System Prompt

Function Calling behavior controlled via `GeminiService` system prompt injection:

**File:** `server/src/services/gemini.service.ts` (lines 72-84)

```typescript
const SYSTEM_INJECTION = `
# Function Calling (CRITICAL)
- When user requests an action, call the function IMMEDIATELY.
- DO NOT ask for information if function can handle missing parameters.
- Functions may return interactive forms to collect missing information.
- Example: If user says "create user", call create_user() right away.
`;
```

### Function Definitions

Control AI behavior via function description:

```typescript
{
  description: 'Create a new user account. IMPORTANT: Call this function IMMEDIATELY when user wants to create a user, even if they haven\'t provided email, password, or name yet. The function will automatically show an interactive form to collect any missing information. Do NOT ask the user for details - just call this function right away.',
  parameters: {
    // ... no required fields
  }
}
```

---

## Testing

### Manual Testing Flow

1. **Test Table:**
   ```
   User: "xem danh sách người dùng"
   Expected: Interactive table
   ```

2. **Test Form:**
   ```
   User: "tạo người dùng mới"
   Expected: Form UI appears immediately
   ```

3. **Test Card:**
   ```
   User: "có bao nhiêu người dùng"
   Expected: Info card with count
   ```

4. **Test Text:**
   ```
   User: "echo test message='hello'"
   Expected: Formatted markdown
   ```

### Check Logs

**Backend (Server Terminal):**
- `[ResponseFormatter] 📊 asTable() called`
- `[Gemini] Returning structured AIResponse directly`

**Frontend (Browser Console):**
- `🔍 [parseAIResponse] INPUT: {...}`
- `🎨 [AIMessageRenderer] {responseType: 'table', ...}`

---

## File Structure

```
server/
├── src/
│   ├── types/
│   │   └── aiResponse.types.ts          [NEW - Type definitions]
│   └── services/
│       ├── gemini.service.ts            [MODIFIED - Structured response handling]
│       └── ai/
│           ├── responseFormatter.ts     [NEW - Formatting utility]
│           └── function.registry.ts     [MODIFIED - 4 functions updated]

client/
├── src/
│   ├── types/
│   │   └── aiResponse.ts                [NEW - Frontend types]
│   └── features/
│       └── chat-widget/
│           └── components/
│               ├── ChatWidget.tsx       [MODIFIED - Integration]
│               └── renderers/
│                   ├── index.tsx        [NEW - Registry]
│                   ├── TextRenderer.tsx [NEW]
│                   ├── TableRenderer.tsx[NEW]
│                   ├── FormRenderer.tsx [NEW]
│                   └── CardRenderer.tsx [NEW]
```

---

## Best Practices

### Backend

1. **Use Proper Types:**
   ```typescript
   const response: AIResponse = {
     type: 'table' as const,  // Use 'as const' for literal type
     content: tableContent as TableContent
   };
   ```

2. **Log Everything:**
   ```typescript
   logger.info('FunctionName', 'Action description', {metadata});
   ```

3. **Handle Missing Params:**
   - Return form for missing required data
   - Don't throw errors - guide user via UI

4. **Security:**
   - Always check `context.userRole`
   - Validate all inputs before DB operations

### Frontend

1. **Type Imports:**
   ```typescript
   import type { CardContent } from '../../../../types/aiResponse';
   ```

2. **Validation:**
   - Implement client-side validation in forms
   - Show clear error messages

3. **Accessibility:**
   - Use semantic HTML
   - Add proper labels and ARIA attributes

4. **Dark Mode:**
   - Use Tailwind dark mode classes
   - Test both themes

---

## Future Enhancements

### Planned Features

1. **ChartRenderer:**
   - Integration with Chart.js or Recharts
   - Support for bar, line, pie charts
   - Real-time data updates

2. **ActionButtonsRenderer:**
   - Dedicated component for quick actions
   - Grid layout with icons
   - Keyboard shortcuts

3. **Advanced Forms:**
   - Multi-step wizards
   - File upload UI
   - Dependent fields
   - Async validation

4. **Tables:**
   - Pagination
   - Sort/filter capabilities
   - Export to CSV/JSON
   - Inline editing

5. **Admin Live Testing:**
   - Same renderer integration
   - Side-by-side comparison
   - Debug mode

---

## Troubleshooting

### Issue: AI Returns Text Instead of UI

**Symptoms:**
- Gemini converts table to markdown
- Form not showing

**Solution:**
1. Check `[Gemini] Returning structured AIResponse directly` log
2. Verify function returns proper `{type, content}` object
3. Ensure `lastFunctionResult.type` exists

### Issue: Frontend Shows Plain Text

**Symptoms:**
- JSON visible instead of UI
- parseAIResponse fails

**Solution:**
1. Check browser console for parse errors
2. Verify `🔍 [parseAIResponse] INPUT` log
3. Ensure response is valid JSON string or object

### Issue: Form Not Submitting

**Symptoms:**
- Submit button doesn't work
- No onAction called

**Solution:**
1. Check FormRenderer has `onSubmit` prop
2. Verify AIMessageRenderer passes `onAction`
3. Check ChatWidget's action handler

### Issue: AI Asks for Info Instead of Calling Function

**Symptoms:**
- AI says "please provide email..."
- Function not called

**Solution:**
1. Update function description with "CALL IMMEDIATELY"
2. Remove `required` fields from parameters
3. Check system prompt injection is active

---

## Summary

This feature provides a complete system for rendering structured UI components from AI responses:

✅ **Backend:** Type system + ResponseFormatter + GeminiService integration
✅ **Frontend:** 4 renderer components + Component registry + ChatWidget integration
✅ **Extensible:** Easy to add new component types
✅ **Logged:** Full debug flow via logger and console
✅ **Interactive:** Forms, buttons, and actions trigger new AI calls

**Key Innovation:** Functions return UI definitions instead of text, enabling richer user interactions while maintaining conversational flow.
