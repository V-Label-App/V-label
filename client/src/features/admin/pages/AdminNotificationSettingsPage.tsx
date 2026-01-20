import { useState, useEffect } from 'react';
import { notificationTemplateApi, type NotificationTemplate } from '../../../services/notificationTemplate.api';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Switch } from '../../../components/ui/switch';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Edit2, Loader2, Send, Search } from 'lucide-react';
import { toast } from 'sonner';

export function AdminNotificationSettingsPage() {
    const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Announcement State
    const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
    const [announcementData, setAnnouncementData] = useState({ title: '', message: '' });
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setIsLoading(true);
            const data = await notificationTemplateApi.getAll();
            setTemplates(data);
        } catch (error) {
            console.error('Failed to load templates:', error);
            toast.error('Failed to load notification templates');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (template: NotificationTemplate) => {
        setEditingTemplate({ ...template });
    };

    const handleSave = async () => {
        if (!editingTemplate) return;

        try {
            setIsSaving(true);
            const updated = await notificationTemplateApi.update(editingTemplate.type, {
                titleTemplate: editingTemplate.titleTemplate,
                messageTemplate: editingTemplate.messageTemplate,
                isActive: editingTemplate.isActive,
            });

            setTemplates(prev => prev.map(t => t.type === updated.type ? updated : t));
            setEditingTemplate(null);
            toast.success('Template updated successfully');
        } catch (error) {
            console.error('Failed to update template:', error);
            toast.error('Failed to update template');
        } finally {
            setIsSaving(false);
        }
    };

    const handleBroadcast = async () => {
        if (!announcementData.title || !announcementData.message) {
            toast.error('Please enter both title and message');
            return;
        }

        try {
            setIsBroadcasting(true);
            const result = await notificationTemplateApi.broadcast(announcementData);
            toast.success(`Announcement sent to ${result.count} users`);
            setIsAnnouncementOpen(false);
            setAnnouncementData({ title: '', message: '' });
        } catch (error) {
            console.error('Failed to broadcast:', error);
            toast.error('Failed to send announcement');
        } finally {
            setIsBroadcasting(false);
        }
    };

    const handleVariableClick = (variable: string) => {
        if (!editingTemplate) return;
        toast.info(`Copied {${variable}} to clipboard`);
        navigator.clipboard.writeText(`{${variable}}`);
    };

    const getCategoryColor = (type: string) => {
        const typeUpper = type.toUpperCase();
        if (typeUpper.includes('TASK')) return 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200';
        if (typeUpper.includes('SYSTEM')) return 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200';
        if (typeUpper.includes('USER') || typeUpper.includes('AUTH')) return 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200';
        if (typeUpper.includes('WARNING') || typeUpper.includes('DEADLINE')) return 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200';
        if (typeUpper.includes('ERROR') || typeUpper.includes('REJECTED')) return 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const filteredTemplates = templates.filter(t =>
        t.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.titleTemplate.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-black bg-clip-text text-transparent">
                        Notification Manager
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure system templates and broadcast announcements.
                    </p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <Button onClick={() => setIsAnnouncementOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm">
                        <Send className="h-4 w-4" />
                        Announcement
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Search templates..."
                            className="pl-9 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="text-sm text-gray-500 font-medium">
                        {filteredTemplates.length} templates found
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[250px]">Type</TableHead>
                                    <TableHead className="w-[300px]">Title Pattern</TableHead>
                                    <TableHead>Message Pattern</TableHead>
                                    <TableHead className="w-[100px] text-center">Status</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTemplates.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                                            No templates found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTemplates.map(template => (
                                        <TableRow key={template.id} className="hover:bg-gray-50/50 transition-colors">
                                            <TableCell className="font-medium">
                                                <Badge
                                                    variant="secondary"
                                                    className={`uppercase tracking-wider text-[10px] font-bold px-2 py-0.5 border ${getCategoryColor(template.type)}`}
                                                >
                                                    {formatType(template.type)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-gray-700">
                                                {template.titleTemplate}
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500 max-w-md">
                                                <div className="truncate" title={template.messageTemplate}>
                                                    {template.messageTemplate}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {template.isActive ? (
                                                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                                                        Active
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-50 text-gray-600 text-xs font-medium border border-gray-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5"></span>
                                                        Inactive
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(template)}
                                                    className="h-8 w-8 text-gray-500 hover:text-purple-600 hover:bg-purple-50"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Announcement Dialog */}
            <Dialog open={isAnnouncementOpen} onOpenChange={setIsAnnouncementOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Send System Announcement</DialogTitle>
                        <DialogDescription>
                            Send a real-time notification to all active users.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="announcement-title">Title</Label>
                            <Input
                                id="announcement-title"
                                placeholder="e.g., System Maintenance"
                                value={announcementData.title}
                                onChange={(e) => setAnnouncementData({ ...announcementData, title: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="announcement-message">Message</Label>
                            <Textarea
                                id="announcement-message"
                                placeholder="e.g., The system will be down for maintenance at 5 PM."
                                value={announcementData.message}
                                onChange={(e) => setAnnouncementData({ ...announcementData, message: e.target.value })}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAnnouncementOpen(false)}>Cancel</Button>
                        <Button onClick={handleBroadcast} disabled={isBroadcasting} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isBroadcasting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Now
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Edit Template
                            {editingTemplate && (
                                <Badge variant="secondary" className="text-xs font-normal bg-gray-100 text-gray-500">
                                    {formatType(editingTemplate.type)}
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Configure the notification content. Click variables to copy.
                        </DialogDescription>
                    </DialogHeader>

                    {editingTemplate && (
                        <div className="grid gap-4 py-4">
                            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <Switch
                                    id="active-mode"
                                    checked={editingTemplate.isActive}
                                    onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, isActive: checked })}
                                />
                                <Label htmlFor="active-mode" className="cursor-pointer">Enable Notification</Label>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="title">Title Template</Label>
                                <Input
                                    id="title"
                                    value={editingTemplate.titleTemplate}
                                    onChange={(e) => setEditingTemplate({ ...editingTemplate, titleTemplate: e.target.value })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="message">Message Template</Label>
                                <Textarea
                                    id="message"
                                    value={editingTemplate.messageTemplate}
                                    onChange={(e) => setEditingTemplate({ ...editingTemplate, messageTemplate: e.target.value })}
                                    rows={4}
                                />
                            </div>

                            <div>
                                <Label className="mb-2 block text-xs font-medium text-gray-500 uppercase tracking-wider">Available Variables</Label>
                                <div className="flex flex-wrap gap-2">
                                    {editingTemplate.variables.map(variable => (
                                        <Badge
                                            key={variable}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 transition-all active:scale-95"
                                            onClick={() => handleVariableClick(variable)}
                                        >
                                            {`{${variable}}`}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function formatType(type: string) {
    return type.replace(/_/g, ' ');
}
