# Feature Specification: Real-Time WebSocket Communication

**Feature Branch**: `004-realtime-websocket`  
**Created**: 2026-01-18  
**Status**: Draft - Awaiting Clarification  
**Input**: User request: "Implement WebSocket for real-time notifications (task assignments, reviewer notifications) and internal chat"

---

## 🔍 Clarification Questions (Please Review)

Before proceeding with implementation, please clarify the following:

### 1. Notification System Scope
- **Q1.1**: Should notifications persist in the database, or are they ephemeral (lost on browser refresh)?
- **Q1.2**: Do users need a notification history/inbox UI component?
- **Q1.3**: Should unread notifications show a badge count in the UI?
- **Q1.4**: What triggers a notification? (Examples: task assigned, task submitted, task approved, task rejected, deadline approaching)

### 2. Chat System Scope
- **Q2.1**: Is chat **project-based** (chat within a project) or **direct messaging** (1-on-1 between users)?
- **Q2.2**: Should chat messages persist in the database?
- **Q2.3**: Do we need chat history pagination, or just show last N messages?
- **Q2.4**: Should chat support file attachments (e.g., annotated images)?
- **Q2.5**: Do we need "typing indicator" or "read receipts"?

### 3. Technical Priorities
- **Q3.1**: Which feature is **Priority 1**: Notifications or Chat?
- **Q3.2**: Should we use **Socket.IO** (easier, more features) or **native WebSocket** (lighter, more control)?
- **Q3.3**: Do we need to support reconnection/offline handling immediately, or can that be Phase 2?

### 4. User Roles & Permissions
- **Q4.1**: Can Annotators send notifications to Managers/Reviewers, or is it one-way (top-down)?
- **Q4.2**: Should Admins receive all notifications, or only when specifically mentioned?

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Task Assignment Notification (Priority: P1)

**As a** Annotator,  
**I want to** receive a real-time notification when a Manager assigns a task to me,  
**So that** I can start working immediately without refreshing the page.

**Why this priority**: Reduces task discovery latency and improves workflow efficiency.

**Independent Test**:
- **Success**: Manager assigns Task #123 to Annotator A → Annotator A (if online) sees instant toast notification "New task assigned: Image_001.jpg" → Clicking notification navigates to task details.
- **Failure**: Annotator A is offline → Notification queued in database → Shows on next login.

**Acceptance Scenarios**:
1. **Given** Annotator A is logged in, **When** Manager assigns a task, **Then** Annotator A receives notification within 1 second.
2. **Given** Annotator A is offline, **When** Manager assigns a task, **Then** notification is stored and shown on next login.
3. **Given** multiple tasks are assigned at once, **Then** each notification appears separately (not batched).

---

### User Story 2 - Reviewer Notification on Submission (Priority: P1)

**As a** Reviewer,  
**I want to** receive a notification when an Annotator submits a task for review,  
**So that** I can prioritize my review queue effectively.

**Why this priority**: Ensures timely review and prevents bottlenecks in the workflow.

**Independent Test**:
- **Success**: Annotator submits Task #456 → Assigned Reviewer receives notification "Task submitted for review: Image_002.jpg" → Clicking navigates to review interface.
- **Failure**: No assigned reviewer → Notification sent to all Reviewers in the project.

**Acceptance Scenarios**:
1. **Given** a task has an assigned reviewer, **When** annotator submits, **Then** only that reviewer is notified.
2. **Given** no specific reviewer assigned, **When** annotator submits, **Then** all reviewers in the project are notified.
3. **Given** reviewer approves/rejects task, **Then** annotator receives feedback notification.

---

### User Story 3 - Internal Chat for Collaboration (Priority: P2)

**As a** Manager or Annotator,  
**I want to** chat with team members about a specific project,  
**So that** I can ask questions or clarify requirements without leaving the platform.

**Why this priority**: Reduces context switching (e.g., Slack, Email) and keeps communication project-scoped.

**Independent Test**:
- **Success**: User A sends message in Project #1 chat → User B (online, same project) sees message instantly → User B replies, A sees reply in real-time.
- **Failure**: User B is offline → Message stored in DB → Shows when B comes online.

**Acceptance Scenarios**:
1. **Given** users are in the same project, **When** User A sends a chat message, **Then** all online members see it instantly.
2. **Given** user is offline, **When** messages are sent, **Then** unread message count updates on next login.
3. **Given** user scrolls up in chat, **Then** older messages load (pagination).

---

### User Story 4 - Connection Status Indicator (Priority: P2)

**As a** User,  
**I want to** see my WebSocket connection status (connected/disconnected),  
**So that** I know if I'm receiving real-time updates.

**Why this priority**: Transparency prevents confusion ("Why didn't I get the notification?").

**Independent Test**:
- **Success**: Network disconnects → UI shows "⚠️ Reconnecting..." → Connection restored → Shows "✅ Connected".
- **Failure**: Backend WebSocket server is down → Shows "❌ Offline - Notifications unavailable".

**Acceptance Scenarios**:
1. **Given** WebSocket is connected, **Then** show green "Connected" indicator.
2. **Given** connection drops, **Then** attempt reconnection with exponential backoff (1s, 2s, 4s...).
3. **Given** reconnection fails after 5 attempts, **Then** show "Offline" and suggest page refresh.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Notifications
- **FR-001**: System MUST support real-time push notifications to connected clients.
- **FR-002**: System MUST persist notifications in the database for offline users.
- **FR-003**: System MUST support the following notification types:
  - `TASK_ASSIGNED`: Manager assigns task to Annotator
  - `TASK_SUBMITTED`: Annotator submits task for review
  - `TASK_APPROVED`: Reviewer approves task
  - `TASK_REJECTED`: Reviewer rejects task with feedback
  - `DEADLINE_WARNING`: Task deadline approaching (24h, 1h warnings)
  - `COMMENT_MENTION`: User is @mentioned in a comment
- **FR-004**: System MUST mark notifications as "read" when user clicks them.
- **FR-005**: System MUST show unread notification count in the UI header.

#### Chat
- **FR-006**: System MUST support project-scoped chat rooms.
- **FR-007**: System MUST persist chat messages in the database.
- **FR-008**: System MUST show typing indicators when users are typing.
- **FR-009**: System MUST paginate chat history (20 messages per load).
- **FR-010**: System SHOULD support Markdown formatting in messages (bold, italic, code).

#### Connection Management
- **FR-011**: System MUST authenticate WebSocket connections using JWT tokens.
- **FR-012**: System MUST automatically reconnect on connection drop (with exponential backoff).
- **FR-013**: System MUST send heartbeat pings every 30 seconds to detect stale connections.
- **FR-014**: System MUST clean up disconnected sockets after 60 seconds.

### Non-Functional Requirements

- **NFR-001**: Notification delivery latency MUST be < 1 second for online users.
- **NFR-002**: System MUST handle at least 100 concurrent WebSocket connections.
- **NFR-003**: Message payload size MUST be limited to 10KB.
- **NFR-004**: WebSocket server MUST scale horizontally (use Redis Pub/Sub for multi-instance setup).

### Key Entities

#### Notification
```typescript
{
  id: string;
  userId: string;           // Recipient
  type: NotificationType;    // TASK_ASSIGNED, TASK_SUBMITTED, etc.
  title: string;
  message: string;
  metadata: {               // Contextual data
    taskId?: string;
    projectId?: string;
    fromUserId?: string;
  };
  isRead: boolean;
  createdAt: Date;
}
```

#### ChatMessage
```typescript
{
  id: string;
  projectId: string;        // Or conversationId for DMs
  senderId: string;
  content: string;
  createdAt: Date;
}
```

#### WebSocketEvent
```typescript
{
  type: 'notification' | 'chat' | 'typing' | 'presence';
  payload: any;
}
```

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: WebSocket connection established within 2 seconds of page load.
- **SC-002**: Notifications delivered to online users in < 1 second.
- **SC-003**: Chat messages delivered with < 500ms latency.
- **SC-004**: Zero message loss during temporary disconnections (messages queued and sent on reconnect).
- **SC-005**: 99% uptime for WebSocket server over a 7-day period.

---

## Technology Stack Recommendations

### Server
- **Option A (Recommended)**: Socket.IO
  - ✅ Auto-reconnection, room management, fallback to polling
  - ✅ Easy integration with Express
  - ❌ Slightly heavier than native WebSocket
  
- **Option B**: Native WebSocket + `ws` library
  - ✅ Lightweight, full control
  - ❌ Manual reconnection logic, room management

### Client
- **React**: `socket.io-client` or `useWebSocket` hook

### State Sync (Multi-Instance)
- **Redis Pub/Sub**: Required if deploying multiple server instances

---

## Open Questions for Implementation

1. Should we implement notifications first, then chat? Or both together?
2. Do we need admin tools to view/debug WebSocket connections?
3. Should notifications have "actions" (e.g., "Approve Task" button in notification)?
4. Do we need email fallback if user doesn't see WebSocket notification within X hours?

---

## Next Steps

1. **Review this spec** and answer clarification questions above.
2. **Prioritize features**: Decide if we implement notifications only (Phase 1) or notifications + chat together.
3. **Run `/speckit.checklist`** to validate spec quality.
4. **Once approved**, run `/speckit.plan` to generate technical implementation plan.
