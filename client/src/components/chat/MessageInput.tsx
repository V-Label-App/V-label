import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Send } from 'lucide-react';

interface MessageInputProps {
    onSendMessage: (content: string) => void;
    onTyping: (isTyping: boolean) => void;
}

export function MessageInput({ onSendMessage, onTyping }: MessageInputProps) {
    const [message, setMessage] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (message.trim()) {
            onSendMessage(message.trim());
            setMessage('');
            onTyping(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleChange = (value: string) => {
        setMessage(value);
        onTyping(value.length > 0);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
                <Textarea
                    value={message}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => onTyping(false)}
                    placeholder="Type a message... (Shift+Enter for newline)"
                    className="min-h-[60px] max-h-[120px] resize-none"
                />
                <Button type="submit" disabled={!message.trim()} className="self-end">
                    <Send className="w-4 h-4" />
                </Button>
            </div>
        </form>
    );
}
