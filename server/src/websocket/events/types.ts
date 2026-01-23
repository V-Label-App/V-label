/**
 * WebSocket Event Types
 * Add new event types here as the system grows
 */
export enum SystemEventType {
  // System Configuration Events
  CHAT_CONFIG_UPDATED = 'system:chat:config:updated',
  ANNOUNCEMENT = 'system:announcement',

  // Task Management Events (Future)
  TASK_ASSIGNED = 'task:assigned',
  TASK_SUBMITTED = 'task:submitted',
  TASK_APPROVED = 'task:approved',
  TASK_REJECTED = 'task:rejected',

  // Notification Events
  NOTIFICATION_CREATED = 'notification:created',

  // Label Events
  LABEL_CREATED = 'label:created',
  LABEL_UPDATED = 'label:updated',
  LABEL_DELETED = 'label:deleted',

  // User Events (Future)
  USER_ROLE_CHANGED = 'user:role:changed',
  USER_STATUS_CHANGED = 'user:status:changed',
}

/**
 * Base payload for all system events
 */
export interface SystemEventPayload<T = any> {
  type: SystemEventType;
  timestamp: Date;
  data: T;
  triggeredBy?: string; // User ID who triggered the event
}

/**
 * Chat Config Update Event Payload
 */
export interface ChatConfigUpdatePayload {
  enabled: boolean;
  modelName: string;
  adminId: string;
  adminEmail?: string;
}
