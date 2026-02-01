import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { ScrollArea } from '../../../components/ui/scroll-area';
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
    Loader2,
    Shield,
    Eye,
    Pen,
    CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

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
    const { } = useAuth();

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
    const [taskFilterStatus, setTaskFilterStatus] = useState<string>('all');
    const [taskFilterAssignee, setTaskFilterAssignee] = useState<string>('all');

    // Edit Project State - Pre-fill when opening
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editDeadline, setEditDeadline] = useState<Date>();

    // Member Management State
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [potentialMembers, setPotentialMembers] = useState<any[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<any[]>([]); // Multi-select
    const [selectedRole, setSelectedRole] = useState('ANNOTATOR');
    const [isSearchingMembers, setIsSearchingMembers] = useState(false);
    const [isAddingMembers, setIsAddingMembers] = useState(false);

    // ... (keep Edit Role State)

    // ... (keep Handlers)

    const handleSearchUsers = async (query: string) => {
        if (!project) return;
        setMemberSearchQuery(query);

        setIsSearchingMembers(true);
        try {
            // Debounce could be added here, but for now direct call
            const users = await projectApi.searchPotentialMembers(project.id, query);
            setPotentialMembers(users);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearchingMembers(false);
        }
    };


    const handleToggleMemberSelection = (user: any) => {
        setSelectedMembers(prev => {
            const exists = prev.find(m => m.id === user.id);
            if (exists) {
                return prev.filter(m => m.id !== user.id);
            } else {
                return [...prev, user];
            }
        });
    };

    const handleAddMembers = async () => {
        if (!project || selectedMembers.length === 0) return;

        setIsAddingMembers(true);
        try {
            // Process in parallel for speed, though sequentially might be safer for rate limits.
            // Parallel is fine for < 100 usually.
            const promises = selectedMembers.map(user =>
                projectApi.addMember(project.id, user.id, selectedRole)
            );

            await Promise.all(promises);

            toast.success(`Successfully added ${selectedMembers.length} members to the project`);

            setIsAddMemberOpen(false);
            setSelectedMembers([]);
            setMemberSearchQuery('');
            setPotentialMembers([]);

            // Refresh project
            const updated = await projectApi.getById(project.id);
            setProject(updated);
        } catch (error: any) {
            console.error(error);
            toast.error('Failed to add some members. Please try again.');
        } finally {
            setIsAddingMembers(false);
        }
    };

    // ...



    // Edit Role State
    const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState<any>(null);
    const [roleToUpdate, setRoleToUpdate] = useState('');

    // Remove Member State
    const [isRemoveMemberOpen, setIsRemoveMemberOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<any>(null);

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

    // Trigger initial search when Add Member dialog opens
    useEffect(() => {
        if (isAddMemberOpen) {
            handleSearchUsers('');
        } else {
            // Cleanup when closed
            setMemberSearchQuery('');
            setPotentialMembers([]);
            setSelectedMembers([]);
        }
    }, [isAddMemberOpen]);


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

    // Member Management Handlers




    const handleUpdateRole = async () => {
        if (!memberToEdit || !project) return;

        try {
            await projectApi.updateMemberRole(project.id, memberToEdit.userId, roleToUpdate);
            toast.success('Member role updated successfully');

            // Update local state
            setProject(prev => {
                if (!prev) return null;
                const updatedMembers = (prev.members || []).map((m: any) =>
                    m.userId === memberToEdit.userId ? { ...m, projectRole: roleToUpdate } : m
                );
                return { ...prev, members: updatedMembers };
            });

            setIsEditRoleOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to update member role');
        }
    };

    const confirmRemoveMember = (member: any) => {
        setMemberToRemove(member);
        setIsRemoveMemberOpen(true);
    };

    const handleRemoveMember = async () => {
        if (!memberToRemove || !project) return;

        try {
            await projectApi.removeMember(project.id, memberToRemove.userId);
            toast.success('Member removed successfully');

            // Update local state
            setProject(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    members: (prev.members || []).filter((m: any) => m.userId !== memberToRemove.userId)
                };
            });

            setIsRemoveMemberOpen(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to remove member');
        }
    };

    const openEditRoleDialog = (member: any) => {
        setMemberToEdit(member);
        setRoleToUpdate(member.projectRole || 'ANNOTATOR');
        setIsEditRoleOpen(true);
    };
    return (
        <div className="min-h-screen bg-gray-50 animate-in fade-in slide-in-from-bottom-5 duration-700">


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
                                <DropdownMenuItem onClick={exportProjectCSV}>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Export as CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={exportProjectJSON}>
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

                        <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                            <div className="w-10 h-10 bg-yellow-200 rounded-lg flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Tasks</p>
                                <p className="text-xl font-semibold">{project._count?.tasks || 0}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                            <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Approved</p>
                                <p className="text-xl font-semibold">
                                    {tasks.filter((t: any) => t.status === "approved").length}
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
                        <TabsTrigger value="members">Members</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
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

                    <TabsContent value="members" className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h3 className="text-2xl font-bold tracking-tight">Team Members</h3>
                                <p className="text-muted-foreground">
                                    Manage access and roles for this project.
                                </p>
                            </div>
                            <Button onClick={() => setIsAddMemberOpen(true)}>
                                <Users className="w-4 h-4 mr-2" />
                                Add Member
                            </Button>
                        </div>

                        {[
                            {
                                title: 'Project Managers',
                                icon: Shield,
                                color: 'text-violet-600',
                                bgColor: 'bg-violet-100',
                                role: 'MANAGER',
                                description: 'Has full access to project settings and members.'
                            },
                            {
                                title: 'Reviewers',
                                icon: Eye,
                                color: 'text-blue-600',
                                bgColor: 'bg-blue-100',
                                role: 'REVIEWER',
                                description: 'Can review and approve annotations.'
                            },
                            {
                                title: 'Annotators',
                                icon: Pen,
                                color: 'text-emerald-600',
                                bgColor: 'bg-emerald-100',
                                role: 'ANNOTATOR',
                                description: 'Can label tasks assigned to them.'
                            }
                        ].map((group) => {
                            const groupMembers = projectMembers.filter((m: any) => m.projectRole === group.role);
                            return (
                                <Card key={group.role} className="p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className={`p-2 rounded-lg ${group.bgColor}`}>
                                            <group.icon className={`w-5 h-5 ${group.color}`} />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-semibold flex items-center gap-2">
                                                {group.title}
                                                <Badge variant="secondary" className="ml-2 font-normal">
                                                    {groupMembers.length}
                                                </Badge>
                                            </h4>
                                            <p className="text-sm text-muted-foreground">{group.description}</p>
                                        </div>
                                    </div>

                                    {groupMembers.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                                            No {group.title.toLowerCase()} assigned.
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>User</TableHead>
                                                    <TableHead>Joined</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {groupMembers.map((member: any) => (
                                                    <TableRow key={member.id}>
                                                        <TableCell className="flex items-center gap-3">
                                                            <Avatar className="w-8 h-8">
                                                                <AvatarImage src={member.user?.avatarUrl} />
                                                                <AvatarFallback>{member.user?.fullName?.[0] || member.user?.email?.[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-medium">{member.user?.fullName || 'Unknown'}</p>
                                                                <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">
                                                            {format(new Date(member.joinedAt), 'MMM dd, yyyy')}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0"
                                                                    onClick={() => openEditRoleDialog(member)}
                                                                >
                                                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                                                    <span className="sr-only">Edit Role</span>
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={() => confirmRemoveMember(member)}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </Card>
                            );
                        })}
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
                            </div>

                            <div className="pt-6 border-t border-gray-200 mt-6">
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

                            <div className="pt-6 border-t border-gray-200 mt-6 flex justify-end">
                                <Button onClick={handleEditProject} className="bg-blue-600 text-white">
                                    Save Changes
                                </Button>
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-6">
                        <Card className="p-12 text-center text-muted-foreground">
                            Analytics will be available once tasks are populated.
                        </Card>
                    </TabsContent>
                </Tabs>
                {/* Edit Role Dialog */}
                <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Edit Member Role</DialogTitle>
                            <DialogDescription>
                                Change the role for {memberToEdit?.user?.fullName}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="role" className="text-right">
                                    Role
                                </Label>
                                <Select value={roleToUpdate} onValueChange={setRoleToUpdate}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ANNOTATOR">Annotator</SelectItem>
                                        <SelectItem value="REVIEWER">Reviewer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditRoleOpen(false)}>Cancel</Button>
                            <Button onClick={handleUpdateRole}>Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Remove Member Alert Dialog */}
                <AlertDialog open={isRemoveMemberOpen} onOpenChange={setIsRemoveMemberOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will remove {memberToRemove?.user?.fullName} from the project. They will no longer have access to tasks and data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleRemoveMember}>
                                Remove Member
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

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

                {/* Add Member Dialog */}
                <Dialog open={isAddMemberOpen} onOpenChange={(open) => {
                    setIsAddMemberOpen(open);
                    if (open) {
                        handleSearchUsers('');
                    } else {
                        // Reset state on close
                        setMemberSearchQuery('');
                        setPotentialMembers([]);
                        setSelectedMembers([]);
                    }
                }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add Members to Project</DialogTitle>
                            <DialogDescription>
                                Search and select multiple users to invite.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Search User</Label>
                                <Input
                                    placeholder="Search by name or email..."
                                    value={memberSearchQuery}
                                    onChange={(e) => handleSearchUsers(e.target.value)}
                                />

                                {/* Selected Members Summary */}
                                {selectedMembers.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-blue-50 rounded-md border border-blue-100 max-h-[100px] overflow-y-auto">
                                        {selectedMembers.map(user => (
                                            <Badge key={user.id} variant="secondary" className="bg-white hover:bg-white text-blue-700 border-blue-200 pl-2 pr-1 py-1 flex items-center gap-1">
                                                {user.fullName || user.email}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-4 w-4 p-0 ml-1 rounded-full hover:bg-red-100 hover:text-red-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleMemberSelection(user);
                                                    }}
                                                >
                                                    <span className="sr-only">Remove</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                                </Button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {/* Potential Members List */}
                                <Card className="max-h-[200px] overflow-auto mt-2 border-gray-200 shadow-sm">
                                    <ScrollArea className="h-full">
                                        <div className="p-1 space-y-1">
                                            {isSearchingMembers && <div className="p-2 text-center text-xs text-muted-foreground">Searching...</div>}

                                            {!isSearchingMembers && potentialMembers.length === 0 && (
                                                <div className="p-2 text-center text-xs text-muted-foreground">
                                                    {memberSearchQuery.trim() === ''
                                                        ? "No other users available to add."
                                                        : "No users found matching your search."}
                                                </div>
                                            )}

                                            {potentialMembers.map(user => {
                                                const isSelected = selectedMembers.some(m => m.id === user.id);
                                                return (
                                                    <div
                                                        key={user.id}
                                                        className={`
                                                                        flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors
                                                                        ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-100'}
                                                                    `}
                                                        onClick={() => handleToggleMemberSelection(user)}
                                                    >
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                                            {isSelected && <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white"><polyline points="20 6 9 17 4 12" /></svg>}
                                                        </div>
                                                        <Avatar className="w-8 h-8">
                                                            <AvatarImage src={user.avatarUrl} />
                                                            <AvatarFallback>{user.fullName?.[0] || user.email?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 overflow-hidden">
                                                            <p className="text-sm font-medium truncate">{user.fullName}</p>
                                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </ScrollArea>
                                </Card>
                            </div>

                            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                <Label>Role for Selected Members</Label>
                                <Select value={selectedRole} onValueChange={setSelectedRole}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ANNOTATOR">Annotator</SelectItem>
                                        <SelectItem value="REVIEWER">Reviewer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddMembers} disabled={selectedMembers.length === 0 || isAddingMembers}>
                                {isAddingMembers ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    <>Add {selectedMembers.length > 0 ? `${selectedMembers.length} Members` : 'Members'}</>
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

