import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socket.service';
import { useSocket } from '../context/SocketContext';
import { chatApi, type ChatMessage } from '../services/chat.api';
import { toast } from 'sonner';

import { useAuth } from '../context/AuthContext';

export function useChat(projectId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const { isConnected } = useSocket();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const data = await chatApi.getMessages(projectId);
        setMessages(data.messages);
      } catch (error) {
        console.error('Failed to load chat history:', error);
        toast.error('Could not load chat history');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      loadMessages();
    }
  }, [projectId]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !isConnected) {
      console.log('[UseChat] Socket not connected yet');
      return;
    }

    console.log(`[UseChat] Joining project room: ${projectId}`);

    // Join project room
    socket.emit('chat:join-project', { projectId });

    // Listen for new messages
    const handleNewMessage = (message: ChatMessage) => {
      console.log('[UseChat] Received new message:', message);
      setMessages((prev) => {
        // Check if we have a temp message that matches this one
        const tempMatchIndex = prev.findIndex(m =>
          m.id.startsWith('temp-') &&
          m.content === message.content &&
          m.senderId === message.senderId
        );

        if (tempMatchIndex !== -1) {
          // Replace the optimistic message with the real one
          const newMessages = [...prev];
          newMessages[tempMatchIndex] = message;
          return newMessages;
        }

        // Check if message already exists (deduplication by ID)
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }

        return [...prev, message];
      });
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
    if (!user) return;

    // 1. Optimistic Update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      projectId,
      senderId: user.id,
      content,
      createdAt: new Date().toISOString(),
      sender: {
        id: user.id,
        fullName: user.fullName || 'Me', // Fallback
        avatarUrl: user.avatarUrl || null
      }
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    // 2. Send to Server
    socketService.emit('chat:send-message', { projectId, content });
  }, [projectId, user]);

  const setTyping = useCallback((isTyping: boolean) => {
    socketService.emit('chat:typing', { projectId, isTyping });
  }, [projectId]);

  const reloadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await chatApi.getMessages(projectId);
      setMessages(data.messages);
    } catch (error) {
      console.error('Failed to load chat history:', error);
      toast.error('Could not load chat history');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  return { messages, sendMessage, typingUsers, setTyping, isLoading, reloadMessages };
}
