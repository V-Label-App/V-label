import { useState, useEffect } from 'react';
import { socketService } from '../services/socket.service';
import { notificationApi } from '../services/notification.api';
import type { Notification } from '../services/notification.api';

interface SystemEvent {
  type: string;
  timestamp: Date;
  data: any;
  triggeredBy?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from DB on mount
  const loadNotificationsFromDB = async () => {
    try {
      const data = await notificationApi.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      console.log('[Notifications] Loaded from DB:', data.notifications?.length, 'unread:', data.unreadCount);
    } catch (error) {
      console.error('[Notifications] Failed to load from DB:', error);
    }
  };

  useEffect(() => {
    // Load existing notifications from DB
    loadNotificationsFromDB();

    const socket = socketService.getSocket();
    
    if (!socket) {
      console.warn('[Notifications] Socket not initialized');
      return;
    }

    console.log('[Notifications] Setting up event listeners, socket connected:', socket.connected);

    const handleNewNotification = (notification: Notification) => {
      console.log('[Notifications] New notification received:', notification);
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      // Show toast - REMOVED as requested
      // toast.info(notification.title, {
      //   description: notification.message,
      // });
    };

    const handleSystemEvent = (event: SystemEvent) => {
      console.log('[Notifications] System event received:', event);
      
      switch (event.type) {
        case 'system:chat:config:updated':
          console.log('[Notifications] Handling chat config update:', event.data);
          
          const title = 'AI Chat Widget Updated';
          const message = event.data.enabled 
            ? 'AI Chat Widget has been enabled by Admin' 
            : 'AI Chat Widget has been disabled by Admin';
          
          // Add to notification bell
          const notification: Notification = {
            id: `temp-${Date.now()}`, // Temporary ID for real-time notification
            type: 'SYSTEM_ANNOUNCEMENT',
            title,
            message,
            isRead: false,
            createdAt: new Date().toISOString(),
            metadata: event.data,
          };
          
          setNotifications((prev) => [notification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          break;
          
        // Add more system event handlers here in the future
        case 'task:assigned':
        case 'task:submitted':
        case 'user:role:changed':
          // Handle other event types
          break;
          
        default:
          console.log('[Notifications] Unhandled system event type:', event.type);
      }
    };

    const setupListeners = () => {
      socket.on('notification:new', handleNewNotification);
      socket.on('system:event', handleSystemEvent);
      console.log('[Notifications] Event listeners registered');
    };

    // If already connected, setup immediately
    if (socket.connected) {
      setupListeners();
    } else {
      // Wait for connection
      console.log('[Notifications] Waiting for socket connection...');
      socket.on('connect', () => {
        console.log('[Notifications] Socket connected, setting up listeners');
        setupListeners();
      });
    }

    return () => {
      console.log('[Notifications] Cleaning up event listeners');
      socket.off('notification:new', handleNewNotification);
      socket.off('system:event', handleSystemEvent);
      socket.off('connect');
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      // Call API to mark as read in DB
      await notificationApi.markAsRead(notificationId);
      
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[Notifications] Failed to mark as read:', error);
    }
  };

  return { notifications, unreadCount, markAsRead };
}
