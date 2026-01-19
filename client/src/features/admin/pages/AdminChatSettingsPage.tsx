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
import { Bot, Save, Loader2, Sparkles, Plus, X, MessageSquarePlus, Info, RotateCcw } from 'lucide-react';
import { ChatWidget } from '../../chat-widget/components/ChatWidget';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';

export function AdminChatSettingsPage() {
    const [config, setConfig] = useState<ChatWidgetConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newReply, setNewReply] = useState('');
    const [defaults, setDefaults] = useState<Record<string, string> | null>(null);

    useEffect(() => {
        loadConfig();
        loadDefaults();
    }, []);

    useEffect(() => {
        // Auto-fill defaults when both config and defaults are loaded
        if (config && defaults) {
            const updated = { ...config };
            let hasChanges = false;

            // Auto-fill empty role prompts with defaults
            const roles = ['MANAGER', 'ANNOTATOR', 'REVIEWER', 'ADMIN'] as const;
            roles.forEach(role => {
                if (!updated.rolePrompts?.[role] && defaults[role]) {
                    if (!updated.rolePrompts) updated.rolePrompts = {};
                    updated.rolePrompts[role] = defaults[role];
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                setConfig(updated);
            }
        }
    }, [config, defaults]);

    const loadConfig = async () => {
        try {
            const data = await chatSettingsApi.getConfig();
            // Ensure rolePrompts is initialized
            setConfig({
                ...data,
                rolePrompts: data.rolePrompts || {}
            });
        } catch (error) {
            toast.error('Failed to load chat settings');
        } finally {
            setIsLoading(false);
        }
    };

    const loadDefaults = async () => {
        try {
            const response = await chatSettingsApi.getDefaultPrompts();
            setDefaults(response);
        } catch (error) {
            console.error('[Admin] Failed to load default prompts:', error);
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

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="role-prompts">Role Prompts</TabsTrigger>
                    <TabsTrigger value="knowledge-base">Knowledge Base</TabsTrigger>
                    <TabsTrigger value="appearance">Appearance</TabsTrigger>
                    <TabsTrigger value="testing">Testing</TabsTrigger>
                </TabsList>

                {/* TAB 1: TESTING */}
                <TabsContent value="testing" className="space-y-6">
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
                            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                                <div className="text-sm text-amber-800">
                                    <strong>Important:</strong> Click <strong>"Save Changes"</strong> button above before testing to apply your configuration changes (Role Prompts, Knowledge Base, etc.).
                                </div>
                            </div>
                            <div className="bg-slate-100 rounded-xl p-6">
                                <ChatWidget variant="embedded" className="w-full shadow-xl" />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: GENERAL */}
                <TabsContent value="general" className="space-y-6">
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
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 3: ROLE PROMPTS */}
                <TabsContent value="role-prompts" className="space-y-6">
                    {/* Role-Specific Prompts */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-500" />
                                Role-Based Prompts
                                <Tooltip>
                                    <TooltipTrigger><Info className="w-4 h-4 text-gray-400" /></TooltipTrigger>
                                    <TooltipContent className="max-w-[350px]">
                                        <p>Customize AI prompts for each user role. Leave empty to use built-in defaults from <code>rolePrompts.ts</code>.</p>
                                        <p className="mt-2 text-xs text-gray-400">Priority: Custom role prompt &gt; Global System Prompt &gt; Default</p>
                                    </TooltipContent>
                                </Tooltip>
                            </CardTitle>
                            <CardDescription>
                                Edit prompts for MANAGER, ANNOTATOR, REVIEWER, and ADMIN roles separately.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="MANAGER" className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="MANAGER">Manager</TabsTrigger>
                                    <TabsTrigger value="ANNOTATOR">Annotator</TabsTrigger>
                                    <TabsTrigger value="REVIEWER">Reviewer</TabsTrigger>
                                    <TabsTrigger value="ADMIN">Admin</TabsTrigger>
                                </TabsList>

                                {/* MANAGER Tab */}
                                <TabsContent value="MANAGER" className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="manager-prompt" className="text-sm font-medium">Custom MANAGER Prompt</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => setConfig({
                                                    ...config!,
                                                    rolePrompts: { ...config!.rolePrompts, MANAGER: defaults?.MANAGER || '' }
                                                })}
                                                disabled={!defaults}
                                            >
                                                <RotateCcw className="w-3 h-3 mr-1" />
                                                Reset to Default
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => setConfig({
                                                    ...config!,
                                                    rolePrompts: { ...config!.rolePrompts, MANAGER: '' }
                                                })}
                                            >
                                                <X className="w-3 h-3 mr-1" />
                                                Clear
                                            </Button>
                                        </div>
                                    </div>
                                    <Textarea
                                        id="manager-prompt"
                                        value={config.rolePrompts?.MANAGER || ''}
                                        onChange={(e) => setConfig({
                                            ...config!,
                                            rolePrompts: { ...config!.rolePrompts, MANAGER: e.target.value }
                                        })}
                                        placeholder="Leave empty to use default MANAGER prompt (project management, task assignment, exports...)"
                                        className="min-h-[350px] font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        💡 Default: Guides managers on creating projects, assigning tasks, monitoring progress, and exporting datasets.
                                    </p>
                                </TabsContent>

                                {/* ANNOTATOR Tab */}
                                <TabsContent value="ANNOTATOR" className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="annotator-prompt" className="text-sm font-medium">Custom ANNOTATOR Prompt</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => setConfig({
                                                    ...config!,
                                                    rolePrompts: { ...config!.rolePrompts, ANNOTATOR: defaults?.ANNOTATOR || '' }
                                                })}
                                                disabled={!defaults}
                                            >
                                                <RotateCcw className="w-3 h-3 mr-1" />
                                                Reset to Default
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => setConfig({
                                                    ...config!,
                                                    rolePrompts: { ...config!.rolePrompts, ANNOTATOR: '' }
                                                })}
                                            >
                                                <X className="w-3 h-3 mr-1" />
                                                Clear
                                            </Button>
                                        </div>
                                    </div>
                                    <Textarea
                                        id="annotator-prompt"
                                        value={config.rolePrompts?.ANNOTATOR || ''}
                                        onChange={(e) => setConfig({
                                            ...config!,
                                            rolePrompts: { ...config!.rolePrompts, ANNOTATOR: e.target.value }
                                        })}
                                        placeholder="Leave empty to use default ANNOTATOR prompt (annotation tools, keyboard shortcuts, best practices...)"
                                        className="min-h-[350px] font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        💡 Default: Teaches annotation canvas, keyboard shortcuts (1-9, Delete, Ctrl+Z), bbox accuracy tips.
                                    </p>
                                </TabsContent>

                                {/* REVIEWER Tab */}
                                <TabsContent value="REVIEWER" className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="reviewer-prompt" className="text-sm font-medium">Custom REVIEWER Prompt</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => setConfig({
                                                    ...config!,
                                                    rolePrompts: { ...config!.rolePrompts, REVIEWER: defaults?.REVIEWER || '' }
                                                })}
                                                disabled={!defaults}
                                            >
                                                <RotateCcw className="w-3 h-3 mr-1" />
                                                Reset to Default
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => setConfig({
                                                    ...config!,
                                                    rolePrompts: { ...config!.rolePrompts, REVIEWER: '' }
                                                })}
                                            >
                                                <X className="w-3 h-3 mr-1" />
                                                Clear
                                            </Button>
                                        </div>
                                    </div>
                                    <Textarea
                                        id="reviewer-prompt"
                                        value={config.rolePrompts?.REVIEWER || ''}
                                        onChange={(e) => setConfig({
                                            ...config!,
                                            rolePrompts: { ...config!.rolePrompts, REVIEWER: e.target.value }
                                        })}
                                        placeholder="Leave empty to use default REVIEWER prompt (quality control, approval workflow, feedback guidelines...)"
                                        className="min-h-[350px] font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        💡 Default: Covers review workflow, quality checklist (IoU &gt; 0.7, completeness), constructive feedback techniques.
                                    </p>
                                </TabsContent>

                                {/* ADMIN Tab */}
                                <TabsContent value="ADMIN" className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="admin-prompt" className="text-sm font-medium">Custom ADMIN Prompt</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => setConfig({
                                                    ...config!,
                                                    rolePrompts: { ...config!.rolePrompts, ADMIN: defaults?.ADMIN || '' }
                                                })}
                                                disabled={!defaults}
                                            >
                                                <RotateCcw className="w-3 h-3 mr-1" />
                                                Reset to Default
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => setConfig({
                                                    ...config!,
                                                    rolePrompts: { ...config!.rolePrompts, ADMIN: '' }
                                                })}
                                            >
                                                <X className="w-3 h-3 mr-1" />
                                                Clear
                                            </Button>
                                        </div>
                                    </div>
                                    <Textarea
                                        id="admin-prompt"
                                        value={config.rolePrompts?.ADMIN || ''}
                                        onChange={(e) => setConfig({
                                            ...config!,
                                            rolePrompts: { ...config!.rolePrompts, ADMIN: e.target.value }
                                        })}
                                        placeholder="Leave empty to use default ADMIN prompt (system config, security monitoring, user management...)"
                                        className="min-h-[350px] font-mono text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        💡 Default: Focuses on user/role management, security best practices, audit logs, API key rotation, troubleshooting.
                                    </p>
                                </TabsContent>
                            </Tabs>

                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                                <div className="flex gap-2 text-sm text-blue-900 dark:text-blue-100">
                                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                    <div className="space-y-1">
                                        <p><strong>How it works:</strong></p>
                                        <ul className="list-disc list-inside space-y-1 text-xs">
                                            <li>Empty fields → Use hardcoded defaults from <code className="text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">rolePrompts.ts</code></li>
                                            <li>Custom role prompts override global "System Prompt" above</li>
                                            <li>Knowledge Base content is appended to all prompts</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 4: KNOWLEDGE BASE */}
                <TabsContent value="knowledge-base" className="space-y-6">
                    {/* Knowledge Base */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bot className="w-5 h-5 text-blue-500" />
                                Knowledge Base
                                <Tooltip>
                                    <TooltipTrigger><Info className="w-4 h-4 text-gray-400" /></TooltipTrigger>
                                    <TooltipContent className="max-w-[350px]">
                                        <p>Add documentation, FAQs, or system guides. This content will be automatically appended to system prompts for all users.</p>
                                        <p className="mt-2 text-xs text-gray-400">Note: Leave System Prompt empty to use role-based prompts (MANAGER, ANNOTATOR, REVIEWER, ADMIN).</p>
                                    </TooltipContent>
                                </Tooltip>
                            </CardTitle>
                            <CardDescription>
                                Provide documentation or context to help the AI better understand your V-Label system.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2">
                                <Textarea
                                    value={config.knowledgeBase || ''}
                                    onChange={(e) => setConfig({ ...config, knowledgeBase: e.target.value })}
                                    className="min-h-[400px] font-mono text-sm"
                                    placeholder={`# V-Label Platform Documentation

## Workflows
- **Project Creation**: Manager creates project → uploads images → assigns labels → assigns annotators
- **Consensus Labeling**: Minimum 2 annotators per image for quality assurance
- **Review Process**: Reviewers approve/reject submissions, provide feedback

## Common Questions
Q: Why do I need 2 annotators per image?
A: Consensus labeling improves quality through inter-annotator agreement

Q: How to export dataset?
A: Projects → Select Project → Export → Choose format (YOLO/COCO)

## Tips
- Average annotation speed: 30-50 images/day per annotator
- YOLO format recommended for object detection training
- Check inter-annotator agreement score before export`}
                                />
                                <div className="flex gap-2 text-xs text-muted-foreground items-start">
                                    <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                    <div className="space-y-1">
                                        <p>💡 <strong>Tip:</strong> Paste content from <code className="text-xs bg-gray-100 px-1 rounded">docs/01_business.md</code> and <code className="text-xs bg-gray-100 px-1 rounded">docs/02_requirements.md</code></p>
                                        <p>🎯 <strong>Role-Based Prompts:</strong> Leave "System Prompt" empty above to use built-in role prompts (MANAGER, ANNOTATOR, REVIEWER, ADMIN). Knowledge Base will be appended to all prompts.</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 5: APPEARANCE */}
                <TabsContent value="appearance" className="space-y-6">
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
                </TabsContent>
            </Tabs>
        </div >
    );
}
