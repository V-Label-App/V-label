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
  type: 'TASK_ASSIGNED' | 'TASK_SUBMITTED' | 'TASK_APPROVED' | 'TASK_REJECTED' | 'DEADLINE_WARNING' | 'COMMENT_MENTION' | 'SYSTEM_ANNOUNCEMENT' | 'SYSTEM_CHAT_CONFIG' | 'SYSTEM_USER_ROLE_CHANGE' | 'LABEL_REQUESTED' | 'LABEL_REQUEST_APPROVED' | 'LABEL_REQUEST_REJECTED' | 'LABEL_CREATED' | 'PROJECT_INVITATION' | 'PROJECT_ASSIGNED' | 'PROJECT_UNASSIGNED' | 'TASK_REASSIGNING' | 'TASK_REASSIGNED';
  title: string;
  message: string;
  metadata?: any;
}
