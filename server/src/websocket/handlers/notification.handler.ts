    import { Server } from 'socket.io';
import { prisma } from '../../utils/database.js';
import { NotificationType } from '@prisma/client';
import { NotificationPayload } from '../types.js';

export async function sendNotification(
  io: Server,
  payload: NotificationPayload
) {
  const { userId, type, title, message, metadata } = payload;

  try {
    // Save to database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type as NotificationType,
        title,
        message,
        metadata,
      },
    });

    // Send to user's room (if online)
    io.to(`user:${userId}`).emit('notification:new', notification);

    return notification;
  } catch (error) {
    console.error('[WEBSOCKET] Failed to send notification:', error);
    throw error;
  }
}
