
import React, { useEffect, useState } from 'react';
import { projectApi } from '../../../services/project.api';
import type { ProjectHealthStats } from '../../../services/project.api';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { AlertTriangle, CheckCircle, Clock, AlertOctagon, HelpCircle } from 'lucide-react';

interface ProjectHealthDashboardProps {
    projectId: string;
}

export const ProjectHealthDashboard: React.FC<ProjectHealthDashboardProps> = ({ projectId }) => {
    const [stats, setStats] = useState<ProjectHealthStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeRescueType, setActiveRescueType] = useState<'STUCK' | 'PROBLEMATIC' | 'ORPHANED' | null>(null);
    const [rescueTasks, setRescueTasks] = useState<any[]>([]);

    useEffect(() => {
        loadStats();
    }, [projectId]);

    const loadStats = async () => {
        try {
            const data = await projectApi.getHealthStats(projectId);
            setStats(data);
        } catch (error) {
            console.error('Failed to load health stats', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRescue = async (type: 'STUCK' | 'PROBLEMATIC' | 'ORPHANED') => {
        try {
            setLoading(true);
            const tasks = await projectApi.getRescueTasks(projectId, type);
            setActiveRescueType(type);
            setRescueTasks(tasks);
        } catch (error) {
            console.error('Failed to load rescue tasks', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !stats) return <div>Loading Health Stats...</div>;
    if (!stats) return null;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'HEALTHY': return 'text-green-500';
            case 'WARNING': return 'text-yellow-500';
            case 'CRITICAL': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Project Health Rescue Center</h2>
                <div className={`flex items-center gap-2 font-bold ${getStatusColor(stats.status)}`}>
                    {stats.status === 'HEALTHY' ? <CheckCircle /> : <AlertTriangle />}
                    <span>{stats.status}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 border-l-4 border-yellow-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Stuck Tasks (&gt;24h)</p>
                            <h3 className="text-2xl font-bold">{stats.stuck}</h3>
                        </div>
                        <Clock className="text-yellow-500" />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 w-full"
                        onClick={() => handleRescue('STUCK')}
                        disabled={stats.stuck === 0}
                    >
                        Rescue Stuck Tasks
                    </Button>
                </Card>

                <Card className="p-4 border-l-4 border-red-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Problematic (Rejects)</p>
                            <h3 className="text-2xl font-bold">{stats.problematic}</h3>
                        </div>
                        <AlertOctagon className="text-red-500" />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 w-full"
                        onClick={() => handleRescue('PROBLEMATIC')}
                        disabled={stats.problematic === 0}
                    >
                        Fix Problematic Tasks
                    </Button>
                </Card>

                <Card className="p-4 border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm text-gray-500">Orphaned (Unassigned)</p>
                            <h3 className="text-2xl font-bold">{stats.orphaned}</h3>
                        </div>
                        <HelpCircle className="text-blue-500" />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-4 w-full"
                        onClick={() => handleRescue('ORPHANED')}
                        disabled={stats.orphaned === 0}
                    >
                        Assign Orhpans
                    </Button>
                </Card>
            </div>

            {activeRescueType && (
                <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">Rescuing: {activeRescueType} ({rescueTasks.length})</h3>
                        <Button variant="ghost" size="sm" onClick={() => setActiveRescueType(null)}>Close</Button>
                    </div>
                    <ul className="space-y-2">
                        {rescueTasks.map((task: any) => (
                            <li key={task.id} className="p-3 bg-white dark:bg-gray-700 rounded shadow-sm flex justify-between items-center">
                                <span>Task {task.id.substring(0, 8)}...</span>
                                <span className="text-sm text-gray-500">
                                    {activeRescueType === 'STUCK' && `Stuck since ${new Date(task.updatedAt).toLocaleDateString()}`}
                                    {activeRescueType === 'PROBLEMATIC' && `Rejected ${task.rejectionCount} times`}
                                    {activeRescueType === 'ORPHANED' && `Deadline: ${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'None'}`}
                                </span>
                            </li>
                        ))}
                        {rescueTasks.length === 0 && <p className="text-gray-500">No tasks found.</p>}
                    </ul>
                </div>
            )}
        </div>
    );
};
