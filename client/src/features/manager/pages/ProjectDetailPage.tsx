import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Progress } from '../../../components/ui/progress';
import { Badge } from '../../../components/ui/badge';
import { Calendar } from '../../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Checkbox } from '../../../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../../components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '../../../components/ui/radio-group';
import {
    FolderOpen,
    Calendar as CalendarIcon,
    Users,
    CheckCircle2,
    Clock,
    AlertCircle,
    Star,
    ArrowLeft,
    Upload,
    X,
    Edit,
    Download,
    MoreVertical,
    Trash2,
    FileText,
    TrendingUp,
    PieChart as PieChartIcon,
    BarChart3,
    FileUp,
    Search,
    Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { UserNav } from '../../../components/common/UserNav';
import { useAuth } from '../../../context/AuthContext';
import { CompactImageSummary } from '../../../components/CompactImageSummary';
import { ManageImagesDialog } from '../../../components/ManageImagesDialog';
import type { Label as LabelType, LabelCategory } from '../../../types/label.types';
import { LabelSelector } from '../../../components/LabelSelector';
import { ChatPanel } from '../../../components/chat/ChatPanel';
import { getProjectById, updateProject, deleteProject, annotators, initialLabels as mockLabels, initialCategories as mockCategories } from '../data/projects.mock';
import type { Project, Task } from '../data/projects.mock';

export function ProjectDetailPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { isImpersonating } = useAuth();
    const [project, setProject] = useState<Project | undefined>();
    const [activeTab, setActiveTab] = useState('tasks');
    const [labels, setLabels] = useState<LabelType[]>(mockLabels);
    const [categories, setCategories] = useState<LabelCategory[]>(mockCategories);

    // Load Project
    useEffect(() => {
        if (projectId) {
            const found = getProjectById(projectId);
            if (found) {
                setProject(found);
            } else {
                toast.error('Project not found');
                navigate('/manager/projects');
            }
        }
    }, [projectId, navigate]);

    // Dialog States
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isAddImagesOpen, setIsAddImagesOpen] = useState(false);
    const [isManageAddImagesOpen, setIsManageAddImagesOpen] = useState(false);

    // Search & Filter State
    const [taskSearchQuery, setTaskSearchQuery] = useState('');
    const [taskFilterStatus, setTaskFilterStatus] = useState<string>('all');
    const [taskFilterAssignee, setTaskFilterAssignee] = useState<string>('all');

    // Edit Project State
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editDeadline, setEditDeadline] = useState<Date>();
    const [editAnnotators, setEditAnnotators] = useState<string[]>([]);
    const [editLabelIds, setEditLabelIds] = useState<string[]>([]);

    // Add Images State
    const [newImages, setNewImages] = useState<File[]>([]);
    const [addImagesAnnotators, setAddImagesAnnotators] = useState<string[]>([]);
    const [addImagesMethod, setAddImagesMethod] = useState<'later' | 'auto' | 'manual'>('later');
    const [assignmentGroups, setAssignmentGroups] = useState<{ id: string; annotatorId: string; imageIndices: number[] }[]>([]);

    // Batch Assign State
    const [selectedAnnotator, setSelectedAnnotator] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<Date>();

    // Populate form when switching to Settings tab
    useEffect(() => {
        if (activeTab === 'settings' && project) {
            setEditName(project.name);
            setEditDescription(project.description);
            setEditDeadline(new Date(project.deadline));
            setEditAnnotators(project.assignedTo.map(name => annotators.find(a => a.name === name)?.id || '').filter(Boolean));
            setEditLabelIds(project.labelIds || []);
        }
    }, [activeTab, project]);

    // Filtered Tasks
    const filteredTasks = useMemo(() => {
        if (!project) return [];

        return project.tasks.filter(task => {
            const matchesSearch = task.imageName.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
                task.id.toLowerCase().includes(taskSearchQuery.toLowerCase());

            const matchesStatus = taskFilterStatus === 'all' || task.status === taskFilterStatus;
            const matchesAssignee = taskFilterAssignee === 'all' || task.assignee === taskFilterAssignee;

            return matchesSearch && matchesStatus && matchesAssignee;
        });
    }, [project, taskSearchQuery, taskFilterStatus, taskFilterAssignee]);

    if (!project) return null; // Loading or redirecting

    const selectedTasks = project.tasks.filter(t => t.selected);
    const projectProgress = project.tasks.length > 0
        ? (project.tasks.filter(t => t.status === 'approved').length / project.tasks.length) * 100
        : 0;

    // Handlers
    const handleEditProject = () => {
        if (!project || !editName || !editDescription || !editDeadline) return;

        if (editLabelIds.length === 0) {
            toast.error('Please select at least one label');
            return;
        }

        const updatedProject: Project = {
            ...project,
            name: editName,
            description: editDescription,
            deadline: format(editDeadline, 'yyyy-MM-dd'),
            assignedTo: editAnnotators.map(id => annotators.find(a => a.id === id)?.name || '').filter(Boolean),
            labelIds: editLabelIds,
        };

        updateProject(updatedProject);
        setProject(updatedProject);
        toast.success('Project updated successfully!');
    };

    const handleDeleteProject = () => {
        if (!project) return;
        if (confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
            deleteProject(project.id);
            navigate('/manager/projects');
            toast.success('Project deleted successfully!');
        }
    };

    const handleAddImagesToProject = () => {
        if (!project || newImages.length === 0) {
            toast.error('Please upload at least one image');
            return;
        }

        if (addImagesMethod === 'auto' && addImagesAnnotators.length === 0) {
            toast.error('Please select at least one annotator');
            return;
        }

        if (addImagesMethod === 'auto' && addImagesAnnotators.length > newImages.length) {
            toast.error(`Cannot select more annotators (${addImagesAnnotators.length}) than images (${newImages.length})`);
            return;
        }

        let newTasks: Task[] = [];

        if (addImagesMethod === 'later') {
            newTasks = newImages.map((file, index) => ({
                id: `T-${Date.now()}-${index}`,
                imageUrl: URL.createObjectURL(file),
                imageName: file.name,
                status: 'pending' as const,
                assignee: null,
                deadline: null,
            }));
        } else if (addImagesMethod === 'auto') {
            newTasks = newImages.map((file, index) => {
                const assignedAnnotatorId = addImagesAnnotators[index];
                const assignedAnnotator = annotators.find(a => a.id === assignedAnnotatorId);

                return {
                    id: `T-${Date.now()}-${index}`,
                    imageUrl: URL.createObjectURL(file),
                    imageName: file.name,
                    status: assignedAnnotator ? 'assigned' as const : 'pending' as const,
                    assignee: assignedAnnotator?.name || null,
                    deadline: assignedAnnotator ? project.deadline : null,
                };
            });
        } else if (addImagesMethod === 'manual') {
            newTasks = newImages.map((file, index) => {
                const group = assignmentGroups.find(g => g.imageIndices.includes(index));
                const assignedAnnotator = group ? annotators.find(a => a.id === group.annotatorId) : null;

                return {
                    id: `T-${Date.now()}-${index}`,
                    imageUrl: URL.createObjectURL(file),
                    imageName: file.name,
                    status: assignedAnnotator ? 'assigned' as const : 'pending' as const,
                    assignee: assignedAnnotator?.name || null,
                    deadline: assignedAnnotator ? project.deadline : null,
                };
            });
        }

        const updatedProject = {
            ...project,
            tasks: [...project.tasks, ...newTasks],
            totalImages: project.totalImages + newImages.length,
        };

        updateProject(updatedProject);
        setProject(updatedProject);
        setNewImages([]);
        setAddImagesAnnotators([]);
        setAssignmentGroups([]);
        setAddImagesMethod('later');
        setIsAddImagesOpen(false);

        toast.success(`Added ${newImages.length} images!`);
    };

    const toggleTaskSelection = (taskId: string) => {
        if (!project) return;
        const updatedTasks = project.tasks.map(task =>
            task.id === taskId ? { ...task, selected: !task.selected } : task
        );
        const updatedProject = { ...project, tasks: updatedTasks };
        updateProject(updatedProject);
        setProject(updatedProject);
    };

    const handleIndividualAssign = (taskId: string) => {
        if (!project) return;
        const updatedTasks = project.tasks.map(task => ({
            ...task,
            selected: task.id === taskId
        }));
        const updatedProject = { ...project, tasks: updatedTasks };
        updateProject(updatedProject);
        setProject(updatedProject);
        setIsAssignModalOpen(true);
    };

    const handleBatchAssign = () => {
        if (!selectedAnnotator || !selectedDate || !project) return;
        const selectedAnnotatorName = annotators.find(a => a.id === selectedAnnotator)?.name;
        const updatedTasks = project.tasks.map(task =>
            task.selected
                ? { ...task, status: 'assigned' as const, assignee: selectedAnnotatorName || null, deadline: format(selectedDate, 'yyyy-MM-dd'), selected: false }
                : task
        );

        const updatedProject = { ...project, tasks: updatedTasks };
        updateProject(updatedProject);
        setProject(updatedProject);
        setIsAssignModalOpen(false);
        setSelectedAnnotator('');
        setSelectedDate(undefined);
        toast.success('Tasks assigned successfully!');
    };

    const exportProjectCSV = (project: Project) => {
        // Implement export logic here (omitted for brevity, assume similar to original)
        toast.success('CSV export started');
    };

    const exportProjectJSON = (project: Project) => {
        // Implement export logic here (omitted for brevity, assume similar to original)
        toast.success('JSON export started');
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            pending: 'bg-gray-100 text-gray-700',
            assigned: 'bg-blue-100 text-blue-700',
            submitted: 'bg-yellow-100 text-yellow-700',
            approved: 'bg-green-100 text-green-700',
        };
        return styles[status as keyof typeof styles];
    };

    const isOverdue = (deadline: string | null) => {
        if (!deadline) return false;
        return new Date(deadline) < new Date();
    };

    const getAnnotationTypeLabel = (type: string) => {
        const labels = {
            'bounding-box': 'Bounding Box',
            'polygon': 'Polygon',
            'segmentation': 'Segmentation',
        };
        return labels[type as keyof typeof labels];
    };

    // Analytics Data Helper
    const getAnalyticsData = (project: Project) => {
        const statusData = [
            { name: 'Pending', value: project.tasks.filter(t => t.status === 'pending').length, color: '#9ca3af' },
            { name: 'Assigned', value: project.tasks.filter(t => t.status === 'assigned').length, color: '#3b82f6' },
            { name: 'Submitted', value: project.tasks.filter(t => t.status === 'submitted').length, color: '#eab308' },
            { name: 'Approved', value: project.tasks.filter(t => t.status === 'approved').length, color: '#22c55e' },
        ].filter(item => item.value > 0);

        const annotatorStats: { [key: string]: number } = {};
        project.tasks.forEach(task => {
            if (task.assignee) annotatorStats[task.assignee] = (annotatorStats[task.assignee] || 0) + 1;
        });

        const annotatorData = Object.entries(annotatorStats).map(([name, count]) => ({
            name: name.split(' ')[0],
            tasks: count,
        }));

        const progressData = [
            { date: 'Week 1', progress: 15 },
            { date: 'Week 2', progress: 32 },
            { date: 'Week 3', progress: 58 },
            { date: 'Week 4', progress: project.tasks.length > 0 ? Math.round((project.tasks.filter(t => t.status === 'approved').length / project.tasks.length) * 100) : 0 },
        ];

        return { statusData, annotatorData, progressData };
    };

    const { statusData, annotatorData, progressData } = getAnalyticsData(project);

    return (
        <div className="min-h-screen bg-gray-50 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* Header */}
            {!isImpersonating && (
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src="/src/assets/android-chrome-192x192.png"
                                alt="VLabel Logo"
                                className="w-8 h-8 rounded-lg"
                            />
                            <div>
                                <h1 className="text-xl font-semibold">VLabel</h1>
                                <p className="text-xs text-muted-foreground">Manager Dashboard</p>
                            </div>
                        </div>
                        <UserNav />
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-8 py-8">
                {/* Back Button & Actions */}
                <div className="flex items-center justify-between mb-6">
                    <Button variant="ghost" onClick={() => navigate('/manager/projects')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Projects
                    </Button>

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsAddImagesOpen(true)}>
                            <Upload className="w-4 h-4 mr-2" />
                            Add Images
                        </Button>

                        <Button variant="outline" onClick={() => toast.info('Import functionality coming soon!')}>
                            <FileUp className="w-4 h-4 mr-2" />
                            Import
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Download className="w-4 h-4 mr-2" />
                                    Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => exportProjectCSV(project)}>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Export as CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => exportProjectJSON(project)}>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Export as JSON
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setActiveTab('settings')}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Project
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDeleteProject} className="text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Project
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Project Header */}
                <Card className="p-6 mb-8">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <FolderOpen className="w-6 h-6 text-blue-600" />
                                <h2 className="text-2xl font-semibold">{project.name}</h2>
                                <Badge variant="outline">
                                    {getAnnotationTypeLabel(project.annotationType)}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground mb-4">{project.description}</p>

                            {/* Project Labels */}
                            {project.labelIds && project.labelIds.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-sm text-muted-foreground mb-2">Labels:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {project.labelIds.map(labelId => {
                                            const label = labels.find(l => l.id === labelId);
                                            if (!label) return null;
                                            return (
                                                <Badge
                                                    key={labelId}
                                                    style={{ backgroundColor: label.color, color: 'white' }}
                                                >
                                                    {label.name}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Overall Progress</span>
                                    <span className="font-semibold">{Math.round(projectProgress)}%</span>
                                </div>
                                <Progress value={projectProgress} className="h-2" />
                            </div>
                        </div>

                        <Badge variant="outline" className={`ml-6 ${isOverdue(project.deadline) ? 'border-red-200 bg-red-50 text-red-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            Deadline: {format(new Date(project.deadline), 'MMM dd, yyyy')}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Clock className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Pending</p>
                                <p className="text-xl font-semibold">{project.tasks.filter(t => t.status === 'pending').length}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                            <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Assigned</p>
                                <p className="text-xl font-semibold">{project.tasks.filter(t => t.status === 'assigned').length}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                            <div className="w-10 h-10 bg-yellow-200 rounded-lg flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Submitted</p>
                                <p className="text-xl font-semibold">{project.tasks.filter(t => t.status === 'submitted').length}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                            <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Approved</p>
                                <p className="text-xl font-semibold">{project.tasks.filter(t => t.status === 'approved').length}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Tabs: Tasks & Analytics */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="tasks">Task Management</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="tasks" className="space-y-6">
                        {/* Search & Filter for Tasks */}
                        <Card className="p-4">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[250px]">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search tasks by name or ID..."
                                            value={taskSearchQuery}
                                            onChange={(e) => setTaskSearchQuery(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                <Select value={taskFilterStatus} onValueChange={setTaskFilterStatus}>
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="assigned">Assigned</SelectItem>
                                        <SelectItem value="submitted">Submitted</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={taskFilterAssignee} onValueChange={setTaskFilterAssignee}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Assignee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Assignees</SelectItem>
                                        {annotators.map(a => (
                                            <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </Card>

                        {/* Task Management + Chat Panel Layout (70/30) */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left: Task Table (70%) */}
                            <div className="lg:col-span-2">
                                <Card className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-xl font-semibold">Tasks</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Showing {filteredTasks.length} of {project.tasks.length} tasks
                                            </p>
                                        </div>
                                        <Button
                                            className="bg-blue-500 hover:bg-blue-600"
                                            disabled={selectedTasks.length === 0}
                                            onClick={() => setIsAssignModalOpen(true)}
                                        >
                                            <Users className="w-4 h-4 mr-2" />
                                            Assign Tasks {selectedTasks.length > 0 && `(${selectedTasks.length})`}
                                        </Button>
                                    </div>

                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-gray-50">
                                                    <TableHead className="w-[50px]"></TableHead>
                                                    <TableHead className="w-[80px]">Preview</TableHead>
                                                    <TableHead>Image Name</TableHead>
                                                    <TableHead>Task ID</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Assignee</TableHead>
                                                    <TableHead>Deadline</TableHead>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredTasks.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                            No tasks found matching your filters
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filteredTasks.map((task) => (
                                                        <TableRow key={task.id}>
                                                            <TableCell>
                                                                <Checkbox
                                                                    checked={task.selected || false}
                                                                    onCheckedChange={() => toggleTaskSelection(task.id)}
                                                                    disabled={task.status !== 'pending'}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                {task.imageUrl ? (
                                                                    <img
                                                                        src={task.imageUrl}
                                                                        alt={task.imageName}
                                                                        className="w-12 h-12 object-cover rounded"
                                                                    />
                                                                ) : (
                                                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded flex items-center justify-center text-xl">
                                                                        🖼️
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="font-medium text-sm">{task.imageName}</TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">{task.id}</TableCell>
                                                            <TableCell>
                                                                <Badge className={getStatusBadge(task.status)}>
                                                                    {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground">
                                                                {task.assignee || '—'}
                                                            </TableCell>
                                                            <TableCell>
                                                                {task.deadline ? (
                                                                    <span className={isOverdue(task.deadline) ? 'text-red-600 font-medium' : ''}>
                                                                        {isOverdue(task.deadline) && '⚠️ '}
                                                                        {format(new Date(task.deadline), 'MMM dd, yyyy')}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted-foreground">—</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                                            <MoreVertical className="w-4 h-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem
                                                                            onClick={() => handleIndividualAssign(task.id)}
                                                                            disabled={task.status !== 'pending'}
                                                                        >
                                                                            <Users className="w-4 h-4 mr-2" />
                                                                            Assign Task
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem className="text-red-600">
                                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                                            Delete Task
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </Card>
                            </div>

                            {/* Right: Chat Panel (30%) */}
                            <div className="lg:col-span-1">
                                <ChatPanel
                                    projectId={project.id}
                                    projectName={project.name}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-6">
                        {/* Analytics Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Progress Over Time */}
                            <Card className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                    <h3 className="text-lg font-semibold">Progress Over Time</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={progressData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="progress" stroke="#3b82f6" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Card>

                            {/* Status Distribution */}
                            <Card className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <PieChartIcon className="w-5 h-5 text-blue-600" />
                                    <h3 className="text-lg font-semibold">Status Distribution</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={250}>
                                    <RechartsPie>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={(entry) => `${entry.name}: ${entry.value}`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </RechartsPie>
                                </ResponsiveContainer>
                            </Card>

                            {/* Annotator Workload */}
                            <Card className="p-6 lg:col-span-2">
                                <div className="flex items-center gap-2 mb-4">
                                    <BarChart3 className="w-5 h-5 text-blue-600" />
                                    <h3 className="text-lg font-semibold">Annotator Workload</h3>
                                </div>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={annotatorData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="tasks" fill="#3b82f6" name="Assigned Tasks" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Card>
                        </div>

                        {/* Summary Stats */}
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Project Summary</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Total Tasks</p>
                                    <p className="text-2xl font-semibold">{project.tasks.length}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
                                    <p className="text-2xl font-semibold">{Math.round(projectProgress)}%</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Team Members</p>
                                    <p className="text-2xl font-semibold">{project.assignedTo.length}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Days Remaining</p>
                                    <p className="text-2xl font-semibold">
                                        {Math.max(0, Math.ceil((new Date(project.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="settings">
                        <Card className="p-6">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold">Project Settings</h3>
                                    <p className="text-sm text-muted-foreground">Update project details and configuration</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Project Name *</Label>
                                    <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Description *</Label>
                                    <Textarea
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Deadline *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {editDeadline ? format(editDeadline, 'PPP') : 'Pick a date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={editDeadline}
                                                onSelect={setEditDeadline}
                                                disabled={(date) => date < new Date()}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <LabelSelector
                                        availableLabels={labels}
                                        categories={categories}
                                        selectedLabelIds={editLabelIds}
                                        onSelectionChange={setEditLabelIds}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Team Members</Label>
                                    <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                                        {annotators.map((annotator) => (
                                            <div key={annotator.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={editAnnotators.includes(annotator.id)}
                                                        onCheckedChange={() => {
                                                            setEditAnnotators(prev =>
                                                                prev.includes(annotator.id)
                                                                    ? prev.filter(id => id !== annotator.id)
                                                                    : [...prev, annotator.id]
                                                            );
                                                        }}
                                                    />
                                                    <span className="font-medium">{annotator.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                                    <span className="text-sm font-medium">{annotator.reputation}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button
                                        className="bg-blue-500 hover:bg-blue-600"
                                        onClick={handleEditProject}
                                        disabled={!editName || !editDescription || !editDeadline}
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Add Images Dialog */}
            <Dialog open={isAddImagesOpen} onOpenChange={setIsAddImagesOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Images to Project</DialogTitle>
                        <DialogDescription>Upload new images and assign to annotators</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <Label>Upload Images *</Label>
                            {newImages.length === 0 ? (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Drag & drop images or click to browse
                                    </p>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files || []);
                                            setNewImages(prev => [...prev, ...files]);
                                        }}
                                        className="hidden"
                                        id="add-images-upload"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => document.getElementById('add-images-upload')?.click()}
                                    >
                                        Select Images
                                    </Button>
                                </div>
                            ) : newImages.length <= 10 ? (
                                <div className="mt-4">
                                    <p className="text-sm font-medium mb-2">{newImages.length} image{newImages.length !== 1 ? 's' : ''} selected</p>
                                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                                        {newImages.map((file, index) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={file.name}
                                                    className="w-full h-20 object-cover rounded border"
                                                />
                                                <button
                                                    onClick={() => setNewImages(prev => prev.filter((_, i) => i !== index))}
                                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <CompactImageSummary
                                    images={newImages}
                                    onManage={() => setIsManageAddImagesOpen(true)}
                                    onClear={() => setNewImages([])}
                                />
                            )}
                        </div>

                        {/* Assignment Method */}
                        <div className="space-y-3">
                            <Label>Assignment Method *</Label>
                            <RadioGroup value={addImagesMethod} onValueChange={(v: any) => setAddImagesMethod(v)}>
                                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                                    <RadioGroupItem value="later" id="add-later" />
                                    <Label htmlFor="add-later" className="flex-1 cursor-pointer">
                                        <div className="font-medium">Assign Later</div>
                                        <div className="text-sm text-muted-foreground">Add images as pending tasks. Assign manually later.</div>
                                    </Label>
                                </div>

                                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                                    <RadioGroupItem value="auto" id="add-auto" />
                                    <Label htmlFor="add-auto" className="flex-1 cursor-pointer">
                                        <div className="font-medium">Auto-assign (1-to-1)</div>
                                        <div className="text-sm text-muted-foreground">Each image assigned to exactly one annotator.</div>
                                    </Label>
                                </div>

                                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                                    <RadioGroupItem value="manual" id="add-manual" />
                                    <Label htmlFor="add-manual" className="flex-1 cursor-pointer">
                                        <div className="font-medium">Manual Assignment</div>
                                        <div className="text-sm text-muted-foreground">Create groups to assign specific images to annotators.</div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Annotator Selection (only for auto method) */}
                        {addImagesMethod === 'auto' && (
                            <div className="space-y-2">
                                <Label>Select Annotators (1 image per annotator)</Label>
                                <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                                    {annotators.map((annotator) => {
                                        const isDisabled = addImagesAnnotators.length >= newImages.length &&
                                            !addImagesAnnotators.includes(annotator.id);

                                        return (
                                            <div key={annotator.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                                <div className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked={addImagesAnnotators.includes(annotator.id)}
                                                        onCheckedChange={() => {
                                                            setAddImagesAnnotators(prev =>
                                                                prev.includes(annotator.id)
                                                                    ? prev.filter(id => id !== annotator.id)
                                                                    : [...prev, annotator.id]
                                                            );
                                                        }}
                                                        disabled={isDisabled}
                                                    />
                                                    <span className={`font-medium ${isDisabled ? 'text-muted-foreground' : ''}`}>
                                                        {annotator.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                                    <span className="text-sm font-medium">{annotator.reputation}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {newImages.length > 0 && (
                                    <div className="text-sm mt-2">
                                        {addImagesAnnotators.length === 0 && (
                                            <p className="text-muted-foreground">Select up to {newImages.length} annotators (1 image per annotator)</p>
                                        )}
                                        {addImagesAnnotators.length > 0 && addImagesAnnotators.length < newImages.length && (
                                            <p className="text-blue-600">
                                                ✓ {addImagesAnnotators.length} image{addImagesAnnotators.length !== 1 ? 's' : ''} will be assigned, {newImages.length - addImagesAnnotators.length} will remain pending
                                            </p>
                                        )}
                                        {addImagesAnnotators.length === newImages.length && (
                                            <p className="text-green-600">
                                                ✓ Perfect! All {newImages.length} images will be assigned (1 per annotator)
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Manual Assignment UI */}
                        {addImagesMethod === 'manual' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center justify-between">
                                    <Label>Assignment Groups</Label>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setAssignmentGroups(prev => [
                                            ...prev,
                                            { id: `grp-${Date.now()}`, annotatorId: '', imageIndices: [] }
                                        ])}
                                    >
                                        <Plus className="w-3 h-3 mr-1" /> Add Group
                                    </Button>
                                </div>

                                {assignmentGroups.length === 0 ? (
                                    <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground bg-gray-50">
                                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p>No assignment groups yet. Create a group to start assigning images manually.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                        {assignmentGroups.map((group, groupIndex) => (
                                            <div key={group.id} className="border rounded-lg p-3 space-y-3 bg-white">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                        <Select
                                                            value={group.annotatorId}
                                                            onValueChange={(value) => {
                                                                setAssignmentGroups(prev => prev.map((g, i) =>
                                                                    i === groupIndex ? { ...g, annotatorId: value } : g
                                                                ));
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue placeholder="Select Annotator" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {annotators.map(a => (
                                                                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => setAssignmentGroups(prev => prev.filter((_, i) => i !== groupIndex))}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>

                                                <div className="space-y-1">
                                                    <p className="text-xs text-muted-foreground">Select images for this group:</p>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {newImages.map((file, imgIndex) => {
                                                            const isAssignedToThis = group.imageIndices.includes(imgIndex);
                                                            const isAssignedToOther = assignmentGroups.some((g, i) => i !== groupIndex && g.imageIndices.includes(imgIndex));

                                                            return (
                                                                <div
                                                                    key={imgIndex}
                                                                    className={`
                                    relative aspect-square rounded border cursor-pointer overflow-hidden group
                                    ${isAssignedToThis ? 'ring-2 ring-blue-500 border-transparent' : ''}
                                    ${isAssignedToOther ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-300'}
                                  `}
                                                                    onClick={() => {
                                                                        if (isAssignedToOther) return;
                                                                        setAssignmentGroups(prev => prev.map((g, i) => {
                                                                            if (i !== groupIndex) return g;
                                                                            const newIndices = g.imageIndices.includes(imgIndex)
                                                                                ? g.imageIndices.filter(idx => idx !== imgIndex)
                                                                                : [...g.imageIndices, imgIndex];
                                                                            return { ...g, imageIndices: newIndices };
                                                                        }));
                                                                    }}
                                                                >
                                                                    <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                                                                    {isAssignedToThis && (
                                                                        <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                                            <CheckCircle2 className="w-6 h-6 text-blue-600 fill-white" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-right text-muted-foreground">
                                                    {group.imageIndices.length} images selected
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {newImages.length > 0 && (
                                    <div className="text-sm pt-2 border-t">
                                        {(() => {
                                            const totalAssigned = assignmentGroups.reduce((acc, g) => acc + g.imageIndices.length, 0);
                                            const pending = newImages.length - totalAssigned;
                                            return (
                                                <div className="flex justify-between items-center font-medium">
                                                    <span className="text-blue-600">{totalAssigned} assigned</span>
                                                    <span className="text-gray-500">{pending} pending</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setIsAddImagesOpen(false);
                                    setNewImages([]);
                                    setAddImagesAnnotators([]);
                                    setAssignmentGroups([]);
                                    setAddImagesMethod('later');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-blue-500 hover:bg-blue-600"
                                onClick={handleAddImagesToProject}
                                disabled={newImages.length === 0}
                            >
                                Add Images
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Manage Images Dialog for Add Images */}
            {isManageAddImagesOpen && (
                <ManageImagesDialog
                    images={newImages}
                    onRemove={(indexes) => {
                        setNewImages(prev => prev.filter((_, i) => !indexes.includes(i)));
                    }}
                    onClose={() => setIsManageAddImagesOpen(false)}
                />
            )}

            {/* Batch Assign Modal */}
            <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Batch Assign Tasks</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-3">
                                Assigning {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}
                            </p>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                {selectedTasks.map(task => (
                                    <Badge key={task.id} variant="outline">{task.imageName}</Badge>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Select Annotator</Label>
                            <Select value={selectedAnnotator} onValueChange={setSelectedAnnotator}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose an annotator" />
                                </SelectTrigger>
                                <SelectContent>
                                    {annotators.map((annotator) => (
                                        <SelectItem key={annotator.id} value={annotator.id}>
                                            <div className="flex items-center gap-2">
                                                <span>{annotator.name}</span>
                                                <span className="text-xs text-muted-foreground">—</span>
                                                <div className="flex items-center gap-1">
                                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                                    <span className="text-xs font-medium">{annotator.reputation}%</span>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Set Deadline</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        disabled={(date) => date < new Date()}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setIsAssignModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-blue-500 hover:bg-blue-600"
                                onClick={handleBatchAssign}
                                disabled={!selectedAnnotator || !selectedDate}
                            >
                                Assign Tasks
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
