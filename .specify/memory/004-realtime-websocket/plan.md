# Implementation Plan: Real-Time WebSocket Communication

**Feature**: 004-realtime-websocket  
**Created**: 2026-01-18  
**Based on**: [spec.md](./spec.md)  
**Tech Stack**: Socket.IO, Prisma, React Context API

---

## 📋 Implementation Summary

This plan implements a Socket.IO-based real-time communication system with two main features:
1. **Project-Based Chat** (Priority 1): Real-time messaging within project teams
2. **Notification System** (Priority 2): Bidirectional task/event notifications

**Key Design Decisions**:
- Use Socket.IO for ease of implementation and built-in features (rooms, typing indicators)
- Store all messages and notifications in PostgreSQL for persistence
- Authenticate Socket.IO connections using JWT
- Chat rooms are project-scoped (one room per project)
- Phase 1 excludes auto-reconnection (manual refresh fallback)

---

## 🗄️ Database Schema Changes

### New Prisma Models

Add to `server/prisma/schema.prisma`:

```prisma
// =========================================================
// 4. REAL-TIME COMMUNICATION
// =========================================================

model Notification {
  id        String           @id @default(uuid()) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  type      NotificationType
  title     String           @db.VarChar(255)
  message   String           @db.Text
  
  // Contextual data (JSON)
  metadata  Json?
  
  isRead    Boolean          @default(false) @map("is_read")
  createdAt DateTime         @default(now()) @map("created_at")
  
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, isRead])
  @@map("notifications")
}

enum NotificationType {
  TASK_ASSIGNED
  TASK_SUBMITTED
  TASK_APPROVED
  TASK_REJECTED
  DEADLINE_WARNING
  COMMENT_MENTION
}

model ChatMessage {
  id        String   @id @default(uuid()) @db.Uuid
  projectId String   @map("project_id") @db.Uuid
  senderId  String   @map("sender_id") @db.Uuid
  content   String   @db.Text
  createdAt DateTime @default(now()) @map("created_at")
  
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sender    User     @relation("ChatSender", fields: [senderId], references: [id], onDelete: Cascade)
  
  @@index([projectId, createdAt])
  @@map("chat_messages")
}
```

### Update Existing Models

**User model** - Add relationships:
```prisma
model User {
  // ... existing fields ...
  
  notifications     Notification[]
  chatMessagesSent  ChatMessage[]  @relation("ChatSender")
  
  @@map("users")
}
```

**Project model** - Add relationship:
```prisma
model Project {
  // ... existing fields ...
  
  chatMessages ChatMessage[]
  
  @@map("projects")
}
```

### Migration Command
```bash
npx prisma migrate dev --name add_websocket_tables
```

---

## 🏗️ Server Architecture

### 1. Dependencies to Install

```bash
cd server
npm install socket.io
npm install --save-dev @types/socket.io
```

### 2. File Structure

```
server/src/
├── websocket/
│   ├── socket.server.ts          # Socket.IO server initialization
│   ├── handlers/
│   │   ├── chat.handler.ts       # Chat event handlers
│   │   └── notification.handler.ts # Notification helpers
│   ├── middleware/
│   │   └── socket.auth.ts        # JWT authentication middleware
│   └── types.ts                  # WebSocket event type definitions
├── controllers/
│   ├── notification.controller.ts # REST API for notifications
│   └── chat.controller.ts         # REST API for chat history
├── services/
│   ├── notification.service.ts    # Notification business logic
│   └── chat.service.ts            # Chat business logic
└── index.ts                        # Updated to integrate Socket.IO
```

### 3. Core Implementation Files

#### `src/websocket/socket.server.ts`

```typescript
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { socketAuthMiddleware } from './middleware/socket.auth.js';
import { registerChatHandlers } from './handlers/chat.handler.js';
import logger from '../utils/logger.js';

export function initializeSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingInterval: 30000,  // 30s heartbeat
    pingTimeout: 10000,   // 10s timeout
  });

  // Authentication middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    logger.info('WEBSOCKET', `User connected: ${userId}`);

    // Join user's personal room for direct notifications
    socket.join(`user:${userId}`);

    // Register event handlers
    registerChatHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.info('WEBSOCKET', `User disconnected: ${userId}`);
    });
  });

  return io;
}
```

#### `src/websocket/middleware/socket.auth.ts`

```typescript
import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    socket.data.userId = decoded.id;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
}
```

#### `src/websocket/handlers/chat.handler.ts`

```typescript
import { Server, Socket } from 'socket.io';
import { prisma } from '../../utils/database.js';
import logger from '../../utils/logger.js';

interface JoinProjectRoomPayload {
  projectId: string;
}

interface SendMessagePayload {
  projectId: string;
  content: string;
}

interface TypingPayload {
  projectId: string;
  isTyping: boolean;
}

export function registerChatHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  // Join project chat room
  socket.on('chat:join-project', async (payload: JoinProjectRoomPayload) => {
    const { projectId } = payload;

    // Verify user is a member of the project
    const member = await prisma.projectMember.findFirst({
      where: { projectId, userId },
    });

    if (!member) {
      socket.emit('error', { message: 'Not a member of this project' });
      return;
    }

    socket.join(`project:${projectId}`);
    logger.info('WEBSOCKET', `User ${userId} joined project room ${projectId}`);
  });

  // Leave project chat room
  socket.on('chat:leave-project', (payload: JoinProjectRoomPayload) => {
    socket.leave(`project:${payload.projectId}`);
  });

  // Send message
  socket.on('chat:send-message', async (payload: SendMessagePayload) => {
    const { projectId, content } = payload;

    // Save message to database
    const message = await prisma.chatMessage.create({
      data: {
        projectId,
        senderId: userId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Broadcast to all users in the project room
    io.to(`project:${projectId}`).emit('chat:new-message', message);
  });

  // Typing indicator
  socket.on('chat:typing', (payload: TypingPayload) => {
    const { projectId, isTyping } = payload;
    
    // Broadcast to others in the room (exclude sender)
    socket.to(`project:${projectId}`).emit('chat:user-typing', {
      userId,
      isTyping,
    });
  });
}
```

#### `src/websocket/handlers/notification.handler.ts`

```typescript
import { Server } from 'socket.io';
import { prisma } from '../../utils/database.js';
import { NotificationType } from '@prisma/client';

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: any;
}

export async function sendNotification(
  io: Server,
  payload: NotificationPayload
) {
  const { userId, type, title, message, metadata } = payload;

  // Save to database
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadata,
    },
  });

  // Send to user's room (if online)
  io.to(`user:${userId}`).emit('notification:new', notification);

  return notification;
}
```

#### `src/index.ts` (Modified)

```typescript
import express from 'express';
import http from 'http';
import { initializeSocketServer } from './websocket/socket.server.js';
// ... other imports

const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocketServer(httpServer);

// Make io accessible in routes via req.app.get('io')
app.set('io', io);

// ... rest of Express setup

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`[SERVER] Started on http://localhost:${PORT}`);
});
```

---

## 💻 Client Implementation

### 1. Dependencies to Install

```bash
cd client
npm install socket.io-client
```

### 2. File Structure

```
client/src/
├── context/
│   └── SocketContext.tsx          # Socket.IO connection provider
├── hooks/
│   ├── useChat.ts                 # Chat logic hook
│   └── useNotifications.ts        # Notification logic hook
├── components/
│   ├── chat/
│   │   ├── ChatPanel.tsx          # Main chat UI
│   │   ├── MessageList.tsx        # Messages display
│   │   └── MessageInput.tsx       # Input with typing indicator
│   └── notifications/
│       ├── NotificationBell.tsx   # Header bell icon with badge
│       └── NotificationInbox.tsx  # Dropdown inbox UI
└── services/
    └── socket.service.ts           # Socket.IO client wrapper
```

### 3. Core Implementation Files

#### `src/services/socket.service.ts`

```typescript
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:4000', {
      auth: { token },
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('[SOCKET] Connected');
    });

    this.socket.on('disconnect', () => {
      console.log('[SOCKET] Disconnected');
    });

    this.socket.on('error', (error: any) => {
      console.error('[SOCKET] Error:', error.message);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }
}

export const socketService = new SocketService();
```

#### `src/context/SocketContext.tsx`

```typescript
import { createContext, useContext, useEffect, ReactNode } from 'react';
import { socketService } from '../services/socket.service';
import { useAuth } from './AuthContext';

interface SocketContextValue {
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      socketService.connect(token);
    } else {
      socketService.disconnect();
    }

    return () => {
      socketService.disconnect();
    };
  }, [user, token]);

  return (
    <SocketContext.Provider value={{ isConnected: !!socketService.getSocket()?.connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
}
```

#### `src/hooks/useChat.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socket.service';

interface ChatMessage {
  id: string;
  projectId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export function useChat(projectId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Join project room
    socket.emit('chat:join-project', { projectId });

    // Listen for new messages
    const handleNewMessage = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    };

    // Listen for typing indicators
    const handleTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    };

    socket.on('chat:new-message', handleNewMessage);
    socket.on('chat:user-typing', handleTyping);

    // Cleanup
    return () => {
      socket.emit('chat:leave-project', { projectId });
      socket.off('chat:new-message', handleNewMessage);
      socket.off('chat:user-typing', handleTyping);
    };
  }, [projectId]);

  const sendMessage = useCallback((content: string) => {
    socketService.emit('chat:send-message', { projectId, content });
  }, [projectId]);

  const setTyping = useCallback((isTyping: boolean) => {
    socketService.emit('chat:typing', { projectId, isTyping });
  }, [projectId]);

  return { messages, sendMessage, typingUsers, setTyping };
}
```

#### `src/hooks/useNotifications.ts`

```typescript
import { useState, useEffect } from 'react';
import { socketService } from '../services/socket.service';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      // Show toast
      toast.info(notification.title, {
        description: notification.message,
      });
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    // API call to mark as read
    // Update local state
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return { notifications, unreadCount, markAsRead };
}
```

---

## 🔌 REST API Endpoints

These endpoints complement WebSocket for initial data fetching and pagination.

### Notification Routes (`src/routes/notification.routes.ts`)

```typescript
GET    /api/v1/notifications           # Get user's notifications (paginated)
POST   /api/v1/notifications/:id/read  # Mark notification as read
DELETE /api/v1/notifications/:id       # Delete notification
```

### Chat Routes (`src/routes/chat.routes.ts`)

```typescript
GET    /api/v1/projects/:id/messages   # Get chat history (paginated, 20 per page)
```

---

## 📝 Implementation Sequence

### Phase 1: Database & Server Setup (Est: 4 hours)

1. **Update Prisma Schema**
   - Add `Notification` and `ChatMessage` models
   - Update `User` and `Project` relations
   - Run migration: `npx prisma migrate dev --name add_websocket_tables`

2. **Install Dependencies**
   ```bash
   cd server && npm install socket.io @types/socket.io
   ```

3. **Create Socket.IO Server**
   - Implement `socket.server.ts`
   - Implement `socket.auth.ts` middleware
   - Update `index.ts` to integrate Socket.IO with Express

4. **Implement Chat Handlers**
   - Create `chat.handler.ts` with join/leave/send/typing events
   - Create `notification.handler.ts` helper for emitting notifications

5. **Test with Postman/Socket.IO Client**
   - Connect with JWT
   - Join project room
   - Send messages

---

### Phase 2: Client Integration (Est: 5 hours)

6. **Install Dependencies**
   ```bash
   cd client && npm install socket.io-client
   ```

7. **Create Socket Service & Context**
   - Implement `socket.service.ts`
   - Implement `SocketContext.tsx`
   - Wrap `App.tsx` with `<SocketProvider>`

8. **Implement Chat Hook & UI**
   - Create `useChat.ts` hook
   - Build `ChatPanel.tsx` component
   - Build `MessageInput.tsx` with typing indicator
   - Integrate chat into `ProjectDetail` page

9. **Test Chat Flow**
   - Verify real-time messaging
   - Test typing indicators
   - Verify messages persist in DB

---

### Phase 3: Notification System (Est: 4 hours)

10. **Create Notification Hook & UI**
    - Implement `useNotifications.ts`
    - Build `NotificationBell.tsx` with unread badge
    - Build `NotificationInbox.tsx` dropdown

11. **Integrate Notifications into Backend Events**
    - Emit `TASK_ASSIGNED` when manager assigns task
    - Emit `TASK_SUBMITTED` when annotator submits
    - Emit `TASK_APPROVED`/`TASK_REJECTED` when reviewer responds

12. **Wire Up Frontend**
    - Add `<NotificationBell />` to header
    - Test toast notifications
    - Test notification history in inbox

---

### Phase 4: REST API & Polish (Est: 2 hours)

13. **Create REST Endpoints**
    - Implement `/api/v1/notifications` (GET, mark read, delete)
    - Implement `/api/v1/projects/:id/messages` (GET with pagination)

14. **Final Testing**
    - Multi-user testing (2+ browsers)
    - Verify persistence (refresh browser)
    - Test edge cases (offline → online)

---

## 🧪 Testing Strategy

### Manual Testing Checklist

**Chat**:
- [ ] User A sends message → User B sees it instantly
- [ ] Typing indicator shows when user is typing
- [ ] Messages persist after page refresh
- [ ] Pagination loads older messages
- [ ] Non-project members cannot join room

**Notifications**:
- [ ] Task assignment triggers notification
- [ ] Notification appears as toast
- [ ] Unread count updates correctly
- [ ] Clicking notification marks as read
- [ ] Notifications persist across sessions

**Connection**:
- [ ] Socket connects on login
- [ ] Socket disconnects on logout
- [ ] Invalid JWT rejected

---

## 🚀 Deployment Considerations

### Environment Variables

Add to `.env`:
```bash
# Server
CLIENT_URL=http://localhost:5173

# Client
VITE_API_URL=http://localhost:4000
```

### Production Notes

- **Scaling**: Use Redis adapter for Socket.IO if deploying multiple instances
  ```bash
  npm install @socket.io/redis-adapter redis
  ```
- **Security**: Validate all WebSocket payloads, sanitize chat messages
- **Rate Limiting**: Limit message send rate (e.g., 10 messages/minute)

---

## 📊 Success Metrics

- [ ] Socket connection established < 2s after login
- [ ] Message delivery latency < 500ms
- [ ] Zero data loss on temporary disconnections (messages saved to DB)
- [ ] Notification delivery < 1s for online users
- [ ] 100 concurrent users supported without degradation

---

## 🔜 Future Enhancements (Phase 2)

- Auto-reconnection with exponential backoff
- Message read receipts
- File attachments in chat
- Voice/video call integration
- Admin notification management dashboard
- Email fallback for offline users

---

## 📚 References

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [React Context API](https://react.dev/reference/react/useContext)
