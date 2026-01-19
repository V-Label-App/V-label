import { Bell } from 'lucide-react';
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { NotificationInbox } from './NotificationInbox';
import { useNotifications } from '../../hooks/useNotifications';

export function NotificationBell() {
    const { notifications, unreadCount, markAsRead } = useNotifications();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0">
                <NotificationInbox
                    notifications={notifications}
                    onMarkAsRead={markAsRead}
                />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
