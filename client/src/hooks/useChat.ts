  import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socket.service';
import { useSocket } from '../context/SocketContext';

interface ChatMessage {
  id: string;
  projectId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export function useChat(projectId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const { isConnected } = useSocket();

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !isConnected) return;

    // Join project room
    socket.emit('chat:join-project', { projectId });

    // Listen for new messages
    const handleNewMessage = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    };

    // Listen for typing indicators
    const handleTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    };

    socket.on('chat:new-message', handleNewMessage);
    socket.on('chat:user-typing', handleTyping);

    // Cleanup
    return () => {
      socket.emit('chat:leave-project', { projectId });
      socket.off('chat:new-message', handleNewMessage);
      socket.off('chat:user-typing', handleTyping);
    };
  }, [projectId, isConnected]);

  const sendMessage = useCallback((content: string) => {
    socketService.emit('chat:send-message', { projectId, content });
  }, [projectId]);

  const setTyping = useCallback((isTyping: boolean) => {
    socketService.emit('chat:typing', { projectId, isTyping });
  }, [projectId]);

  return { messages, sendMessage, typingUsers, setTyping };
}
