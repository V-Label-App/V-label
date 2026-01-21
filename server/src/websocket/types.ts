// WebSocket Event Type Definitions

export interface JoinProjectRoomPayload {
  projectId: string;
}

export interface SendMessagePayload {
  projectId: string;
  content: string;
}

export interface TypingPayload {
  projectId: string;
  isTyping: boolean;
}

export interface NotificationPayload {
  userId: string;
  type: 'TASK_ASSIGNED' | 'TASK_SUBMITTED' | 'TASK_APPROVED' | 'TASK_REJECTED' | 'DEADLINE_WARNING' | 'COMMENT_MENTION';
  title: string;
  message: string;
  metadata?: any;
}
