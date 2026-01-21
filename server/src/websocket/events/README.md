# WebSocket Broadcast System - Usage Guide

## Overview
This system provides an extensible, type-safe way to broadcast real-time events across the entire application using WebSocket.

## 📁 Architecture

```
server/src/websocket/events/
├── types.ts              # Event types & payloads
├── broadcast.service.ts  # Centralized broadcast service
└── README.md            # This file
```

## 🎯 How It Works

1. **Event Types**: Define all event types in `types.ts`
2. **Broadcast Service**: Singleton service (`broadcastService`) handles all broadcasts
3. **Socket Server**: Initialized in `socket.server.ts` on startup
4. **Usage**: Import and call `broadcastService` methods anywhere in your code

---

## ✨ Adding New Event Types

### Step 1: Define Event Type in `types.ts`

```typescript
export enum SystemEventType {
  // Existing events...
  CHAT_CONFIG_UPDATED = 'system:chat:config:updated',
  
  // Add your new event type here
  PROJECT_STATUS_CHANGED = 'project:status:changed',
}
```

### Step 2: Define Payload Interface (Optional but Recommended)

```typescript
export interface ProjectStatusChangedPayload {
  projectId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
}
```

### Step 3: Broadcast the Event

```typescript
import { broadcastService } from '../websocket/events/broadcast.service.js';
import { SystemEventType } from '../websocket/events/types.js';

// Broadcast to all connected users
broadcastService.broadcastToAll(
  SystemEventType.PROJECT_STATUS_CHANGED,
  {
    projectId: '123',
    oldStatus: 'active',
    newStatus: 'archived',
    changedBy: adminId,
  },
  adminId // Admin who triggered the event
);
```

---

## 📡 Broadcast Methods

### 1. Broadcast to All Connected Users

```typescript
broadcastService.broadcastToAll(
  SystemEventType.CHAT_CONFIG_UPDATED,
  { enabled: true, modelName: 'gemini-2.0' },
  'admin-user-id'
);
```

**Use Case**: System-wide announcements (e.g., AI widget toggled, maintenance mode)

---

### 2. Broadcast to Specific User

```typescript
broadcastService.broadcastToUser(
  'user-123',
  SystemEventType.TASK_ASSIGNED,
  { taskId: 'task-456', projectId: 'proj-789' },
  'manager-user-id'
);
```

**Use Case**: Personalized notifications (e.g., task assignments)

---

### 3. Broadcast to Room (Project Members)

```typescript
broadcastService.broadcastToRoom(
  'project:proj-789',
  SystemEventType.PROJECT_STATUS_CHANGED,
  { projectId: 'proj-789', newStatus: 'completed' }
);
```

**Use Case**: Notify all members of a project/team

---

### 4. Broadcast to Multiple Users

```typescript
broadcastService.broadcastToUsers(
  ['user-1', 'user-2', 'user-3'],
  SystemEventType.TASK_SUBMITTED,
  { taskId: 'task-001' }
);
```

**Use Case**: Notify specific reviewers when a task is submitted

---

## 🛠️ Example: Adding a New Notification Type

Let's add "Task Deadline Warning" notifications:

### 1. Add Event Type (`types.ts`)

```typescript
export enum SystemEventType {
  // ... existing types
  TASK_DEADLINE_WARNING = 'task:deadline:warning',
}

export interface TaskDeadlineWarningPayload {
  taskId: string;
  taskName: string;
  userId: string;
  deadline: Date;
  hoursRemaining: number;
}
```

### 2. Create Scheduled Job (e.g., `task.scheduler.ts`)

```typescript
import { broadcastService } from '../websocket/events/broadcast.service.js';
import { SystemEventType } from '../websocket/events/types.js';

export async function checkTaskDeadlines() {
  const upcomingTasks = await prisma.task.findMany({
    where: {
      deadline: {
        lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
      status: 'IN_PROGRESS',
    },
  });

  for (const task of upcomingTasks) {
    broadcast Service.broadcastToUser(
      task.assignedToId,
      SystemEventType.TASK_DEADLINE_WARNING,
      {
        taskId: task.id,
        taskName: task.name,
        userId: task.assignedToId,
        deadline: task.deadline,
        hoursRemaining: Math.floor((task.deadline.getTime() - Date.now()) / (1000 * 60 * 60)),
      }
    );
  }
}
```

### 3. Handle on Client (React)

```typescript
// In useEffect or custom hook
socket.on('system:event', (event: SystemEventPayload) => {
  if (event.type === 'task:deadline:warning') {
    const data = event.data as TaskDeadlineWarningPayload;
    toast.warning(`Task "${data.taskName}" is due in ${data.hoursRemaining} hours!`);
  }
});
```

---

## 📝 Best Practices

1. **Use Descriptive Event Names**: Follow pattern `category:action` (e.g., `task:assigned`, `user:role:changed`)
2. **Define Payload Interfaces**: Always create typed payloads for better TypeScript support
3. **Keep Payloads Small**: Only send essential data, avoid large objects
4. **Use `triggeredBy`**: Always pass the user ID who triggered the event for audit trails
5. **Document New Events**: Update this README when adding new event types

---

## 🔍 Debugging

Check broadcast logs in server console:
```
[BROADCAST] Broadcast service initialized
[BROADCAST] Event broadcasted: system:chat:config:updated
[BROADCAST] Event sent to user user-123: task:assigned
```

---

## 🚀 Future Enhancements

- [ ] Add event history/audit log
- [ ] Implement Redis Pub/Sub for multi-instance support
- [ ] Add event replay for offline users
- [ ] Create admin dashboard to monitor WebSocket events
