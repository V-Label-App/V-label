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
   * Create notification for targeted users (by role or email)
   */
  static async createNotificationForTargetedUsers(data: {
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
    targetRoles?: string[];
    targetEmails?: string[];
  }) {
    // Build where clause
    const whereConditions: any[] = [{ isActive: true }];

    if (data.targetRoles && data.targetRoles.length > 0) {
      whereConditions.push({ role: { in: data.targetRoles } });
    }

    if (data.targetEmails && data.targetEmails.length > 0) {
      whereConditions.push({ email: { in: data.targetEmails } });
    }

    // If both roles and emails specified, use OR logic for targeting
    let users;
    if (data.targetRoles && data.targetEmails && data.targetRoles.length > 0 && data.targetEmails.length > 0) {
      users = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { role: { in: data.targetRoles as any } },
            { email: { in: data.targetEmails } }
          ]
        },
        select: { id: true },
      });
    } else if (data.targetRoles && data.targetRoles.length > 0) {
      users = await prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: data.targetRoles as any }
        },
        select: { id: true },
      });
    } else if (data.targetEmails && data.targetEmails.length > 0) {
      users = await prisma.user.findMany({
        where: {
          isActive: true,
          email: { in: data.targetEmails }
        },
        select: { id: true },
      });
    } else {
      users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
    }

    if (users.length === 0) {
      return { count: 0 };
    }

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

    // If template is disabled, skip notification
    if (!rendered) {
      return { count: 0 };
    }

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

  /**
   * Create and broadcast a targeted announcement (by role or email)
   */
  static async createTargetedAnnouncement(
    title: string,
    message: string,
    adminId: string,
    options?: {
      targetRoles?: string[];
      targetEmails?: string[];
    }
  ) {
    // 1. Render content using the SYSTEM_ANNOUNCEMENT template
    const rendered = await NotificationTemplateService.render(
      NotificationType.SYSTEM_ANNOUNCEMENT,
      {
        title,
        message,
      }
    );

    // If template is disabled, skip notification
    if (!rendered) {
      return { count: 0 };
    }

    // 2. Broadcast to targeted online users
    if (options?.targetRoles && options.targetRoles.length > 0) {
      broadcastService.broadcastToRoles(
        options.targetRoles,
        SystemEventType.ANNOUNCEMENT,
        {
          notification: {
            title: rendered.title,
            message: rendered.message,
          },
        },
        adminId
      );
    } else if (options?.targetEmails && options.targetEmails.length > 0) {
      // Get user IDs from emails for targeted broadcast
      const users = await prisma.user.findMany({
        where: { email: { in: options.targetEmails }, isActive: true },
        select: { id: true }
      });
      for (const user of users) {
        broadcastService.broadcastToUser(
          user.id,
          SystemEventType.ANNOUNCEMENT,
          {
            notification: {
              title: rendered.title,
              message: rendered.message,
            },
          }
        );
      }
    } else {
      // No targeting = all users
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
    }

    // 3. Save to database
    if (options?.targetRoles && options.targetRoles.length > 0) {
      return await this.createNotificationForTargetedUsers({
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: rendered.title,
        message: rendered.message,
        metadata: {
          adminId,
          originalTitle: title,
          originalMessage: message,
          targetRoles: options.targetRoles,
        },
        targetRoles: options.targetRoles,
      });
    }

    if (options?.targetEmails && options.targetEmails.length > 0) {
      return await this.createNotificationForTargetedUsers({
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: rendered.title,
        message: rendered.message,
        metadata: {
          adminId,
          originalTitle: title,
          originalMessage: message,
          targetEmails: options.targetEmails,
        },
        targetEmails: options.targetEmails,
      });
    }

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

  /**
   * Create and broadcast a label created notification to all users
   */
  static async createLabelCreatedNotification(data: {
    labelId: string;
    labelName: string;
    labelColor: string;
    categoryName?: string;
    isGlobal: boolean;
    creatorId: string;
    creatorName: string;
  }) {
    // 1. Render content using the LABEL_CREATED template
    const rendered = await NotificationTemplateService.render(
      NotificationType.LABEL_CREATED,
      {
        labelName: data.labelName,
        labelColor: data.labelColor,
        categoryName: data.categoryName || 'No Category',
        creatorName: data.creatorName,
        isGlobal: data.isGlobal ? 'Yes' : 'No',
      }
    );

    // If template is disabled, skip notification
    if (!rendered) {
      return { count: 0 };
    }

    // 2. Broadcast to all online users
    broadcastService.broadcastToAll(
      SystemEventType.LABEL_CREATED,
      {
        notification: {
          title: rendered.title,
          message: rendered.message,
        },
        label: {
          id: data.labelId,
          name: data.labelName,
          color: data.labelColor,
          isGlobal: data.isGlobal,
          categoryName: data.categoryName,
        },
      },
      data.creatorId
    );

    // 3. Save to database for all users
    return await this.createNotificationForAllUsers({
      type: NotificationType.LABEL_CREATED,
      title: rendered.title,
      message: rendered.message,
      metadata: {
        labelId: data.labelId,
        labelName: data.labelName,
        labelColor: data.labelColor,
        categoryName: data.categoryName,
        isGlobal: data.isGlobal,
        creatorId: data.creatorId,
        creatorName: data.creatorName,
      },
    });
  }
}
