import { Server, Socket } from 'socket.io';
import { prisma } from '../../utils/database.js';
import logger from '../../utils/logger.js';
import { JoinProjectRoomPayload, SendMessagePayload, TypingPayload } from '../types.js';

export function registerChatHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  // Join project chat room
  socket.on('chat:join-project', async (payload: JoinProjectRoomPayload) => {
    const { projectId } = payload;

    // Verify user is a member of the project
    const member = await prisma.projectMember.findFirst({
      where: { projectId, userId },
    });

    if (!member) {
      socket.emit('error', { message: 'Not a member of this project' });
      return;
    }

    socket.join(`project:${projectId}`);
    logger.info('WEBSOCKET', `User ${userId} joined project room ${projectId}`);
  });

  // Leave project chat room
  socket.on('chat:leave-project', (payload: JoinProjectRoomPayload) => {
    socket.leave(`project:${payload.projectId}`);
  });

  // Send message
  socket.on('chat:send-message', async (payload: SendMessagePayload) => {
    const { projectId, content } = payload;
    
    // logger.debug('WEBSOCKET', `Sending message. User: ${userId}, Project: ${projectId}, Content: ${content}`);

    try {
      if (!projectId || !content) {
          throw new Error('Missing projectId or content');
      }

      // Save message to database
      const message = await prisma.chatMessage.create({
        data: {
          projectId,
          senderId: userId,
          content,
        },
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Broadcast to all users in the project room
      io.to(`project:${projectId}`).emit('chat:new-message', message);
    } catch (error) {
      logger.error('WEBSOCKET', `Failed to send message: ${error}`, error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicator
  socket.on('chat:typing', (payload: TypingPayload) => {
    const { projectId, isTyping } = payload;
    
    // Broadcast to others in the room (exclude sender)
    socket.to(`project:${projectId}`).emit('chat:user-typing', {
      userId,
      isTyping,
    });
  });
}
