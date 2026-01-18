import { useState, useEffect } from 'react';
import { authApi } from '../../../services/auth.api';
import { format } from 'date-fns';
import { Search, Filter, Download, Settings, Trash2, Save } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Button } from '../../../components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "../../../components/ui/alert-dialog";
import { toast } from 'sonner';

interface AuditLog {
    id: string;
    action: string;
    actorId: string;
    targetId: string | null;
    metadata: any;
    createdAt: string;
    actor?: { id: string; fullName: string; email: string };
    target?: { id: string; fullName: string; email: string };
}

export function AdminLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [retentionDays, setRetentionDays] = useState<string>('30');
    const [isSaving, setIsSaving] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);

    useEffect(() => {
        loadLogs();
        loadConfig();
    }, []);

    const loadLogs = async () => {
        try {
            const data = await authApi.getSystemLogs();
            setLogs(data);
        } catch (error) {
            console.error('Failed to load logs', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadConfig = async () => {
        try {
            const config = await authApi.getAuditLogConfig();
            setRetentionDays(config.retentionDays.toString());
        } catch (error) {
            console.error('Failed to load retention config', error);
        }
    };

    const handleSaveConfig = async () => {
        try {
            setIsSaving(true);
            const days = parseInt(retentionDays);
            await authApi.updateAuditLogConfig({ retentionDays: days });
            toast.success('Retention policy updated');
            loadLogs();
        } catch (error) {
            toast.error('Failed to update config');
        } finally {
            setIsSaving(false);
        }
    };

    const executeCleanup = async () => {
        try {
            setIsCleaning(true);
            const result = await authApi.cleanUpLogs();
            toast.success(`Cleanup complete. Deleted ${result.deletedCount} old logs.`);
            loadLogs();
        } catch (error) {
            toast.error('Failed to clean up logs');
        } finally {
            setIsCleaning(false);
        }
    };

    const handleExport = () => {
        if (logs.length === 0) return;

        // Define CSV headers
        const headers = ['Timestamp', 'Action', 'Actor Name', 'Actor Email', 'Target Name', 'Target Email', 'Metadata'];

        // Convert data to CSV rows
        const csvRows = logs.map(log => [
            format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
            log.action,
            log.actor?.fullName || log.actorId,
            log.actor?.email || '',
            log.target?.fullName || (log.targetId || ''),
            log.target?.email || '',
            JSON.stringify(log.metadata || {}).replace(/"/g, '""') // Escape double quotes
        ].map(field => `"${field}"`).join(',')); // Quote fields

        // Combine headers and rows
        const csvContent = [headers.join(','), ...csvRows].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `system_logs_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">System Logs</h2>
                    <p className="text-muted-foreground">Audit trail of administrator actions.</p>
                </div>
            </div>

            {/* Retention Settings */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-500" />
                        <CardTitle>Log Retention Policy</CardTitle>
                    </div>
                    <CardDescription>Configure how long audit logs are kept before being automatically deleted.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-end gap-4">
                    <div className="w-full max-w-xs space-y-2">
                        <Label>Retention Period</Label>
                        <Select value={retentionDays} onValueChange={setRetentionDays}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1 Day (Testing)</SelectItem>
                                <SelectItem value="7">7 Days</SelectItem>
                                <SelectItem value="30">30 Days</SelectItem>
                                <SelectItem value="60">60 Days</SelectItem>
                                <SelectItem value="90">90 Days</SelectItem>
                                <SelectItem value="180">6 Months</SelectItem>
                                <SelectItem value="365">1 Year</SelectItem>
                                <SelectItem value="0">Keep Forever (Not Recommended)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleSaveConfig}
                            disabled={isSaving}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save Config
                        </Button>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    disabled={isCleaning}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Cleanup Now
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action will permanently delete all audit logs older than the configured retention period.
                                        This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>

                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-2">
                                    <div className="flex">
                                        <div className="ml-3">
                                            <p className="text-sm text-yellow-700 font-bold">
                                                Lưu ý (Note):
                                            </p>
                                            <p className="text-sm text-yellow-700 mt-1">
                                                Chế độ này chỉ dành cho Developer. Không được phép sử dụng ở môi trường Production.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={executeCleanup} className="bg-red-600 hover:bg-red-700">
                                        Yes, Cleanup Logs
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>

            {/* Filters */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        placeholder="Search logs..."
                        className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50">
                    <Filter className="w-4 h-4" />
                    Filter
                </button>
                <div className="flex-1" />
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <Download className="w-4 h-4" />
                    Export
                </button>
            </div>

            {/* Table */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b">
                            <tr>
                                <th className="px-6 py-4 font-medium">Timestamp</th>
                                <th className="px-6 py-4 font-medium">Action</th>
                                <th className="px-6 py-4 font-medium">Actor</th>
                                <th className="px-6 py-4 font-medium">Target</th>
                                <th className="px-6 py-4 font-medium">Metadata</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                        Loading logs...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                        No logs found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                            {format(new Date(log.createdAt), 'PP pp')}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{log.actor?.fullName || 'Unknown'}</span>
                                                <span className="text-xs text-gray-500 font-mono">{log.actorId.slice(0, 8)}...</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.targetId ? (
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{log.target?.fullName || 'Unknown'}</span>
                                                    <span className="text-xs text-gray-500 font-mono">{log.targetId.slice(0, 8)}...</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                                            {JSON.stringify(log.metadata)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
