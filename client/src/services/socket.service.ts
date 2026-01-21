import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) return;

    // Fix: Socket.IO treats path in URL as namespace. We need to extract just the origin.
    // data.env.VITE_API_URL is likely 'http://localhost:4000/api/v1', so we need 'http://localhost:4000'
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    let socketUrl = apiUrl;
    
    try {
        const url = new URL(apiUrl);
        socketUrl = url.origin; // This gives 'http://localhost:4000' without path
    } catch (e) {
        console.warn('[SOCKET] Failed to parse VITE_API_URL, using as is:', apiUrl);
    }

    this.socket = io(socketUrl, {
      auth: { token },
      autoConnect: true,
      path: '/socket.io/', // Explicitly set path if needed, though default is usually correct
    });

    this.socket.on('connect', () => {
      console.log('[SOCKET] Connected');
    });

    this.socket.on('disconnect', () => {
      console.log('[SOCKET] Disconnected');
    });

    this.socket.on('error', (error: any) => {
      console.error('[SOCKET] Error:', error.message);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('[SOCKET] Connection Error:', error.message, error);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }
}

export const socketService = new SocketService();
