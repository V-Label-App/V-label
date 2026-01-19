import express from 'express';
import { prisma } from '../utils/database.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Get user's notifications (paginated)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = (req.user as any)?.sub as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[API] Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.post('/:id/read', authMiddleware, async (req, res) => {
  try {
    const userId = (req.user as any)?.sub as string;
    const rawNotificationId = req.params.id;
    const notificationId = (Array.isArray(rawNotificationId) ? rawNotificationId[0] : rawNotificationId) ?? '';

    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
        userId, // Ensure user owns this notification
      },
      data: { isRead: true },
    });

    res.json(notification);
  } catch (error) {
    console.error('[API] Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Delete notification
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = (req.user as any)?.sub as string;
    const rawNotificationId = req.params.id;
    const notificationId = (Array.isArray(rawNotificationId) ? rawNotificationId[0] : rawNotificationId) ?? '';

    await prisma.notification.delete({
      where: {
        id: notificationId,
        userId,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[API] Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
