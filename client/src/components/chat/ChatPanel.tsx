import { Card } from '../ui/card';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChat } from '../../hooks/useChat';
import { MessageCircle } from 'lucide-react';

interface ChatPanelProps {
    projectId: string;
    projectName: string;
}

export function ChatPanel({ projectId, projectName }: ChatPanelProps) {
    const { messages, sendMessage, typingUsers, setTyping } = useChat(projectId);

    return (
        <Card className="flex flex-col h-[600px]">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b bg-gray-50">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <div>
                    <h3 className="font-semibold">Project Chat</h3>
                    <p className="text-xs text-muted-foreground">{projectName}</p>
                </div>
            </div>

            {/* Messages */}
            <MessageList messages={messages} typingUsers={typingUsers} />

            {/* Input */}
            <MessageInput onSendMessage={sendMessage} onTyping={setTyping} />
        </Card>
    );
}
