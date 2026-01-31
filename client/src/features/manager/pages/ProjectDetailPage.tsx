import { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../../../components/ui/dropdown-menu';
import {
    FolderOpen,
    Calendar as CalendarIcon,
    Users,
    Clock,
    AlertCircle,
    ArrowLeft,
    Upload,
    Edit,
    Download,
    MoreVertical,
    Trash2,
    FileText,
    FileUp,
    Search,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { UserNav } from '../../../components/common/UserNav';
import { useAuth } from '../../../context/AuthContext';
import { ChatPanel } from '../../../components/chat/ChatPanel';
import { projectApi } from '../../../services/project.api';
import { projectLabelApi, labelApi, type Label as ApiLabel } from '../../../services/label.api';
import { LabelSelector } from '../../../components/LabelSelector';
import type { Project } from '../../../types/project.types';
import { ProjectStatus } from '../../../types/project.types';

export function ProjectDetailPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { isImpersonating } = useAuth();

    // Data State
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('tasks');

    // Label State
    const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
    const [allAvailableLabels, setAllAvailableLabels] = useState<ApiLabel[]>([]);

    // Placeholder for tasks since API doesn't return them yet
    const [tasks, setTasks] = useState<any[]>([]);

    // Dialog States
    const [isAddImagesOpen, setIsAddImagesOpen] = useState(false);

    // Search & Filter State
    const [taskSearchQuery, setTaskSearchQuery] = useState('');
    const [taskFilterStatus,] = useState<string>('all');
    const [taskFilterAssignee, setTaskFilterAssignee] = useState<string>('all');

    // Edit Project State - Pre-fill when opening
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editDeadline, setEditDeadline] = useState<Date>();

    // Load Project
    useEffect(() => {
        if (projectId) {
            setIsLoading(true);
            projectApi.getById(projectId)
                .then(data => {
                    setProject(data);
                    // Tasks are currently not returned by API, so we default to empty
                    setTasks([]);
                })
                .catch(err => {
                    console.error(err);
                    toast.error('Project not found or error loading');
                    navigate('/manager/projects');
                })
                .finally(() => setIsLoading(false));

            // Load Project Labels
            projectLabelApi.getProjectLabels(projectId)
                .then(labels => {
                    setSelectedLabelIds(labels.map(pl => pl.labelId));
                })
                .catch(err => {
                    console.error('Failed to load project labels', err);
                });

            // Load Global/Available Labels for mapping config
            labelApi.getAll()
                .then(labels => setAllAvailableLabels(labels))
                .catch(err => console.error('Failed to load all labels', err));
        }
    }, [projectId, navigate]);

    useEffect(() => {
        if (project) {
            setEditName(project.name);
            setEditDescription(project.description || '');
            if (project.deadline) setEditDeadline(new Date(project.deadline));
        }
    }, [project, activeTab]);


    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!project) return null;

    // Derived State
    const projectMembers = project.members || [];
    const annotators = projectMembers
        .filter((m: any) => m.projectRole === 'ANNOTATOR' || m.projectRole === 'REVIEWER') // Simplified
        .map((m: any) => ({
            id: m.userId,
            name: m.user?.fullName || m.user?.email || 'Unknown',
            email: m.user?.email
        }));

    const filteredTasks = tasks.filter(task => { // using local tasks state
        const matchesSearch = task.imageName?.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
            task.id?.toLowerCase().includes(taskSearchQuery.toLowerCase());

        const matchesStatus = taskFilterStatus === 'all' || task.status === taskFilterStatus;
        const matchesAssignee = taskFilterAssignee === 'all' || task.assignee === taskFilterAssignee;

        return matchesSearch && matchesStatus && matchesAssignee;
    });

    const projectProgress = project._count?.tasks && project._count.tasks > 0
        ? 0 // Placeholder
        : 0;

    // Handlers
    const handleEditProject = async () => {
        if (!project || !editName || !editDeadline) return;

        try {
            // Construct labelConfig from selected labels
            // We want to map selected IDs -> full label objects
            const selectedLabels = allAvailableLabels.filter(l => selectedLabelIds.includes(l.id));

            // Format for labelConfig (assuming simple list of label objects for now)
            // If there's existing config, we might want to preserve other settings (like annotationType)
            // But user said "label_config represents which labels that project currently has", so we sync.
            // We'll try to preserve the 'meta' config if it exists.
            const metaConfig = project.labelConfig?.find((l: any) => l.type === 'meta');
            const newLabelConfig = [
                ...(metaConfig ? [metaConfig] : []),
                ...selectedLabels.map(l => ({
                    id: l.id,
                    name: l.name,
                    color: l.color
                }))
            ];

            await Promise.all([
                projectApi.update(project.id, {
                    name: editName,
                    description: editDescription,
                    deadline: editDeadline.toISOString(),
                    labelConfig: newLabelConfig
                }),
                // Update labels relation
                projectLabelApi.updateProjectLabels(project.id, selectedLabelIds)
            ]);

            // Refresh project data to be sure
            const updated = await projectApi.getById(project.id);
            setProject(updated);
            toast.success('Project updated successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to update project');
        }
    };

    const handleDeleteProject = async () => {
        if (!project) return;
        if (confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
            try {
                await projectApi.delete(project.id);
                navigate('/manager/projects');
                toast.success('Project deleted successfully!');
            } catch (error) {
                toast.error('Failed to delete project');
            }
        }
    };

    const isOverdue = (deadline?: string) => {
        if (!deadline) return false;
        return new Date(deadline) < new Date();
    };

    const getAnnotationTypeLabel = (project: Project) => {
        const meta = project.labelConfig?.find((l: any) => l.type === 'meta');
        const type = meta?.annotationType || 'bounding-box';
        const labels = {
            'bounding-box': 'Bounding Box',
            'polygon': 'Polygon',
            'segmentation': 'Segmentation',
        };
        return labels[type as keyof typeof labels] || type;
    };

    // Analytics Mock Data (Until we have real stats)
    // const statusData = [ ... ]; // removed unused
    // const annotatorData: any[] = [];
    // const progressData: any[] = [];

    const exportProjectCSV = () => {
        toast.success('CSV export coming soon');
    };

    const exportProjectJSON = () => {
        toast.success('JSON export coming soon');
    };

            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Approved</p>
                <p className="text-xl font-semibold">
                  {project.tasks.filter((t) => t.status === "approved").length}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs: Tasks & Analytics */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
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

                <Select
                  value={taskFilterStatus}
                  onValueChange={setTaskFilterStatus}
                >
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

                <Select
                  value={taskFilterAssignee}
                  onValueChange={setTaskFilterAssignee}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {annotators.map((a) => (
                      <SelectItem key={a.id} value={a.name}>
                        {a.name}
                      </SelectItem>
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
                        Showing {filteredTasks.length} of {project.tasks.length}{" "}
                        tasks
                      </p>
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
                                    {getAnnotationTypeLabel(project)}
                                </Badge>
                                <Badge className={project.status === ProjectStatus.ACTIVE ? 'bg-green-100 text-green-700' : 'bg-gray-100'}>
                                    {project.status}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground mb-4">{project.description}</p>

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
                            Deadline: {project.deadline ? format(new Date(project.deadline), 'MMM dd, yyyy') : 'No Deadline'}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Clock className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total images</p>
                                <p className="text-xl font-semibold">{project._count?.images || 0}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                            <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Members</p>
                                <p className="text-xl font-semibold">{project._count?.members || 0}</p>
                            </div>
                        </div>
                        {/* More stats can be added here */}
                        <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                            <div className="w-10 h-10 bg-yellow-200 rounded-lg flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Tasks</p>
                                <p className="text-xl font-semibold">{project._count?.tasks || 0}</p>
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
                        {/* Warning about missing tasks */}
                        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
                            <strong>Note:</strong> Task management API is currently under development. Task list might be empty.
                        </div>

                        {/* Search & Filter for Tasks */}
                        <Card className="p-4">
                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[250px]">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search tasks..."
                                            value={taskSearchQuery}
                                            onChange={(e) => setTaskSearchQuery(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <Select value={taskFilterAssignee} onValueChange={setTaskFilterAssignee}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Assignee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Assignees</SelectItem>
                                        {annotators.map((a: any) => (
                                            <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <Card className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-xl font-semibold">Tasks</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Showing {filteredTasks.length} tasks
                                            </p>
                                        </div>
                                    </div>

                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-gray-50">
                                                    <TableHead>Preview</TableHead>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredTasks.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                                            No tasks found
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    // Map tasks here when available
                                                    filteredTasks.map((_, i) => (
                                                        <TableRow key={i}><TableCell>Task</TableCell></TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </Card>
                            </div>

                            <div className="lg:col-span-1">
                                <ChatPanel
                                    projectId={project.id}
                                    projectName={project.name}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-6">
                        <Card className="p-12 text-center text-muted-foreground">
                            Analytics will be available once tasks are populated.
                        </Card>
                    </TabsContent>

                    <TabsContent value="settings">
                        <Card className="p-6">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold">Project Settings</h3>
                                </div>
                                <div className="space-y-2">
                                    <Label>Project Name</Label>
                                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Project Deadline</Label>
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
                                <Button onClick={handleEditProject} className="bg-blue-600 text-white">Save Changes</Button>
                            </div>

                            <div className="pt-6 border-t border-gray-200">
                                <h3 className="text-lg font-semibold mb-4">Label Management</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Select the labels that annotators can use in this project.
                                </p>
                                <LabelSelector
                                    projectId={project.id}
                                    selectedLabelIds={selectedLabelIds}
                                    onSelectionChange={setSelectedLabelIds}
                                    allowCreateLabel={true}
                                />
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={isAddImagesOpen} onOpenChange={setIsAddImagesOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Images</DialogTitle>
                        <DialogDescription>
                            Upload functionality is coming soon.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end">
                        <Button onClick={() => setIsAddImagesOpen(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    );
}
