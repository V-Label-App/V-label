# Implementation Tasks: Real-Time WebSocket Communication

**Feature**: 004-realtime-websocket  
**Based on**: [plan.md](./plan.md) | [spec.md](./spec.md)  
**Status**: In Progress  
**Total Estimate**: ~15 hours

---

## Phase 1: Database & Server Setup (Est: 4 hours)

### 1.1 Update Prisma Schema
- [x] Add `Notification` model with fields: `id`, `userId`, `type`, `title`, `message`, `metadata`, `isRead`, `createdAt`
- [x] Add `NotificationType` enum: `TASK_ASSIGNED`, `TASK_SUBMITTED`, `TASK_APPROVED`, `TASK_REJECTED`, `DEADLINE_WARNING`, `COMMENT_MENTION`, `SYSTEM_ANNOUNCEMENT`
- [ ] Add `ChatMessage` model with fields: `id`, `projectId`, `senderId`, `content`, `createdAt`
- [ ] Update `User` model to add relations: `notifications Notification[]`, `chatMessagesSent ChatMessage[]`
- [ ] Update `Project` model to add relation: `chatMessages ChatMessage[]`
- [x] Add indexes: `@@index([userId, isRead])` on Notification, `@@index([projectId, createdAt])` on ChatMessage

### 1.2 Run Database Migration
- [x] Run `npx prisma migrate dev --name add_websocket_tables`
- [x] Verify migration success in Prisma Studio
- [x] Run `npx prisma generate` to update Prisma Client types

### 1.3 Install Server Dependencies
- [x] Run `cd server && npm install socket.io`
- [x] Run `npm install --save-dev @types/socket.io`
- [x] Verify installation in `package.json`

### 1.4 Create WebSocket Directory Structure
- [x] Create `server/src/websocket/` directory
- [x] Create `server/src/websocket/handlers/` directory (implemented as `events`)
- [x] Create `server/src/websocket/middleware/` directory

### 1.5 Implement Socket.IO Server Core
- [x] Create `server/src/websocket/types.ts` with TypeScript interfaces for Socket events
- [x] Create `server/src/websocket/socket.server.ts` with `initializeSocketServer` function
- [x] Configure CORS to allow `CLIENT_URL` from env
- [x] Set heartbeat: `pingInterval: 30000`, `pingTimeout: 10000`
- [x] Add connection/disconnect event logging
- [x] **[NEW]** Implement `BroadcastService` for centralized event emission

### 1.6 Implement Authentication Middleware
- [x] Create `server/src/websocket/middleware/socket.auth.ts`
- [x] Extract JWT token from `socket.handshake.auth.token`
- [x] Verify token using `jwt.verify()` with `JWT_SECRET`
- [x] Store `userId` in `socket.data.userId` on successful auth
- [x] Return error for invalid/missing tokens

### 1.7 Implement Chat Event Handlers
- [ ] Create `server/src/websocket/handlers/chat.handler.ts`
- [ ] Implement `chat:join-project` event:
  - Verify user is project member via `ProjectMember` query
  - Join room: `socket.join(project:${projectId})`
- [ ] Implement `chat:leave-project` event
- [ ] Implement `chat:send-message` event:
  - Save message to database via `prisma.chatMessage.create()`
  - Include sender details in response
  - Broadcast to room: `io.to(project:${projectId}).emit('chat:new-message', message)`
- [ ] Implement `chat:typing` event:
  - Broadcast to others (exclude sender): `socket.to(project:${projectId}).emit('chat:user-typing', ...)`

### 1.8 Implement Notification Helper
- [x] Create `server/src/websocket/handlers/notification.handler.ts` (Implemented as `server/src/services/notification.service.ts`)
- [x] Implement `sendNotification` function (Implemented as `createNotification`):
  - [x] Save notification to database
  - [x] Emit to user's room: `io.to(user:${userId}).emit('notification:new', ...)`
  - [x] Return created notification
- [x] **[NEW]** Implement `createNotificationForAllUsers` for system announcements

### 1.9 Integrate Socket.IO with Express
- [x] Update `server/src/index.ts`:
  - Import `http` and create `httpServer = http.createServer(app)`
  - Call `initializeSocketServer(httpServer)`
  - Store io instance: `app.set('io', io)`
  - Change `app.listen()` to `httpServer.listen()`
- [x] Test server starts without errors

### 1.10 Test Socket.IO Connection
- [x] Use Postman or Socket.IO client to connect with valid JWT
- [x] Verify authentication works
- [x] Test joining a project room
- [x] Send a test message and verify it's saved to DB

---

## Phase 2: Client Integration (Est: 5 hours)

### 2.1 Install Client Dependencies
- [x] Run `cd client && npm install socket.io-client`
- [x] Verify installation in `package.json`

### 2.2 Create Socket Service
- [x] Create `client/src/services/socket.service.ts`
- [x] Implement `SocketService` class:
  - `connect(token)` method with auth
  - `disconnect()` method
  - `getSocket()` getter
  - `emit()`, `on()`, `off()` wrapper methods
- [x] Export singleton instance: `export const socketService = new SocketService()`
- [x] Add connection/error event logging

### 2.3 Create Socket Context Provider
- [x] Create `client/src/context/SocketContext.tsx`
- [x] Implement `SocketProvider` component:
  - Use `useAuth()` to get user and token
  - Call `socketService.connect(token)` on mount if authenticated
  - Call `socketService.disconnect()` on unmount
- [x] Export `useSocket()` hook
- [x] Wrap `App.tsx` with `<SocketProvider>`

### 2.4 Create Chat Hook
- [x] Create `client/src/hooks/useChat.ts`
- [ ] Define `ChatMessage` interface
- [ ] Implement `useChat(projectId)` hook:
  - `messages` state array
  - `typingUsers` state (Set)
  - `useEffect` to join project room on mount
  - Listen to `chat:new-message` event
  - Listen to `chat:user-typing` event
  - `sendMessage(content)` function
  - `setTyping(isTyping)` function
  - Cleanup: leave room and remove listeners

### 2.5 Build Chat UI Components
- [ ] Create `client/src/components/chat/MessageList.tsx`:
  - Display messages with sender avatar, name, timestamp
  - Auto-scroll to bottom on new message
  - Show "User is typing..." indicator
- [ ] Create `client/src/components/chat/MessageInput.tsx`:
  - Textarea with send button
  - Call `setTyping(true)` on input, `setTyping(false)` on blur
  - Submit on Enter (Shift+Enter for newline)
- [ ] Create `client/src/components/chat/ChatPanel.tsx`:
  - Use `useChat()` hook
  - Render `MessageList` and `MessageInput`
  - Add project name header

### 2.6 Integrate Chat into Project Detail Page
- [ ] Add `<ChatPanel />` to Manager/Reviewer project detail view
- [ ] Add toggle button to show/hide chat panel
- [ ] Test real-time messaging between two browser windows

---

## Phase 3: Notification System (Est: 4 hours)

### 3.1 Create Notifications Hook
- [x] Create `client/src/hooks/useNotifications.ts`
- [x] Define `Notification` interface
- [x] Implement `useNotifications()` hook:
  - `notifications` state array
  - `unreadCount` state
  - Listen to `notification:new` event
  - [x] **[NEW]** Listen to `system:event` for announcements
  - [x] Show notification in bell (Removed toast as requested)
  - `markAsRead(notificationId)` function

### 3.2 Build Notification UI Components
- [x] Create `client/src/components/notifications/NotificationBell.tsx`:
  - Bell icon with unread badge (red dot with count)
  - Click to open dropdown
- [x] Create `client/src/components/notifications/NotificationInbox.tsx`:
  - Dropdown menu with notification list
  - Each item shows title, message, timestamp
  - Unread items have different background
  - Click notification to mark as read and navigate to context (task)

### 3.3 Add Notification Bell to Header
- [x] Update header/navbar component to include `<NotificationBell />`
- [x] Use `useNotifications()` hook to get unread count
- [x] Test notification appears on new assignment

### 3.4 Implement Backend Notification Triggers
- [x] **[NEW]** Admin Chat Settings update triggers `SYSTEM_ANNOUNCEMENT` via `BroadcastService`
- [ ] In `user.controller.ts` (or task assignment logic):
  - When admin assigns task, call `sendNotification()` with type `TASK_ASSIGNED`
- [ ] When annotator submits task:
  - Emit `TASK_SUBMITTED` to reviewer
- [ ] When reviewer approves/rejects:
  - Emit `TASK_APPROVED`/`TASK_REJECTED` to annotator

### 3.5 Test Notification Flow End-to-End
- [ ] Assign task → Verify annotator receives notification
- [ ] Submit task → Verify reviewer receives notification
- [ ] Approve task → Verify annotator receives notification
- [x] **[NEW]** System Announcement → Verify all users receive notification
- [x] Test notification persists after page refresh (fetch from DB)

---

## Phase 4: REST API & Polish (Est: 2 hours)

### 4.1 Create Notification REST API
- [x] Create `server/src/controllers/notification.controller.ts`
- [x] Implement `GET /api/v1/notifications`:
  - Fetch user's notifications (ordered by `createdAt DESC`)
  - Support pagination: `?page=1&limit=20`
  - Return total count for pagination UI
- [x] Implement `POST /api/v1/notifications/:id/read`:
  - Update `isRead = true`
- [x] Implement `DELETE /api/v1/notifications/:id`
- [x] Create `server/src/routes/notification.routes.ts` and register routes
- [x] Create `client/src/services/notification.api.ts`

### 4.2 Create Chat REST API
- [ ] Create `server/src/controllers/chat.controller.ts`
- [ ] Implement `GET /api/v1/projects/:id/messages`:
  - Fetch messages for project (ordered by `createdAt DESC`)
  - Support pagination: `?page=1&limit=20`
  - Include sender details
- [ ] Create `server/src/routes/chat.routes.ts` and register routes

### 4.3 Implement Chat History Loading
- [ ] Update `useChat` hook to fetch initial messages on mount
- [ ] Add "Load More" button in `MessageList` for pagination
- [ ] Test loading older messages works correctly

### 4.4 Final Testing & Bug Fixes
- [ ] Test with 2+ users in different browsers
- [ ] Verify messages persist after browser refresh
- [ ] Test edge case: user offline → comes online → sees pending notifications
- [ ] Test notification click navigation works
- [ ] Verify typing indicator stops after 3 seconds of inactivity
- [ ] Check for console errors or warnings

### 4.5 Documentation & Cleanup
- [x] Add comments to complex Socket.IO logic
- [ ] Update `.env.example` with `CLIENT_URL` variable
- [x] Create README section explaining WebSocket features (Added to summary.md)
- [x] Remove any debug `console.log` statements

---

## ✅ Definition of Done

- [ ] All tasks checked off above
- [ ] Database migrations applied successfully
- [ ] Socket.IO server runs without errors
- [ ] Client connects to Socket.IO on login
- [ ] Real-time chat works between 2+ users
- [ ] Typing indicator shows/hides correctly
- [ ] Notifications sent on task events (assigned, submitted, approved/rejected)
- [ ] Notification bell shows unread count
- [ ] Notification inbox displays history
- [ ] REST APIs return paginated data
- [ ] All WebSocket events properly authenticated
- [ ] Code reviewed and free of lint errors
- [ ] Feature tested in development environment

---

## � Known Issues / Deferred to Phase 2

- Auto-reconnection on connection drop (manual refresh required)
- Email fallback for offline users
- Admin notification management dashboard
- Message read receipts
- File attachments in chat

---

## 📝 Notes

- Estimate assumes developer familiar with Socket.IO and React hooks
- Testing time included in each phase estimate
- Phase 1 can block Phase 2, but Phase 3 can partially overlap with Phase 2
- Consider doing Phase 1-2 first (Chat), then Phase 3 (Notifications) for better incremental delivery
