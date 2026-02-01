import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { socketAuthMiddleware } from './middleware/socket.auth.js';
import { registerChatHandlers } from './handlers/chat.handler.js';
import { broadcastService } from './events/broadcast.service.js';
import logger from '../utils/logger.js';

export function initializeSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        process.env.CLIENT_URL || 'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://vlabel.cloud',
        'https://www.vlabel.cloud'
      ],
      credentials: true,
    },
    pingInterval: 30000,  // 30s heartbeat
    pingTimeout: 10000,   // 10s timeout
  });

  // Initialize broadcast service with Socket.IO instance
  broadcastService.setSocketServer(io);

  // Authentication middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId || 'Default';
    const userRole = socket.data.userRole || 'UNKNOWN';
    const userName = socket.data.userName;
    logger.info('WEBSOCKET', `User connected: ${userId} | Role: ${userRole} | Load prompt for: ${userRole}`);

    // Join user's personal room for direct notifications
    socket.join(`user:${userId}`);

    // Join role-based room for targeted announcements
    socket.join(`role:${userRole}`);

    // Register event handlers
    registerChatHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.info('WEBSOCKET', `User disconnected: ${userId} (${userRole})`);
    });

    socket.on('error', (error) => {
      logger.error('WEBSOCKET', `Socket error for user ${userId}: ${error}`);
    });
  });

  return io;
}
