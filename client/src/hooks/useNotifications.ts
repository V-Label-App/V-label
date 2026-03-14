import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socket.service';
import { notificationApi } from '../services/notification.api';
import type { Notification } from '../services/notification.api';
import { toast } from 'sonner';

interface SystemEventData {
  notification?: Notification;
  label?: { name: string };
  enabled?: boolean;
  [key: string]: unknown;
}

interface SystemEvent {
  type: string;
  timestamp: Date;
  data: SystemEventData;
  triggeredBy?: string;
}

export function useNotifications() {
  const { refreshUserProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from DB on mount
  const loadNotificationsFromDB = async () => {
    try {
      const data = await notificationApi.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      console.log(
        "[Notifications] Loaded from DB:",
        data.notifications?.length,
        "unread:",
        data.unreadCount,
      );
    } catch (error) {
      console.error("[Notifications] Failed to load from DB:", error);
    }
  };

  useEffect(() => {
    // Load existing notifications from DB
    loadNotificationsFromDB();

    // Retry getting socket until it's available (max 10 attempts, 200ms apart = 2s total)
    let attempts = 0;
    const maxAttempts = 10;
    let timeoutId: number | null = null;
    let listenersRegistered = false; // Guard against StrictMode double-mount

    const setupSocket = () => {
      const socket = socketService.getSocket();

      if (!socket) {
        attempts++;
        if (attempts < maxAttempts) {
          console.log(
            `[Notifications] Socket not ready yet, retrying... (${attempts}/${maxAttempts})`,
          );
          timeoutId = setTimeout(setupSocket, 200);
          return null;
        } else {
          console.warn(
            "[Notifications] Socket not initialized after",
            maxAttempts,
            "attempts",
          );
          return null;
        }
      }

      // Guard: If listeners already registered (StrictMode double-mount), skip
      if (listenersRegistered) {
        console.log(
          "[Notifications] Listeners already registered, skipping duplicate setup",
        );
        return null;
      }

      console.log(
        "[Notifications] Socket ready, setting up event listeners. Connected:",
        socket.connected,
      );
      listenersRegistered = true;

      const handleProjectInvitation = (data: any) => {
        // data: { projectId, projectName, role, invitedBy }
        console.log('[Notifications] Received project invitation:', data);

        toast.message('New Project Invitation', {
          description: `You have been added to "${data.projectName}" as ${data.role}`,
          action: {
            label: 'View',
            onClick: () => window.location.href = `/manager/projects/${data.projectId}`
          },
          duration: 5000,
        });

        // We now receive 'notification:new' separately for the list update
      };

      const handleNewNotification = (notification: Notification) => {
        console.log("[Notifications] New notification received:", notification);
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);

        // Auto-refresh profile if notification is related to task approval/rejection
        if (notification.type === 'TASK_APPROVED' || notification.type === 'TASK_REJECTED') {
          console.log("[Notifications] Task review event, refreshing user profile...");
          refreshUserProfile();
        }
      };

      const handleSystemEvent = (event: SystemEvent) => {
        console.log("[Notifications] System event received:", event);

        switch (event.type) {
          case "system:chat:config:updated": {
            console.log(
              "[Notifications] Handling chat config update:",
              event.data,
            );

            let title, message;
            if (event.data.notification) {
              title = event.data.notification.title;
              message = event.data.notification.message;
            } else {
              title = "AI Chat Widget Updated";
              message = event.data.enabled
                ? "AI Chat Widget has been enabled by Admin"
                : "AI Chat Widget has been disabled by Admin";
            }

            const notification: Notification = {
              id: `temp-${Date.now()}`,
              type: "SYSTEM_CHAT_CONFIG",
              title: title || "System Update",
              message: message || "Configuration updated",
              isRead: false,
              createdAt: new Date().toISOString(),
              metadata: event.data,
            };

            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
            break;
          }

          case "system:announcement": {
            console.log(
              "[Notifications] Handling system announcement:",
              event.data,
            );

            if (event.data.notification) {
              const announcement: Notification = {
                id: `temp-${Date.now()}`,
                type: "SYSTEM_ANNOUNCEMENT",
                title: event.data.notification.title,
                message: event.data.notification.message,
                isRead: false,
                createdAt: new Date().toISOString(),
                metadata: event.data,
              };

              setNotifications((prev) => [announcement, ...prev]);
              setUnreadCount((prev) => prev + 1);
            }
            break;
          }

          case "notification:created": {
            console.log(
              "[Notifications] Handling notification created:",
                event.data,
              );

            if (event.data.notification) {
              const newNotification: Notification = {
                id: event.data.notification.id || `temp-${Date.now()}`,
                type: event.data.notification.type,
                title: event.data.notification.title,
                message: event.data.notification.message,
                isRead: event.data.notification.isRead || false,
                createdAt:
                  event.data.notification.createdAt || new Date().toISOString(),
                metadata: event.data.notification.metadata,
              };

              setNotifications((prev) => [newNotification, ...prev]);
              setUnreadCount((prev) => prev + 1);
            }
            break;
          }

          case "label:created": {
            // console.log('[Notifications] Handling label created:', event.data);

            // Validation: Ensure we have either a pre-formatted notification OR valid label data
            // This prevents duplicate "undefined" notifications if the event is emitted without payload
            if (!event.data.notification && !event.data.label?.name) {
              break;
            }

            const labelNotification: Notification = {
              id: `temp-${Date.now()}`,
              type: "LABEL_CREATED",
              title: event.data.notification?.title || "New Label Created",
              message:
                event.data.notification?.message ||
                `A new label "${event.data.label?.name}" has been created.`,
              isRead: false,
              createdAt: new Date().toISOString(),
              metadata: event.data.label,
            };

            setNotifications((prev) => [labelNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
            break;
          }

          case "task:assigned":
          case "task:submitted":
          case "user:role:changed":
            break;

          default:
            console.log(
              "[Notifications] Unhandled system event type:",
              event.type,
            );
        }
      };

      // Setup listeners immediately
      socket.on('notification:new', handleNewNotification);
      socket.on('system:event', handleSystemEvent);
      socket.on('project:invitation', handleProjectInvitation);
      console.log('[Notifications] Event listeners registered');

      // Handle reconnection
      const handleReconnect = () => {
        console.log(
          "[Notifications] Socket reconnected, reloading notifications",
        );
        loadNotificationsFromDB();
      };

      socket.on("connect", handleReconnect);

      // Return cleanup function
      return () => {
        console.log('[Notifications] Cleaning up event listeners');
        socket.off('notification:new', handleNewNotification);
        socket.off('system:event', handleSystemEvent);
        socket.off('project:invitation', handleProjectInvitation);
        socket.off('connect', handleReconnect);
      };
    };

    // Start the setup process
    const cleanup = setupSocket();

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("[Notifications] Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.isRead);
      if (unreadNotifications.length === 0) return;

      // Mark all as read locally first for instant UI response
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      // Call API for each notification (FE-only approach)
      await Promise.all(
        unreadNotifications.map((n) => notificationApi.markAsRead(n.id)),
      );
    } catch (error) {
      console.error("[Notifications] Failed to mark all as read:", error);
      // Optional: reload from DB if it fails to sync
      loadNotificationsFromDB();
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
