import { useState } from 'react';
import { Card } from '../ui/card';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useChat } from '../../hooks/useChat';
import { MessageCircle, MoreVertical, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from '../ui/button';
import { chatApi } from '../../services/chat.api';
import { toast } from 'sonner';

interface ChatPanelProps {
    projectId: string;
    projectName: string;
    isManager: boolean;
}

export function ChatPanel({ projectId, projectName, isManager }: ChatPanelProps) {
    const { messages, sendMessage, typingUsers, setTyping, reloadMessages } = useChat(projectId);
    const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

    const handleClearHistory = async () => {
        try {
            await chatApi.clearHistory(projectId);
            toast.success('Chat history cleared');
            reloadMessages();
        } catch (error) {
            console.error('Failed to clear chat:', error);
            toast.error('Failed to clear chat history');
        } finally {
            setIsClearDialogOpen(false);
        }
    };

    return (
        <>
            <Card className="flex flex-col h-[600px]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-blue-600" />
                        <div>
                            <h3 className="font-semibold">Project Chat</h3>
                            <p className="text-xs text-muted-foreground">{projectName}</p>
                        </div>
                    </div>

                    {isManager && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => setIsClearDialogOpen(true)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Clear History
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* Messages */}
                <MessageList messages={messages} typingUsers={typingUsers} />

                {/* Input */}
                <MessageInput onSendMessage={sendMessage} onTyping={setTyping} />
            </Card>

            <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Clear Chat History?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. All messages in this project will be permanently deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearHistory} className="bg-red-600 hover:bg-red-700">
                            Delete All Messages
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
