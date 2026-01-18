import { useState, useEffect } from 'react';
import { chatSettingsApi, type ChatWidgetConfig } from '../../../services/chatSettings.api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';
import { Bot, Save, Loader2, Sparkles, RotateCcw, Plus, X, MessageSquarePlus, Info } from 'lucide-react';
import { ChatWidget } from '../../chat-widget/components/ChatWidget';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip';

export function AdminChatSettingsPage() {
    const [config, setConfig] = useState<ChatWidgetConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newReply, setNewReply] = useState('');

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const data = await chatSettingsApi.getConfig();
            setConfig(data);
        } catch (error) {
            toast.error('Failed to load chat settings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!config) return;
        setIsSaving(true);
        try {
            const updated = await chatSettingsApi.updateConfig(config);
            setConfig(updated);
            toast.success('Configuration saved successfully');
            // Notify chat widgets to reload config (cross-tab)
            const channel = new BroadcastChannel('chat_widget_channel');
            channel.postMessage({ type: 'config_updated' });
            channel.close();
        } catch (error) {
            toast.error('Failed to update chat settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !config) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">AI Chat Configuration</h2>
                    <p className="text-muted-foreground">Manage the global AI Assistant settings.</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>

            <div className="grid gap-6">
                {/* Master Toggle */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                                Enable Chat Widget
                                <Tooltip>
                                    <TooltipTrigger><Info className="w-4 h-4 text-gray-400" /></TooltipTrigger>
                                    <TooltipContent>Toggle the visibility of the chat widget for all users.</TooltipContent>
                                </Tooltip>
                            </CardTitle>
                            <CardDescription>
                                Turn the AI chat assistant on or off for all users.
                            </CardDescription>
                        </div>
                        <Switch
                            checked={config.enabled}
                            onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                        />
                    </CardHeader>
                </Card>

                {/* AI Model Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-500" />
                            AI Model Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="modelName">Model Selection</Label>
                                <Tooltip>
                                    <TooltipTrigger><Info className="w-4 h-4 text-gray-400" /></TooltipTrigger>
                                    <TooltipContent>The AI model version used to generate responses.</TooltipContent>
                                </Tooltip>
                            </div>
                            <Select
                                value={config.modelName}
                                onValueChange={(value) => setConfig({ ...config, modelName: value })}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a model" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (Best Quality)</SelectItem>
                                    <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash (Fast & Stable)</SelectItem>
                                    <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp (Experimental)</SelectItem>
                                    <SelectItem value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (Fastest)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="temperature">Temperature ({config.temperature})</Label>
                                <Tooltip>
                                    <TooltipTrigger><Info className="w-4 h-4 text-gray-400" /></TooltipTrigger>
                                    <TooltipContent>Controls creativity. Lower is precise, higher is random.</TooltipContent>
                                </Tooltip>
                            </div>
                            <input
                                id="temperature"
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                className="w-full accent-blue-600"
                                value={config.temperature}
                                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="systemPrompt">System Prompt</Label>
                                    <Tooltip>
                                        <TooltipTrigger><Info className="w-4 h-4 text-gray-400" /></TooltipTrigger>
                                        <TooltipContent className="max-w-[300px]">The core instructions that define the AI's personality and rules.</TooltipContent>
                                    </Tooltip>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => setConfig({
                                        ...config,
                                        systemPrompt: `# Role
You are the AI Assistant for V-Label, a professional data labeling platform. Your purpose is to help users manage projects, label data, and navigate the application efficiently.

# Core Capabilities
- **Project Management**: Explain how to create, edit, and manage labeling projects.
- **Labeling Support**: Guide users on how to use bounding boxes, polygons, and classification tools.
- **User Management**: Assist with role assignments (Admin, Manager, Annotator) and profile settings.
- **Troubleshooting**: Help resolve common issues like login failures or export errors.

# Tone & Style
- Professional, concise, and technical when necessary.
- Focus on actionable steps and platform-specific terminology.
- Be encouraging and helpful.`
                                    })}
                                >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Reset to Default
                                </Button>
                            </div>
                            <Textarea
                                id="systemPrompt"
                                value={config.systemPrompt}
                                onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                                className="h-64 font-mono text-sm"
                                placeholder="You are a helpful assistant..."
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* UI Customization */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-purple-500" />
                            Widget Appearance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Label>Welcome Message</Label>
                                <Tooltip>
                                    <TooltipTrigger><Info className="w-4 h-4 text-gray-400" /></TooltipTrigger>
                                    <TooltipContent>The first message displayed to different users.</TooltipContent>
                                </Tooltip>
                            </div>
                            <Input
                                value={config.ui.welcomeMessage}
                                onChange={(e) => setConfig({
                                    ...config,
                                    ui: { ...config.ui, welcomeMessage: e.target.value }
                                })}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Label>Theme Color</Label>
                                <Tooltip>
                                    <TooltipTrigger><Info className="w-4 h-4 text-gray-400" /></TooltipTrigger>
                                    <TooltipContent>Primary color for header and user messages.</TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    value={config.ui.themeColor}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        ui: { ...config.ui, themeColor: e.target.value }
                                    })}
                                    className="w-12 h-10 p-1"
                                />
                                <Input
                                    value={config.ui.themeColor}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        ui: { ...config.ui, themeColor: e.target.value }
                                    })}
                                    className="flex-1 font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Label>Position</Label>
                                <Tooltip>
                                    <TooltipTrigger><Info className="w-4 h-4 text-gray-400" /></TooltipTrigger>
                                    <TooltipContent>Where the floating button sits on the screen.</TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="position"
                                        checked={config.ui.position === 'left'}
                                        onChange={() => setConfig({ ...config, ui: { ...config.ui, position: 'left' } })}
                                    />
                                    Left
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="position"
                                        checked={config.ui.position === 'right'}
                                        onChange={() => setConfig({ ...config, ui: { ...config.ui, position: 'right' } })}
                                    />
                                    Right
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2 col-span-2">
                            <div className="flex items-center gap-2">
                                <Label>Icon Style</Label>
                                <Tooltip>
                                    <TooltipTrigger><Info className="w-4 h-4 text-gray-400" /></TooltipTrigger>
                                    <TooltipContent>Customize the chatbot avatar icon.</TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="flex flex-col gap-4 mt-1">
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="iconType"
                                            checked={config.ui.iconType !== 'custom'}
                                            onChange={() => setConfig({ ...config, ui: { ...config.ui, iconType: 'default' } })}
                                        />
                                        Default (Sparkles)
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="iconType"
                                            checked={config.ui.iconType === 'custom'}
                                            onChange={() => setConfig({ ...config, ui: { ...config.ui, iconType: 'custom' } })}
                                        />
                                        Custom URL
                                    </label>
                                </div>
                                {config.ui.iconType === 'custom' && (
                                    <div className="flex gap-4 items-center animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Input
                                            placeholder="https://example.com/icon.png"
                                            value={config.ui.customIconUrl || ''}
                                            onChange={(e) => setConfig({
                                                ...config,
                                                ui: { ...config.ui, customIconUrl: e.target.value }
                                            })}
                                            className="flex-1"
                                        />
                                        {config.ui.customIconUrl && (
                                            <div className="w-10 h-10 shrink-0 rounded-full overflow-hidden border border-gray-200">
                                                <img
                                                    src={config.ui.customIconUrl}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Reply Suggestions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquarePlus className="w-5 h-5 text-orange-500" />
                            Quick Reply Suggestions
                            <Tooltip>
                                <TooltipTrigger><Info className="w-4 h-4 text-gray-400" /></TooltipTrigger>
                                <TooltipContent>Pre-defined questions shown to users to start a conversation.</TooltipContent>
                            </Tooltip>
                        </CardTitle>
                        <CardDescription>
                            Options displayed to the user when they first start a conversation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Type a quick reply (e.g., 'How do I label images?')"
                                value={newReply}
                                onChange={(e) => setNewReply(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (newReply.trim()) {
                                            const currentReplies = config.ui.quickReplies || [];
                                            setConfig({
                                                ...config,
                                                ui: {
                                                    ...config.ui,
                                                    quickReplies: [...currentReplies, newReply.trim()]
                                                }
                                            });
                                            setNewReply('');
                                        }
                                    }
                                }}
                            />
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    if (newReply.trim()) {
                                        const currentReplies = config.ui.quickReplies || [];
                                        setConfig({
                                            ...config,
                                            ui: {
                                                ...config.ui,
                                                quickReplies: [...currentReplies, newReply.trim()]
                                            }
                                        });
                                        setNewReply('');
                                    }
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Option
                            </Button>
                        </div>

                        <div className="min-h-[60px] p-4 rounded-lg bg-slate-50 border border-dashed border-gray-200">
                            {(!config.ui.quickReplies || config.ui.quickReplies.length === 0) ? (
                                <div className="flex items-center justify-center h-full text-sm text-gray-400 italic">
                                    No quick reply suggestions configured.
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {config.ui.quickReplies.map((reply, index) => (
                                        <div
                                            key={index}
                                            className="group flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm shadow-sm hover:border-blue-300 transition-colors"
                                        >
                                            <span>{reply}</span>
                                            <button
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                onClick={() => {
                                                    const updated = config.ui.quickReplies.filter((_, i) => i !== index);
                                                    setConfig({
                                                        ...config,
                                                        ui: { ...config.ui, quickReplies: updated }
                                                    });
                                                }}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Live Testing */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-green-600" />
                            Live Testing
                        </CardTitle>
                        <CardDescription>
                            Test your AI configuration changes in real-time. Save configuration first to see changes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-slate-100 rounded-xl p-6">
                            <ChatWidget variant="embedded" className="w-full shadow-xl" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
