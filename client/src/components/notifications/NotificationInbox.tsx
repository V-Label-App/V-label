import { formatDistanceToNow } from 'date-fns';
import { CheckCircle, Bell, AlertCircle, XCircle, Clock } from 'lucide-react';
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    metadata?: any;
}

interface NotificationInboxProps {
    notifications: Notification[];
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    unreadCount: number;
}

const NotificationIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'TASK_ASSIGNED':
            return <Bell className="w-4 h-4 text-blue-600" />;
        case 'TASK_SUBMITTED':
            return <Clock className="w-4 h-4 text-yellow-600" />;
        case 'TASK_APPROVED':
            return <CheckCircle className="w-4 h-4 text-green-600" />;
        case 'TASK_REJECTED':
            return <XCircle className="w-4 h-4 text-red-600" />;
        case 'DEADLINE_WARNING':
            return <AlertCircle className="w-4 h-4 text-orange-600" />;
        default:
            return <Bell className="w-4 h-4 text-gray-600" />;
    }
};

export function NotificationInbox({ notifications, onMarkAsRead, onMarkAllAsRead, unreadCount }: NotificationInboxProps) {
    if (notifications.length === 0) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications yet</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onMarkAllAsRead();
                        }}
                        className="text-[11px] font-medium text-blue-600 hover:text-blue-700 transition-colors px-2 py-1 rounded hover:bg-blue-50"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {/* Notification List */}
            <ScrollArea className="h-[400px]">
                <div className="divide-y">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            onClick={() => !notification.isRead && onMarkAsRead(notification.id)}
                            className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.isRead ? 'bg-blue-50' : ''
                                }`}
                        >
                            <div className="flex gap-3">
                                <div className="mt-1">
                                    <NotificationIcon type={notification.type} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-col gap-1">
                                            <p className="font-medium text-sm">{notification.title}</p>
                                            {notification.metadata?.reputationChange && (
                                                <Badge 
                                                    variant="secondary" 
                                                    className={`w-fit h-5 px-1.5 text-[10px] font-bold ${
                                                        notification.metadata.reputationChange > 0 
                                                        ? "bg-green-100 text-green-700 border-green-200" 
                                                        : "bg-red-100 text-red-700 border-red-200"
                                                    }`}
                                                >
                                                    {notification.metadata.reputationChange > 0 ? "+" : ""}
                                                    {notification.metadata.reputationChange} Reputation
                                                </Badge>
                                            )}
                                        </div>
                                        {!notification.isRead && (
                                            <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
