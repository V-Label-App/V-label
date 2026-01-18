import { useState, useEffect, useRef } from 'react';
import { chatWidgetApi, type PublicChatConfig, type ChatMessage } from '../services/chatWidget.api';
import { toast } from 'sonner';
import { useAuth } from '../../../context/AuthContext';

export function useChatWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<PublicChatConfig | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Initialize & Listen for updates
    useEffect(() => {
        loadConfig();

        const channel = new BroadcastChannel('chat_widget_channel');
        channel.onmessage = (event) => {
            if (event.data?.type === 'config_updated') {
                console.log('useChatWidget: Config update received, reloading...');
                loadConfig();
            }
        };

        return () => channel.close();
    }, []);

    // Auto-scroll
    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, isOpen]);

    // Refresh config when widget is opened
    useEffect(() => {
        if (isOpen) {
            loadConfig();
        }
    }, [isOpen]);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            const { scrollHeight, clientHeight } = chatContainerRef.current;
            chatContainerRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: 'smooth'
            });
        }
    };

    const loadConfig = async () => {
        try {
            console.log('useChatWidget: Fetching config...');
            const data = await chatWidgetApi.getConfig();
            console.log('useChatWidget: Config loaded:', data);
            setConfig(data);
            if ((data.enabled || user?.role === 'ADMIN') && data.ui.welcomeMessage) {
                // Add welcome message if history is empty
                setMessages([{
                    role: 'model',
                    parts: data.ui.welcomeMessage,
                    timestamp: Date.now()
                }]);
            }
        } catch (error) {
            console.error('Failed to load chat config', error);
        }
    };

    const toggleOpen = () => setIsOpen(!isOpen);

    const handleSendMessage = async (e?: React.FormEvent, content?: string) => {
        e?.preventDefault();
        
        const messageText = content || inputValue;
        if (!messageText.trim() || isTyping) return;

        const userMessage: ChatMessage = { 
            role: 'user', 
            parts: messageText,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);

        try {
            // Optimistic update done, now fetch response
            const response = await chatWidgetApi.sendMessage(messageText, messages); // Pass history excluding new message? Or including?
            // API expects history. Our 'messages' state hasn't updated in closure yet.
            // Better to pass current 'messages' (which is everything before this user message).
            
            const botMessage: ChatMessage = { 
                role: 'model', 
                parts: response.text,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            toast.error('Failed to send message');
            // Remove user message? Or show error state?
            // For now, simple error toast.
        } finally {
            setIsTyping(false);
        }
    };

    const resetChat = () => {
        setMessages([]);
        if (config?.enabled && config?.ui.welcomeMessage) {
            setMessages([{
                role: 'model',
                parts: config.ui.welcomeMessage,
                timestamp: Date.now()
            }]);
        }
        setInputValue('');
        setIsTyping(false);
    };

    return {
        isOpen,
        toggleOpen,
        config,
        messages,
        isTyping,
        inputValue,
        setInputValue,
        handleSendMessage,
        chatContainerRef,
        resetChat
    };
}
