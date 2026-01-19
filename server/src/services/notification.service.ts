import { prisma } from '../utils/database.js';
import { NotificationType } from '@prisma/client';

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
}
