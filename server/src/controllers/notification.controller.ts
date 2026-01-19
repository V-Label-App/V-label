import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service.js';

export class NotificationController {
  /**
   * Get current user's notifications
   */
  static async getMyNotifications(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const notifications = await NotificationService.getUserNotifications(userId);
      const unreadCount = await NotificationService.getUnreadCount(userId);

      return res.json({ notifications, unreadCount });
    } catch (error) {
      console.error('[Notifications] Get notifications error:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.sub;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await NotificationService.markAsRead(id, userId);
      return res.json({ success: true });
    } catch (error) {
      console.error('[Notifications] Mark as read error:', error);
      return res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.sub;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await NotificationService.markAllAsRead(userId);
      return res.json({ success: true });
    } catch (error) {
      console.error('[Notifications] Mark all as read error:', error);
      return res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  }
}
