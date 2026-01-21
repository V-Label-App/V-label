import { prisma } from '../utils/database.js';
import { NotificationType } from '@prisma/client';
import { NotificationTemplateService } from './notification.template.service.js';
import { broadcastService } from '../websocket/events/broadcast.service.js';
import { SystemEventType } from '../websocket/events/types.js';

export class NotificationService {
  /**
   * Create notification for a single user
   */
  static async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
  }) {
    return await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata || {},
      },
    });
  }

  /**
   * Create notification for all users (system-wide announcements)
   */
  static async createNotificationForAllUsers(data: {
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
  }) {
    // Get all active users
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    // Create notification for each user
    const notifications = await prisma.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata || {},
      })),
    });

    return notifications;
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(userId: string, limit = 50) {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Delete old read notifications (cleanup)
   */
  static async deleteOldNotifications(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: cutoffDate },
      },
    });
  }
  /**
   * Create and broadcast a system announcement
   */
  static async createSystemAnnouncement(title: string, message: string, adminId: string) {
    // 1. Render content using the SYSTEM_ANNOUNCEMENT template
    const rendered = await NotificationTemplateService.render(
      NotificationType.SYSTEM_ANNOUNCEMENT,
      {
        title,
        message,
      }
    );

    // 2. Broadcast to all online users
    broadcastService.broadcastToAll(
      SystemEventType.ANNOUNCEMENT,
      {
        notification: {
          title: rendered.title,
          message: rendered.message,
        },
      },
      adminId
    );

    // 3. Save to database for all users
    return await this.createNotificationForAllUsers({
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: rendered.title,
      message: rendered.message,
      metadata: {
        adminId,
        originalTitle: title,
        originalMessage: message,
      },
    });
  }
}
