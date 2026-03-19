import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { socketService } from '../services/socket.service';
import { useAuth } from './AuthContext';

interface SocketContextValue {
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
    const { user, accessToken } = useAuth();
    const [isConnected, setIsConnected] = useState(() => socketService.getSocket()?.connected ?? false);

    useEffect(() => {
        if (user && accessToken) {
            socketService.connect(accessToken);

            const socket = socketService.getSocket();
            if (socket) {
                // Initial check - updated via state initializer or listeners
                // to avoid synchronously calling setState within effect body

                const onConnect = () => setIsConnected(true);
                const onDisconnect = () => setIsConnected(false);

                socket.on('connect', onConnect);
                socket.on('disconnect', onDisconnect);

                return () => {
                    // Only remove listeners, DON'T disconnect the socket
                    // Socket should stay connected across component re-renders
                    socket.off('connect', onConnect);
                    socket.off('disconnect', onDisconnect);
                };
            }
        } else {
            // Only disconnect when user logs out
            socketService.disconnect();
            // Wrap in setTimeout to avoid synchronously calling setState within effect body
            setTimeout(() => setIsConnected(false), 0);
        }
    }, [user, accessToken]);

    return (
        <SocketContext.Provider value={{ isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) throw new Error('useSocket must be used within SocketProvider');
    return context;
}
