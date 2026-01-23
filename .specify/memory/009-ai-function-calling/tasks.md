# Tasks: AI Function Calling

## Phase 1: Backend Foundation
- [ ] **Data Structure**
    - [ ] Update `SystemConfigService` to handle `ai_functions` key.
    - [ ] Create TypeScript interfaces for `FunctionDefinition`.
- [ ] **API Endpoints**
    - [ ] `GET /admin/chat/functions`
    - [ ] `POST /admin/chat/functions`

## Phase 2: Admin UI Implementation
- [ ] **Functions Tab**
    - [ ] Add "Tools" tab to `AdminChatSettingsPage`.
    - [ ] Create `FunctionList` component (Accordion or Card style).
    - [ ] Create `FunctionEditor` component:
        - [ ] JSON Schema Editor for parameters.
        - [ ] **Role Selector**: Checkboxes (Admin, Manager, Annotator, Reviewer) to restrict access.
- [ ] **Integration**
    - [ ] Connect UI to new API endpoints.
    - [ ] Add "Test Function" playground (mock chat that shows tool calls).

## Phase 3: AI Model Integration
- [ ] **Service Update**
    - [ ] Update `ChatService` / `GeminiService` to inject `tools` config during initialization.
    - [ ] Handle `function_call` response from Gemini.
    - [ ] Implement a basic dispatcher (Name -> Service Method).

## Phase 4: Verification
- [ ] **Unit Tests**: functions correctly serialized.
- [ ] **E2E Test**: Admin creates function -> User asks AI -> AI responds with function call request.
