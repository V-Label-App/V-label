# Implementation Tasks: Real-Time WebSocket Communication

**Feature**: 004-realtime-websocket  
**Based on**: [plan.md](./plan.md) | [spec.md](./spec.md)  
**Status**: Ready for Implementation  
**Total Estimate**: ~15 hours

---

## Phase 1: Database & Server Setup (Est: 4 hours)

### 1.1 Update Prisma Schema
- [ ] Add `Notification` model with fields: `id`, `userId`, `type`, `title`, `message`, `metadata`, `isRead`, `createdAt`
- [ ] Add `NotificationType` enum: `TASK_ASSIGNED`, `TASK_SUBMITTED`, `TASK_APPROVED`, `TASK_REJECTED`, `DEADLINE_WARNING`, `COMMENT_MENTION`
- [ ] Add `ChatMessage` model with fields: `id`, `projectId`, `senderId`, `content`, `createdAt`
- [ ] Update `User` model to add relations: `notifications Notification[]`, `chatMessagesSent ChatMessage[]`
- [ ] Update `Project` model to add relation: `chatMessages ChatMessage[]`
- [ ] Add indexes: `@@index([userId, isRead])` on Notification, `@@index([projectId, createdAt])` on ChatMessage

### 1.2 Run Database Migration
- [ ] Run `npx prisma migrate dev --name add_websocket_tables`
- [ ] Verify migration success in Prisma Studio
- [ ] Run `npx prisma generate` to update Prisma Client types

### 1.3 Install Server Dependencies
- [ ] Run `cd server && npm install socket.io`
- [ ] Run `npm install --save-dev @types/socket.io`
- [ ] Verify installation in `package.json`

### 1.4 Create WebSocket Directory Structure
- [ ] Create `server/src/websocket/` directory
- [ ] Create `server/src/websocket/handlers/` directory
- [ ] Create `server/src/websocket/middleware/` directory

### 1.5 Implement Socket.IO Server Core
- [ ] Create `server/src/websocket/types.ts` with TypeScript interfaces for Socket events
- [ ] Create `server/src/websocket/socket.server.ts` with `initializeSocketServer` function
- [ ] Configure CORS to allow `CLIENT_URL` from env
- [ ] Set heartbeat: `pingInterval: 30000`, `pingTimeout: 10000`
- [ ] Add connection/disconnect event logging

### 1.6 Implement Authentication Middleware
- [ ] Create `server/src/websocket/middleware/socket.auth.ts`
- [ ] Extract JWT token from `socket.handshake.auth.token`
- [ ] Verify token using `jwt.verify()` with `JWT_SECRET`
- [ ] Store `userId` in `socket.data.userId` on successful auth
- [ ] Return error for invalid/missing tokens

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
- [ ] Create `server/src/websocket/handlers/notification.handler.ts`
- [ ] Implement `sendNotification` function:
  - Save notification to database
  - Emit to user's room: `io.to(user:${userId}).emit('notification:new', ...)`
  - Return created notification

### 1.9 Integrate Socket.IO with Express
- [ ] Update `server/src/index.ts`:
  - Import `http` and create `httpServer = http.createServer(app)`
  - Call `initializeSocketServer(httpServer)`
  - Store io instance: `app.set('io', io)`
  - Change `app.listen()` to `httpServer.listen()`
- [ ] Test server starts without errors

### 1.10 Test Socket.IO Connection
- [ ] Use Postman or Socket.IO client to connect with valid JWT
- [ ] Verify authentication works
- [ ] Test joining a project room
- [ ] Send a test message and verify it's saved to DB

---

## Phase 2: Client Integration (Est: 5 hours)

### 2.1 Install Client Dependencies
- [ ] Run `cd client && npm install socket.io-client`
- [ ] Verify installation in `package.json`

### 2.2 Create Socket Service
- [ ] Create `client/src/services/socket.service.ts`
- [ ] Implement `SocketService` class:
  - `connect(token)` method with auth
  - `disconnect()` method
  - `getSocket()` getter
  - `emit()`, `on()`, `off()` wrapper methods
- [ ] Export singleton instance: `export const socketService = new SocketService()`
- [ ] Add connection/error event logging

### 2.3 Create Socket Context Provider
- [ ] Create `client/src/context/SocketContext.tsx`
- [ ] Implement `SocketProvider` component:
  - Use `useAuth()` to get user and token
  - Call `socketService.connect(token)` on mount if authenticated
  - Call `socketService.disconnect()` on unmount
- [ ] Export `useSocket()` hook
- [ ] Wrap `App.tsx` with `<SocketProvider>`

### 2.4 Create Chat Hook
- [ ] Create `client/src/hooks/useChat.ts`
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
- [ ] Create `client/src/hooks/useNotifications.ts`
- [ ] Define `Notification` interface
- [ ] Implement `useNotifications()` hook:
  - `notifications` state array
  - `unreadCount` state
  - Listen to `notification:new` event
  - Show toast notification using `sonner`
  - `markAsRead(notificationId)` function

### 3.2 Build Notification UI Components
- [ ] Create `client/src/components/notifications/NotificationBell.tsx`:
  - Bell icon with unread badge (red dot with count)
  - Click to open dropdown
- [ ] Create `client/src/components/notifications/NotificationInbox.tsx`:
  - Dropdown menu with notification list
  - Each item shows title, message, timestamp
  - Unread items have different background
  - Click notification to mark as read and navigate to context (task)

### 3.3 Add Notification Bell to Header
- [ ] Update header/navbar component to include `<NotificationBell />`
- [ ] Use `useNotifications()` hook to get unread count
- [ ] Test notification appears on new assignment

### 3.4 Implement Backend Notification Triggers
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
- [ ] Test notification persists after page refresh (fetch from DB)

---

## Phase 4: REST API & Polish (Est: 2 hours)

### 4.1 Create Notification REST API
- [ ] Create `server/src/controllers/notification.controller.ts`
- [ ] Implement `GET /api/v1/notifications`:
  - Fetch user's notifications (ordered by `createdAt DESC`)
  - Support pagination: `?page=1&limit=20`
  - Return total count for pagination UI
- [ ] Implement `POST /api/v1/notifications/:id/read`:
  - Update `isRead = true`
- [ ] Implement `DELETE /api/v1/notifications/:id`
- [ ] Create `server/src/routes/notification.routes.ts` and register routes

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
- [ ] Add comments to complex Socket.IO logic
- [ ] Update `.env.example` with `CLIENT_URL` variable
- [ ] Create README section explaining WebSocket features
- [ ] Remove any debug `console.log` statements

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

## 🐛 Known Issues / Deferred to Phase 2

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
