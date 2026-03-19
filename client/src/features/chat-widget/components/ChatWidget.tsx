import { useRef, useEffect } from 'react';

import { useChatWidget } from '../hooks/useChatWidget';
import { useAuth } from '../../../context/AuthContext';
import { AIMessageRenderer, parseAIResponse } from './renderers';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card } from '../../../components/ui/card';
import { Sparkles, X, Send, Bot, User, MessageCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../components/ui/utils';

export interface ChatWidgetProps {
    variant?: 'floating' | 'embedded' | 'fullpage';
    className?: string;
    style?: React.CSSProperties;
}

export function ChatWidget({ variant = 'floating', className, style }: ChatWidgetProps) {
    const { isAuthenticated, user } = useAuth();
    const {
        isOpen,
        toggleOpen,
        config,
        messages,
        isTyping,
        inputValue,
        setInputValue,
        handleSendMessage: baseHandleSendMessage,
        chatContainerRef,
        resetChat
    } = useChatWidget();

    const inputRef = useRef<HTMLInputElement>(null);

    // Wrapper to handle extra UI logic like focus
    const handleSendMessage = async (e?: React.FormEvent, customMessage?: string) => {
        // If clicking a quick reply button, force focus back to input
        if (customMessage) {
            inputRef.current?.focus();
        }

        await baseHandleSendMessage(e, customMessage);
    };



    // Auto-focus input when typing finishes or widget opens
    useEffect(() => {
        if (!isTyping && isOpen) {
            // Small timeout to ensure DOM is ready and animation doesn't interfere
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isTyping, isOpen]);

    // Don't render if not authenticated
    if (!isAuthenticated) return null;

    // Show loading state or wait for config
    // Don't hide completely to avoid flickering
    if (!config) {
        // Return minimal placeholder instead of null to prevent unmounting
        return variant === 'floating' ? (
            <div className="fixed bottom-6 right-6 z-50">
                <div className="h-14 w-14 rounded-full bg-gray-200 animate-pulse" />
            </div>
        ) : null;
    }

    // For floating widget: Only show if enabled OR user is admin (for testing)
    if (variant === 'floating' && !config.enabled && user?.role !== 'ADMIN') return null;

    const isLeft = config.ui.position === 'left';
    const themeColor = config.ui.themeColor || '#0ea5e9';
    const isEmbedded = variant === 'embedded' || variant === 'fullpage';

    // If embedded, always open. If floating, use isOpen state.
    // const showWidget = isEmbedded || isOpen;

    const formatTime = (timestamp?: number) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Helper to parse quick replies from AI response
    const parseContent = (content: string) => {
        let cleanContent = content;
        let dynamicReplies: string[] = [];

        // First, check if content is a JSON AIResponse
        try {
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed === 'object' && parsed.type && parsed.content) {
                // It's a structured AIResponse
                // Extract Quick Replies from metadata if present
                const quickRepliesFromMetadata = parsed.metadata?.quickReplies || [];
                return { cleanContent: content, dynamicReplies: quickRepliesFromMetadata };
            }
        } catch {
            // Not JSON, continue with text parsing
        }

        // Parse Quick Replies from text response
        // Support multiple formats: <<<REPLIES>>>...<<<REPLIES>>> or <<<REPLIES>>>...<<< (truncated)
        const replyRegex = /<<<REPLIES>>>([\s\S]*?)(?:<<<REPLIES>>>|<<<[^R]|$)/;
        const match = content.match(replyRegex);

        if (match && match[1]) {
            try {
                // Clean the JSON string - remove trailing incomplete markers
                const jsonStr = match[1].trim();
                // Try to find a valid JSON array
                const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    dynamicReplies = JSON.parse(jsonMatch[0]);
                }
                // Remove the entire REPLIES block from content (including any trailing <<<)
                cleanContent = content.replace(/<<<REPLIES>>>[\s\S]*?(<<<REPLIES>>>|<<<|$)/, '').trim();
            } catch (e) {
                console.error("Failed to parse quick replies:", e);
                // Still try to remove the raw REPLIES block even if parsing failed
                cleanContent = content.replace(/<<<REPLIES>>>[\s\S]*?(<<<REPLIES>>>|<<<|$)/, '').trim();
            }
        }
        return { cleanContent, dynamicReplies };
    };

    // Fullpage variant: Full-screen professional layout
    if (variant === 'fullpage') {
        return (
            <Card
                className={cn("w-full h-full shadow-lg flex flex-col border border-border/50 rounded-xl overflow-hidden bg-gradient-to-br from-white to-gray-50/30", className)}
                style={style}
            >
                {/* Messages - Wider container for fullpage */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto px-8 py-6 space-y-8 bg-gradient-to-b from-slate-50/30 to-white scroll-smooth"
                >
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl">
                                <Bot className="w-12 h-12 text-blue-600" />
                            </div>
                            <p className="text-base font-medium text-gray-600">How can I assist you today?</p>
                            <p className="text-sm text-gray-400">Ask me anything about your projects or tasks</p>
                        </div>
                    )}
                    {messages.map((msg, idx) => {
                        const { cleanContent, dynamicReplies } = msg.role === 'model' ? parseContent(msg.parts) : { cleanContent: msg.parts, dynamicReplies: [] };
                        const isLastMessage = idx === messages.length - 1;

                        return (
                            <div
                                key={idx}
                                className={cn(
                                    "flex flex-col gap-2 max-w-4xl mx-auto", // Centered, wider max-width
                                    msg.role === 'user' ? "ml-auto items-end" : "items-start"
                                )}
                            >
                                <div className={cn("flex gap-4 w-full", msg.role === 'user' ? "flex-row-reverse" : "")}>
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md border-2 border-white",
                                        msg.role === 'user' ? "bg-gradient-to-br from-blue-500 to-blue-600" : "bg-gradient-to-br from-blue-50 to-indigo-50"
                                    )}>
                                        {msg.role === 'user'
                                            ? <User className="w-5 h-5 text-white" />
                                            : <Bot className="w-5 h-5 text-blue-600" />
                                        }
                                    </div>
                                    <div className={cn(
                                        "p-4 px-5 rounded-2xl text-[15px] shadow-md leading-relaxed flex-1",
                                        msg.role === 'user'
                                            ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-md"
                                            : "bg-white text-gray-800 border border-gray-100 rounded-tl-md"
                                    )}>
                                        {msg.role === 'model' ? (
                                            <div className="prose prose-base dark:prose-invert max-w-none prose-p:leading-7">
                                                <AIMessageRenderer
                                                    response={parseAIResponse(cleanContent)}
                                                    onAction={(action, data) => {
                                                        const message = data
                                                            ? `Execute ${action} with: ${JSON.stringify(data)}`
                                                            : action;
                                                        handleSendMessage(undefined, message);
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <p className="whitespace-pre-wrap">{cleanContent}</p>
                                        )}
                                        {msg.timestamp && (
                                            <p className={cn(
                                                "text-[11px] mt-2 text-right opacity-70",
                                                msg.role === 'user' ? "text-blue-100" : "text-gray-400"
                                            )}>
                                                {formatTime(msg.timestamp)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Dynamic Quick Replies */}
                                {isLastMessage && msg.role === 'model' && dynamicReplies.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3 mt-3 px-1 pl-14 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <p className="text-sm text-gray-500 mb-1 ml-1 col-span-2">Suggested:</p>
                                        {dynamicReplies.map((reply: string, rIdx: number) => (
                                            <button
                                                key={rIdx}
                                                onClick={() => handleSendMessage(undefined, reply)}
                                                className={cn(
                                                    "text-left p-3 px-5 rounded-xl text-sm transition-all shadow-sm border border-blue-100/70 hover:shadow-lg hover:border-blue-300 bg-white text-gray-700 hover:text-blue-600 active:scale-[0.98]",
                                                    "flex items-center justify-between group"
                                                )}
                                            >
                                                <span className="font-medium">{reply}</span>
                                                <Send className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Quick Replies */}
                    {config.ui.quickReplies && Array.isArray(config.ui.quickReplies) && config.ui.quickReplies.length > 0 && !messages.some(m => m.role === 'user') && (
                        <div className="grid grid-cols-2 gap-3 mt-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <p className="text-sm text-center text-gray-500 mb-2 col-span-2 font-medium">Quick suggestions to get started</p>
                            {config.ui.quickReplies.map((reply, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSendMessage(undefined, reply)}
                                    className={cn(
                                        "text-left p-4 px-5 rounded-xl text-sm transition-all shadow-sm border border-blue-100/70 hover:shadow-lg hover:border-blue-300 bg-white text-gray-700 hover:text-blue-600 active:scale-[0.98]",
                                        "flex items-center justify-between group"
                                    )}
                                >
                                    <span className="font-medium">{reply}</span>
                                    <Send className="w-4 h-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    )}

                    {isTyping && (
                        <div className="flex gap-4 max-w-4xl mx-auto">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border-2 border-white bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md overflow-hidden">
                                {config.ui.iconType === 'custom' && config.ui.customIconUrl ? (
                                    <img
                                        src={config.ui.customIconUrl}
                                        alt="Bot"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Bot className="w-5 h-5 text-blue-600" />
                                )}
                            </div>
                            <div className="bg-white border border-gray-200 text-gray-800 p-5 rounded-2xl rounded-tl-md shadow-md flex items-center gap-2 h-[54px]">
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Enhanced Input for Fullpage */}
                <div className="px-8 py-5 bg-white border-t border-gray-100">
                    <div className="max-w-4xl mx-auto">
                        <form
                            onSubmit={handleSendMessage}
                            className="flex items-center gap-3 relative"
                        >
                            <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Type your message here..."
                                className="h-14 pl-5 pr-16 rounded-2xl border-gray-200 bg-gray-50 focus:bg-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:border-blue-500 text-[15px]"
                                disabled={isTyping}
                                ref={inputRef}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!inputValue.trim() || isTyping}
                                style={{ backgroundColor: inputValue.trim() ? themeColor : undefined }}
                                className={cn(
                                    "absolute right-2 w-10 h-10 rounded-xl transition-all duration-200 shadow-md",
                                    !inputValue.trim() && "bg-gray-200 text-gray-400 hover:bg-gray-300"
                                )}
                            >
                                <Send className="w-5 h-5" />
                            </Button>
                        </form>
                        <div className="text-center mt-3">
                            <p className="text-[11px] text-muted-foreground">AI can make mistakes. Please verify important information.</p>
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    if (isEmbedded) {
        return (
            <Card
                className={cn("w-full h-[600px] shadow-sm flex flex-col border border-border/50 rounded-xl overflow-hidden bg-white", className)}
                style={style}
            >
                {/* Header */}
                <div
                    className="p-4 flex items-center justify-between text-white shrink-0 relative overflow-hidden"
                    style={{
                        background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`
                    }}
                >
                    <div className="absolute inset-0 bg-black/5" />
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm overflow-hidden w-9 h-9 flex items-center justify-center">
                            {config.ui.iconType === 'custom' && config.ui.customIconUrl ? (
                                <img
                                    src={config.ui.customIconUrl}
                                    alt="Bot"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Sparkles className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-base leading-tight">AI Assistant</h3>
                            <p className="text-[11px] font-medium opacity-90">Powered by {config.modelName || 'Gemini'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 relative z-10">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                            onClick={resetChat}
                            title="Reset Session"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Messages */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 scroll-smooth"
                >
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                            <Bot className="w-8 h-8 opacity-20" />
                            <p className="text-sm">Start a conversation to test the configuration.</p>
                        </div>
                    )}
                    {messages.map((msg, idx) => {
                        const { cleanContent, dynamicReplies } = msg.role === 'model' ? parseContent(msg.parts) : { cleanContent: msg.parts, dynamicReplies: [] };
                        const isLastMessage = idx === messages.length - 1;

                        return (
                            <div
                                key={idx}
                                className={cn(
                                    "flex flex-col gap-1 max-w-[85%]",
                                    msg.role === 'user' ? "ml-auto items-end" : "items-start"
                                )}
                            >
                                <div className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}>
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-white",
                                        msg.role === 'user' ? "bg-white" : "bg-gradient-to-br from-blue-50 to-indigo-50"
                                    )}>
                                        {msg.role === 'user'
                                            ? <User className="w-4 h-4 text-gray-600" />
                                            : <Bot className="w-4 h-4 text-blue-600" />
                                        }
                                    </div>
                                    <div className={cn(
                                        "p-3.5 px-4 rounded-3xl text-sm shadow-sm leading-relaxed",
                                        msg.role === 'user'
                                            ? "bg-blue-600 text-white rounded-tr-sm"
                                            : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm"
                                    )}>
                                        {msg.role === 'model' ? (
                                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-6">
                                                <AIMessageRenderer
                                                    response={parseAIResponse(cleanContent)}
                                                    onAction={(action, data) => {
                                                        // Handle action button clicks and form submissions
                                                        const message = data
                                                            ? `Execute ${action} with: ${JSON.stringify(data)}`
                                                            : action;
                                                        handleSendMessage(undefined, message);
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <p className="whitespace-pre-wrap">{cleanContent}</p>
                                        )}
                                        {msg.timestamp && (
                                            <p className={cn(
                                                "text-[10px] mt-1 text-right opacity-70",
                                                msg.role === 'user' ? "text-blue-100" : "text-gray-400"
                                            )}>
                                                {formatTime(msg.timestamp)}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Render Dynamic Quick Replies for the LAST AI message */}
                                {isLastMessage && msg.role === 'model' && dynamicReplies.length > 0 && (
                                    <div className="grid grid-cols-1 gap-2 mt-2 px-1 pl-12 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <p className="text-xs text-gray-400 mb-1 ml-1">Suggested:</p>
                                        {dynamicReplies.map((reply: string, rIdx: number) => (
                                            <button
                                                key={rIdx}
                                                onClick={() => handleSendMessage(undefined, reply)}
                                                className={cn(
                                                    "text-left p-2.5 px-4 rounded-xl text-sm transition-all shadow-sm border border-blue-100/50 hover:shadow-md hover:border-blue-200 bg-white text-gray-700 hover:text-blue-600 active:scale-[0.98]",
                                                    "flex items-center justify-between group"
                                                )}
                                            >
                                                <span>{reply}</span>
                                                <Send className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Quick Replies */}
                    {config.ui.quickReplies && Array.isArray(config.ui.quickReplies) && config.ui.quickReplies.length > 0 && !messages.some(m => m.role === 'user') && (
                        <div className="grid grid-cols-1 gap-2 mt-4 px-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <p className="text-xs text-center text-gray-400 mb-2">Suggested options</p>
                            {config.ui.quickReplies.map((reply, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSendMessage(undefined, reply)}
                                    className={cn(
                                        "text-left p-3 px-4 rounded-xl text-sm transition-all shadow-sm border border-blue-100/50 hover:shadow-md hover:border-blue-200 bg-white text-gray-700 hover:text-blue-600 active:scale-[0.98]",
                                        "flex items-center justify-between group"
                                    )}
                                >
                                    <span>{reply}</span>
                                    <Send className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    )}

                    {isTyping && (
                        <div className="flex gap-3 max-w-[85%]">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm overflow-hidden">
                                {config.ui.iconType === 'custom' && config.ui.customIconUrl ? (
                                    <img
                                        src={config.ui.customIconUrl}
                                        alt="Bot"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Bot className="w-4 h-4 text-blue-600" />
                                )}
                            </div>
                            <div className="bg-white border border-gray-100 text-gray-800 p-4 rounded-3xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-[46px]">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <form
                        onSubmit={handleSendMessage}
                        className="flex items-center gap-2 relative"
                    >
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Ask something..."
                            className="h-11 pl-4 pr-12 rounded-full border-gray-200 bg-gray-50 focus:bg-white transition-colors focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-blue-500"
                            disabled={isTyping}
                        />
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!inputValue.trim() || isTyping}
                            style={{ backgroundColor: inputValue.trim() ? themeColor : undefined }}
                            className={cn(
                                "absolute right-1 w-9 h-9 rounded-full transition-all duration-200",
                                !inputValue.trim() && "bg-gray-200 text-gray-400 hover:bg-gray-300"
                            )}
                        >
                            <Send className="w-4 h-4 ml-0.5" />
                        </Button>
                    </form>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-muted-foreground">AI can make mistakes. Please verify important info.</p>
                    </div>
                </div>
            </Card>
        );
    }



    return (
        <div className={cn(
            "fixed bottom-6 z-50 flex flex-col gap-4 font-sans",
            isLeft ? "left-6" : "right-6",
            className
        )} style={style}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        <Card className="w-[360px] sm:w-[400px] h-[600px] shadow-2xl overflow-hidden flex flex-col border border-border/50 ring-1 ring-black/5 rounded-2xl">
                            {/* Header */}
                            <div
                                className="p-4 flex items-center justify-between text-white shrink-0 relative overflow-hidden"
                                style={{
                                    background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`
                                }}
                            >
                                <div className="absolute inset-0 bg-black/5" />
                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm overflow-hidden w-9 h-9 flex items-center justify-center">
                                        {config.ui.iconType === 'custom' && config.ui.customIconUrl ? (
                                            <img
                                                src={config.ui.customIconUrl}
                                                alt="Bot"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Sparkles className="w-5 h-5 text-white" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-base leading-tight">AI Assistant</h3>
                                        <p className="text-[11px] font-medium opacity-90">Powered by {config.modelName || 'Gemini'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 relative z-10">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                                        onClick={resetChat}
                                        title="Clear history"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                                        onClick={toggleOpen}
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div
                                ref={chatContainerRef}
                                className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 scroll-smooth"
                            >
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
                                        <Bot className="w-8 h-8 opacity-20" />
                                        <p className="text-sm">Start a conversation to test the configuration.</p>
                                    </div>
                                )}
                                {messages.map((msg, idx) => {
                                    const { cleanContent, dynamicReplies } = msg.role === 'model' ? parseContent(msg.parts) : { cleanContent: msg.parts, dynamicReplies: [] };
                                    const isLastMessage = idx === messages.length - 1;

                                    return (
                                        <div key={idx} className="flex flex-col gap-2">
                                            <div
                                                className={cn(
                                                    "flex gap-3 max-w-[85%]",
                                                    msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-white overflow-hidden",
                                                    msg.role === 'user' ? "bg-white" : "bg-gradient-to-br from-blue-50 to-indigo-50"
                                                )}>
                                                    {msg.role === 'user' ? (
                                                        <User className="w-4 h-4 text-gray-600" />
                                                    ) : (
                                                        config.ui.iconType === 'custom' && config.ui.customIconUrl ? (
                                                            <img
                                                                src={config.ui.customIconUrl}
                                                                alt="Bot"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <Bot className="w-4 h-4 text-blue-600" />
                                                        )
                                                    )}
                                                </div>
                                                <div className={cn(
                                                    "p-3.5 px-4 rounded-3xl text-sm shadow-sm leading-relaxed",
                                                    msg.role === 'user'
                                                        ? "bg-blue-600 text-white rounded-tr-sm"
                                                        : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm"
                                                )}>
                                                    {msg.role === 'model' ? (
                                                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-6">
                                                            <AIMessageRenderer
                                                                response={parseAIResponse(cleanContent)}
                                                                onAction={(action, data) => {
                                                                    const message = data
                                                                        ? `Execute ${action} with: ${JSON.stringify(data)}`
                                                                        : action;
                                                                    handleSendMessage(undefined, message);
                                                                }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <p className="whitespace-pre-wrap">{cleanContent}</p>
                                                    )}
                                                    {msg.timestamp && (
                                                        <p className={cn(
                                                            "text-[10px] mt-1 text-right opacity-70",
                                                            msg.role === 'user' ? "text-blue-100" : "text-gray-400"
                                                        )}>
                                                            {formatTime(msg.timestamp)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Render Dynamic Quick Replies for the LAST AI message */}
                                            {isLastMessage && msg.role === 'model' && dynamicReplies.length > 0 && (
                                                <div className="grid grid-cols-1 gap-2 mt-2 px-1 pl-12 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                    <p className="text-xs text-gray-400 mb-1 ml-1">Suggested:</p>
                                                    {dynamicReplies.map((reply: string, rIdx: number) => (
                                                        <button
                                                            key={rIdx}
                                                            onClick={() => handleSendMessage(undefined, reply)}
                                                            className={cn(
                                                                "text-left p-2.5 px-4 rounded-xl text-sm transition-all shadow-sm border border-blue-100/50 hover:shadow-md hover:border-blue-200 bg-white text-gray-700 hover:text-blue-600 active:scale-[0.98]",
                                                                "flex items-center justify-between group"
                                                            )}
                                                        >
                                                            <span>{reply}</span>
                                                            <Send className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Static Quick Replies (Show if no USER messages have been sent yet) */}
                                {messages.filter(m => m.role === 'user').length === 0 && config.ui.quickReplies && Array.isArray(config.ui.quickReplies) && config.ui.quickReplies.length > 0 && (
                                    <div className="grid grid-cols-1 gap-2 mt-4 px-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        <p className="text-xs text-center text-gray-400 mb-2">Suggested options</p>
                                        {config.ui.quickReplies.map((reply, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSendMessage(undefined, reply)}
                                                className={cn(
                                                    "text-left p-3 px-4 rounded-xl text-sm transition-all shadow-sm border border-blue-100/50 hover:shadow-md hover:border-blue-200 bg-white text-gray-700 hover:text-blue-600 active:scale-[0.98]",
                                                    "flex items-center justify-between group"
                                                )}
                                            >
                                                <span>{reply}</span>
                                                <Send className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {isTyping && (
                                    <div className="flex gap-3 max-w-[85%]">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm overflow-hidden">
                                            {config.ui.iconType === 'custom' && config.ui.customIconUrl ? (
                                                <img
                                                    src={config.ui.customIconUrl}
                                                    alt="Bot"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Bot className="w-4 h-4 text-blue-600" />
                                            )}
                                        </div>
                                        <div className="bg-white border border-gray-100 text-gray-800 p-4 rounded-3xl rounded-tl-sm shadow-sm flex items-center gap-1.5 h-[46px]">
                                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input */}
                            <div className="p-4 bg-white border-t border-gray-100">
                                <form
                                    onSubmit={handleSendMessage}
                                    className="flex items-center gap-2 relative"
                                >
                                    <Input
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder="Ask something..."
                                        className="h-11 pl-4 pr-12 rounded-full border-gray-200 bg-gray-50 focus:bg-white transition-colors focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:border-blue-500"
                                        ref={inputRef}
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        disabled={!inputValue.trim() || isTyping}
                                        style={{ backgroundColor: inputValue.trim() ? themeColor : undefined }}
                                        className={cn(
                                            "absolute right-1 w-9 h-9 rounded-full transition-all duration-200",
                                            !inputValue.trim() && "bg-gray-200 text-gray-400 hover:bg-gray-300"
                                        )}
                                    >
                                        <Send className="w-4 h-4 ml-0.5" />
                                    </Button>
                                </form>
                                <div className="text-center mt-2">
                                    <p className="text-[10px] text-muted-foreground">AI can make mistakes. Please verify important info.</p>
                                </div>
                            </div>
                        </Card>

                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleOpen}
                className={cn(
                    "h-14 w-14 rounded-full shadow-lg shadow-blue-900/20 flex items-center justify-center text-white transition-all hover:shadow-xl overflow-hidden",
                    isOpen ? "rotate-90 opacity-0 pointer-events-none absolute" : "opacity-100"
                )}
                style={{ backgroundColor: themeColor }}
            >
                <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse" />
                {config.ui.iconType === 'custom' && config.ui.customIconUrl ? (
                    <img
                        src={config.ui.customIconUrl}
                        alt="Chat"
                        className="w-full h-full object-cover relative z-10"
                    />
                ) : (
                    <MessageCircle className="w-7 h-7 relative z-10" />
                )}
            </motion.button>
        </div >
    );
}
