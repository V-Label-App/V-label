import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { socketService } from '../services/socket.service';
import { useAuth } from './AuthContext';

interface SocketContextValue {
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
    const { user, accessToken } = useAuth();
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (user && accessToken) {
            socketService.connect(accessToken);

            const socket = socketService.getSocket();
            if (socket) {
                // Initial check
                setIsConnected(socket.connected);

                const onConnect = () => setIsConnected(true);
                const onDisconnect = () => setIsConnected(false);

                socket.on('connect', onConnect);
                socket.on('disconnect', onDisconnect);

                return () => {
                    socket.off('connect', onConnect);
                    socket.off('disconnect', onDisconnect);
                    socketService.disconnect();
                };
            }
        } else {
            socketService.disconnect();
            setIsConnected(false);
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
