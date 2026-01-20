import { Server as SocketServer } from 'socket.io';
import { SystemEventType, SystemEventPayload } from './types.js';
import logger from '../../utils/logger.js';

/**
 * Centralized service for broadcasting system events via WebSocket
 * This makes it easy to add new event types without modifying core logic
 */
export class BroadcastService {
  private io: SocketServer | null = null;
  private instanceId = Math.random().toString(36).substring(7);

  constructor() {
    logger.info('BROADCAST', `Service created with ID: ${this.instanceId}`);
  }

  /**
   * Initialize the broadcast service with Socket.IO instance
   */
  setSocketServer(io: SocketServer) {
    this.io = io;
    logger.info('BROADCAST', `[${this.instanceId}] Broadcast service initialized with Socket.IO`);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcastToAll<T>(eventType: SystemEventType, data: T, triggeredBy?: string) {
    if (!this.io) {
      logger.warn('BROADCAST', `[${this.instanceId}] Socket.IO not initialized, skipping broadcast of ${eventType}`);
      return;
    }

    this.io.emit('system:event', {
      type: eventType,
      timestamp: new Date(),
      data,
      ...(triggeredBy && { triggeredBy }),
    });
    logger.info('BROADCAST', `[${this.instanceId}] Event broadcasted: ${eventType}`);
  }

  /**
   * Broadcast event to specific user
   */
  broadcastToUser<T>(userId: string, eventType: SystemEventType, data: T, triggeredBy?: string) {
    if (!this.io) {
      logger.warn('BROADCAST', 'Socket.IO not initialized, skipping broadcast');
      return;
    }

    this.io.to(`user:${userId}`).emit('system:event', {
      type: eventType,
      timestamp: new Date(),
      data,
      ...(triggeredBy && { triggeredBy }),
    });
    logger.info('BROADCAST', `Event sent to user ${userId}: ${eventType}`);
  }

  /**
   * Broadcast event to specific room (e.g., project members)
   */
  broadcastToRoom<T>(room: string, eventType: SystemEventType, data: T, triggeredBy?: string) {
    if (!this.io) {
      logger.warn('BROADCAST', 'Socket.IO not initialized, skipping broadcast');
      return;
    }

    this.io.to(room).emit('system:event', {
      type: eventType,
      timestamp: new Date(),
      data,
      ...(triggeredBy && { triggeredBy }),
    });
    logger.info('BROADCAST', `Event sent to room ${room}: ${eventType}`);
  }

  /**
   * Broadcast event to multiple users
   */
  broadcastToUsers<T>(userIds: string[], eventType: SystemEventType, data: T, triggeredBy?: string) {
    userIds.forEach(userId => {
      this.broadcastToUser(userId, eventType, data, triggeredBy);
    });
  }

  /**
   * Get Socket.IO instance (for advanced use cases)
   */
  getIO(): SocketServer | null {
    return this.io;
  }
}

// Singleton instance
export const broadcastService = new BroadcastService();
