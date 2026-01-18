import ReactMarkdown from 'react-markdown';
import { useChatWidget } from '../hooks/useChatWidget';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card } from '../../../components/ui/card';
import { Sparkles, X, Send, Bot, User, MessageCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../components/ui/utils';

export interface ChatWidgetProps {
    variant?: 'floating' | 'embedded';
    className?: string;
    style?: React.CSSProperties;
}

export function ChatWidget({ variant = 'floating', className, style }: ChatWidgetProps) {
    const { isAuthenticated } = useAuth();
    const {
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
    } = useChatWidget();

    // Only show if user is logged in AND config is loaded + enabled
    // For embedded mode, we might want to bypass the 'enabled' check to allow testing even if disabled globally? 
    // But typically live testing tests the *current* config, so if it's disabled, it might show disabled.
    // However, for admin testing, it's better to always show.
    // Let's stick to strict config first for consistency, or maybe loose check for embedded.
    // User request: "Test your AI configuration... Save configuration first to see changes."
    if (!isAuthenticated || !config) return null;
    if (variant === 'floating' && !config.enabled) return null;

    const isLeft = config.ui.position === 'left';
    const themeColor = config.ui.themeColor || '#0ea5e9';
    const isEmbedded = variant === 'embedded';

    // If embedded, always open. If floating, use isOpen state.
    // const showWidget = isEmbedded || isOpen;

    const formatTime = (timestamp?: number) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

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
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "flex gap-3 max-w-[85%]",
                                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                            )}
                        >
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
                                        <ReactMarkdown>{msg.parts}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="whitespace-pre-wrap">{msg.parts}</p>
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
                    ))}

                    {/* Quick Replies */}
                    {config.ui.quickReplies && config.ui.quickReplies.length > 0 && messages.length <= 1 && (
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
                                {messages.map((msg, idx) => (
                                    <div
                                        key={idx}
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
                                                    <ReactMarkdown>{msg.parts}</ReactMarkdown>
                                                </div>
                                            ) : (
                                                <p className="whitespace-pre-wrap">{msg.parts}</p>
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
                                ))}
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
