import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface Message {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
    sender: {
        id: string;
        fullName: string | null;
        avatarUrl: string | null;
    };
}

interface MessageListProps {
    messages: Message[];
    typingUsers: Set<string>;
}

export function MessageList({ messages, typingUsers }: MessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const getInitials = (name: string | null) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                </div>
            ) : (
                messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                        <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                {getInitials(message.sender.fullName)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex items-baseline gap-2">
                                <span className="font-medium text-sm">{message.sender.fullName || 'Unknown'}</span>
                                <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                                </span>
                            </div>
                            <p className="text-sm mt-1 whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                    </div>
                ))
            )}

            {typingUsers.size > 0 && (
                <div className="text-sm text-muted-foreground italic">
                    Someone is typing...
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}
