import { useEffect } from 'react';

/**
 * Custom hook to update the browser tab title with notification count
 * @param unreadCount - Number of unread notifications
 * @param baseTitle - Base title of the application (default: "V Label")
 */
export function usePageTitle(unreadCount: number, baseTitle: string = "V Label") {
  useEffect(() => {
    // Update document title based on unread count
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }

    // Cleanup: Reset to base title when component unmounts
    return () => {
      document.title = baseTitle;
    };
  }, [unreadCount, baseTitle]);
}
