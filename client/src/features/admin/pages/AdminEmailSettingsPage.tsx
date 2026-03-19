import { useState, useEffect } from 'react';
import { adminApi, type EmailConfig, type EmailTemplate, type EmailLog } from '../../../services/admin.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { toast } from 'sonner';
import { Mail, Settings, FileText, History, Save, Plus, Trash2, Edit2, Loader2, Info, CheckCircle2, XCircle, WrapText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';

export function AdminEmailSettingsPage() {
    const [config, setConfig] = useState<EmailConfig | null>(null);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [logs, setLogs] = useState<EmailLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isClearingLogs, setIsClearingLogs] = useState(false);

    // Template Dialog
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Log Dialogs
    const [logToDelete, setLogToDelete] = useState<string | null>(null);
    const [isLogDeleteDialogOpen, setIsLogDeleteDialogOpen] = useState(false);
    const [isClearLogsDialogOpen, setIsClearLogsDialogOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [configData, templatesData, logsData] = await Promise.all([
                adminApi.getEmailConfig(),
                adminApi.getEmailTemplates(),
                adminApi.getEmailLogs()
            ]);
            setConfig(configData || { provider: 'smtp', config: {}, isActive: true });
            setTemplates(templatesData);
            setLogs(logsData);
        } catch (error) {
            toast.error('Failed to load email settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!config) return;
        setIsSaving(true);
        try {
            await adminApi.updateEmailConfig(config);
            toast.success('SMTP configuration saved');
        } catch (error) {
            toast.error('Failed to update SMTP settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpsertTemplate = async () => {
        if (!editingTemplate) return;
        try {
            const updated = await adminApi.upsertEmailTemplate(editingTemplate);
            setTemplates(prev => {
                const index = prev.findIndex(t => t.type === updated.type);
                if (index >= 0) {
                    const next = [...prev];
                    next[index] = updated;
                    return next;
                }
                return [...prev, updated];
            });
            toast.success('Template saved');
            setIsTemplateDialogOpen(false);
        } catch (error) {
            toast.error('Failed to save template');
        }
    };

    const handleDeleteTemplate = async () => {
        if (!templateToDelete) return;
        try {
            await adminApi.deleteEmailTemplate(templateToDelete);
            setTemplates(prev => prev.filter(t => t.type !== templateToDelete));
            toast.success('Template deleted');
            setIsDeleteDialogOpen(false);
            setTemplateToDelete(null);
        } catch (error) {
            toast.error('Failed to delete template');
        }
    };

    const handleDeleteLog = async () => {
        if (!logToDelete) return;
        try {
            await adminApi.deleteEmailLog(logToDelete);
            setLogs(prev => prev.filter(l => l.id !== logToDelete));
            toast.success('Log entry deleted');
            setIsLogDeleteDialogOpen(false);
            setLogToDelete(null);
        } catch (error) {
            toast.error('Failed to delete log entry');
        }
    };

    const handleClearLogs = async () => {
        setIsClearLogsDialogOpen(false);
        setIsClearingLogs(true);
        try {
            await adminApi.clearEmailLogs();
            setLogs([]);
            toast.success('All logs cleared successfully');
        } catch (error) {
            toast.error('Failed to clear logs');
        } finally {
            setIsClearingLogs(false);
        }
    };

    if (loading) {
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
                    <h2 className="text-2xl font-bold tracking-tight">Email & Notifications</h2>
                    <p className="text-muted-foreground">Configure SMTP settings, customize templates, and monitor email delivery.</p>
                </div>
            </div>

            <Tabs defaultValue="smtp" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                    <TabsTrigger value="smtp" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        SMTP Settings
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Email Templates
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Delivery Logs
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="smtp">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-600">
                                <Mail className="w-5 h-5" />
                                SMTP Configuration
                            </CardTitle>
                            <CardDescription>
                                Set up your email server credentials. Defaults to environment variables if not configured here.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="host">SMTP Host</Label>
                                    <Input
                                        id="host"
                                        placeholder="smtp.gmail.com"
                                        disabled={!config?.isActive}
                                        value={config?.config?.host || ''}
                                        onChange={(e) => setConfig({
                                            ...config!,
                                            config: { ...config!.config, host: e.target.value }
                                        })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="port">Port</Label>
                                    <Input
                                        id="port"
                                        placeholder="587"
                                        type="number"
                                        disabled={!config?.isActive}
                                        value={config?.config?.port || ''}
                                        onChange={(e) => setConfig({
                                            ...config!,
                                            config: { ...config!.config, port: parseInt(e.target.value) }
                                        })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="user">Username</Label>
                                    <Input
                                        id="user"
                                        placeholder="user@example.com"
                                        disabled={!config?.isActive}
                                        value={config?.config?.auth?.user || ''}
                                        onChange={(e) => setConfig({
                                            ...config!,
                                            config: {
                                                ...config!.config,
                                                auth: { ...(config!.config.auth || {}), user: e.target.value }
                                            }
                                        })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="pass">Password / App Password</Label>
                                    <Input
                                        id="pass"
                                        type="password"
                                        placeholder="••••••••"
                                        disabled={!config?.isActive}
                                        value={config?.config?.auth?.pass || ''}
                                        onChange={(e) => setConfig({
                                            ...config!,
                                            config: {
                                                ...config!.config,
                                                auth: { ...(config!.config.auth || {}), pass: e.target.value }
                                            }
                                        })}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id="isActive"
                                        checked={config?.isActive}
                                        onCheckedChange={(checked) => setConfig({ ...config!, isActive: checked })}
                                    />
                                    <Label htmlFor="isActive">Enable custom configuration</Label>
                                </div>
                                <Button onClick={handleSaveConfig} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Configuration
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="templates">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Notification Templates</CardTitle>
                                <CardDescription>Customize the content of emails sent by the system.</CardDescription>
                            </div>
                            <Button size="sm" onClick={() => {
                                setEditingTemplate({ type: '', subject: '', htmlBody: '', variables: [], enabled: true });
                                setIsTemplateDialogOpen(true);
                            }}>
                                <Plus className="w-4 h-4 mr-2" />
                                New Template
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {templates.map((template) => (
                                        <TableRow key={template.type}>
                                            <TableCell className="font-mono text-sm">{template.type}</TableCell>
                                            <TableCell>{template.subject}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${template.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {template.enabled ? 'Active' : 'Disabled'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => {
                                                        const formatted = template.htmlBody
                                                            .replace(/>\s*</g, '>\n<')
                                                            .split('\n')
                                                            .map((l: string) => l.trim())
                                                            .filter((l: string) => l.length > 0)
                                                            .join('\n');
                                                        setEditingTemplate({ ...template, htmlBody: formatted });
                                                        setIsTemplateDialogOpen(true);
                                                    }}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => {
                                                        setTemplateToDelete(template.type);
                                                        setIsDeleteDialogOpen(true);
                                                    }}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logs">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Email Delivery Logs</CardTitle>
                                <CardDescription>History of emails sent by the system.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setIsClearLogsDialogOpen(true)} disabled={isClearingLogs}>
                                {isClearingLogs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                Clear All Logs
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>To</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(log.sentAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">{log.to}</TableCell>
                                            <TableCell className="text-sm">{log.subject}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        {log.status === 'sent' ? (
                                                            <>
                                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                                <span className="text-xs font-medium text-green-600">Sent</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircle className="w-4 h-4 text-red-500" />
                                                                <span className="text-xs font-medium text-red-600">Failed</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => {
                                                        setLogToDelete(log.id);
                                                        setIsLogDeleteDialogOpen(true);
                                                    }}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {logs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                                No logs found. Emails sent will appear here.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Template Edit Dialog */}
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogContent className="!max-w-[min(90vw,1100px)] w-full max-h-[90vh] flex flex-col overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate?.type ? 'Edit Template' : 'Create Template'}</DialogTitle>
                        <DialogDescription>
                            Use {'{{variable}}'} syntax to inject dynamic data into your emails.
                        </DialogDescription>
                    </DialogHeader>
                    {editingTemplate && (
                        <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Template ID (Type)</Label>
                                    <Input
                                        disabled={!!templates.find(t => t.type === editingTemplate.type)}
                                        value={editingTemplate.type}
                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, type: e.target.value.toUpperCase() })}
                                        placeholder="WELCOME_EMAIL"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Subject</Label>
                                    <Input
                                        value={editingTemplate.subject}
                                        onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                                        placeholder="Welcome to VLabel!"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>HTML Content</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            try {
                                                const formatted = editingTemplate.htmlBody
                                                    .replace(/>\s*</g, '>\n<')
                                                    .replace(/(<[^/][^>]*>)(?!\n)/g, '$1\n')
                                                    .split('\n')
                                                    .map((line: string) => line.trim())
                                                    .filter((line: string) => line.length > 0)
                                                    .join('\n');
                                                setEditingTemplate({ ...editingTemplate, htmlBody: formatted });
                                            } catch {
                                                toast.error('Failed to format HTML');
                                            }
                                        }}
                                    >
                                        <WrapText className="w-3.5 h-3.5 mr-1.5" />
                                        Format
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Editor */}
                                    <div className="rounded-md border border-input overflow-hidden">
                                        <CodeMirror
                                            value={editingTemplate.htmlBody}
                                            height="450px"
                                            style={{ fontSize: '13px' }}
                                            extensions={[html()]}
                                            onChange={(value) => setEditingTemplate({ ...editingTemplate, htmlBody: value })}
                                            basicSetup={{
                                                lineNumbers: true,
                                                foldGutter: true,
                                                highlightActiveLine: true,
                                                autocompletion: true,
                                            }}
                                        />
                                    </div>
                                    {/* Preview */}
                                    <div className="rounded-md border border-input overflow-hidden flex flex-col">
                                        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted border-b border-input">
                                            Preview
                                        </div>
                                        <iframe
                                            srcDoc={editingTemplate.htmlBody || '<p style="color:#9ca3af;padding:16px">No content yet</p>'}
                                            className="w-full flex-1"
                                            style={{ height: '420px', border: 'none' }}
                                            sandbox="allow-same-origin"
                                            title="Email Preview"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={editingTemplate.enabled}
                                    onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, enabled: checked })}
                                />
                                <Label>Template Enabled</Label>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpsertTemplate}>Save Template</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Template Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="w-5 h-5" />
                            Confirm Deletion
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Are you sure you want to delete the <span className="font-bold text-foreground">{templateToDelete}</span> template?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-start gap-3 p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
                        <Info className="w-5 h-5 shrink-0 text-amber-600" />
                        <p>
                            <span className="font-bold">Warning:</span> Deleting this template will cause system errors when trying to send emails of this type. Please ensure no active processes rely on this template.
                        </p>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteTemplate}>Delete Template</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Log Delete Confirmation Dialog */}
            <Dialog open={isLogDeleteDialogOpen} onOpenChange={setIsLogDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="w-5 h-5" />
                            Confirm Delete Log
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Are you sure you want to delete this specific log entry? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsLogDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteLog}>Delete Entry</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Clear All Logs Warning Dialog */}
            <Dialog open={isClearLogsDialogOpen} onOpenChange={setIsClearLogsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="w-5 h-5" />
                            Clear All Delivery Logs
                        </DialogTitle>
                        <DialogDescription className="pt-2 italic font-bold text-red-500">
                            WARNING: You are about to delete ALL email delivery logs from the system.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-start gap-3 p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
                        <Info className="w-5 h-5 shrink-0 text-amber-600" />
                        <p>
                            This will permanently remove all history of sent and failed emails. This data is often useful for debugging delivery issues.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsClearLogsDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleClearLogs} disabled={isClearingLogs}>
                            {isClearingLogs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Yes, Clear All Logs
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
