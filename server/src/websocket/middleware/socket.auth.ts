import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from '../../config/env.js';
import logger from '../../utils/logger.js';

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth.token;

  // logger.info('SOCKET_AUTH', `Attempting connection. Token present: ${!!token}`);

  if (!token) {
    logger.warn('SOCKET_AUTH', 'Connection rejected: No token provided');
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { id?: string; sub?: string };
    socket.data.userId = decoded.sub || decoded.id;
    // logger.success('SOCKET_AUTH', `Authenticated user: ${decoded.id}`);
    next();
  } catch (error: any) {
    logger.error('SOCKET_AUTH', `Invalid token: ${error.message}`);
    next(new Error('Authentication error: Invalid token'));
  }
}
