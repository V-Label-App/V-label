import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Progress } from '../../../components/ui/progress';
import { Badge } from '../../../components/ui/badge';
import { Calendar } from '../../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import {
    FolderKanban,
    Search,
    Plus,
    Tag,
    Users,
    Calendar as CalendarIcon,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { UserNav } from '../../../components/common/UserNav';
import { useAuth } from '../../../context/AuthContext';
import { projectApi } from '../../../services/project.api';
import { ProjectStatus } from '../../../types/project.types';
import type { Project } from '../../../types/project.types';

export function ProjectListPage() {
    const navigate = useNavigate();
    const { isImpersonating } = useAuth();

    // Data State
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'ALL'>('ALL');
    // const [filterAnnotationType, setFilterAnnotationType] = useState<string>('all'); // Not supported by backend yet

    // Create Project Form State
    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [annotationType, setAnnotationType] = useState<'bounding-box' | 'polygon' | 'segmentation'>('bounding-box');
    const [projectDeadline, setProjectDeadline] = useState<Date>();

    // Fetch Projects
    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            const response = await projectApi.getAll({
                search: searchQuery || undefined,
                status: filterStatus === 'ALL' ? undefined : filterStatus
            });
            setProjects(response.data);
        } catch (error) {
            console.error('Failed to fetch projects', error);
            toast.error('Failed to load projects');
        } finally {
            setIsLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProjects();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, filterStatus]);

    const handleCreateProject = async () => {
        if (!projectName || !projectDeadline) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            await projectApi.create({
                name: projectName,
                description: projectDescription,
                deadline: projectDeadline.toISOString(),
                enableAiAssistance: false,
                // store annotationType in labelConfig for now as metadata
                labelConfig: [{ type: 'meta', annotationType }]
            });

            toast.success('Project created successfully!');
            setIsCreateProjectOpen(false);

            // Reset form
            setProjectName('');
            setProjectDescription('');
            setAnnotationType('bounding-box');
            setProjectDeadline(undefined);

            // Refresh list
            fetchProjects();
        } catch (error) {
            console.error('Create project failed', error);
            toast.error('Failed to create project');
        }
    };

    const getAnnotationTypeLabel = (project: Project) => {
        // Try to find annotation type in labelConfig
        const meta = project.labelConfig?.find((l: any) => l.type === 'meta');
        const type = meta?.annotationType || 'bounding-box';

        const labels = {
            'bounding-box': 'Bounding Box',
            'polygon': 'Polygon',
            'segmentation': 'Segmentation',
        };
        return labels[type as keyof typeof labels] || type;
    };

    const getProgress = (project: Project) => {
        // Calculate progress based on _count if available, or 0
        if (!project._count || project._count.tasks === 0) return 0;
        // Since we don't have task status details in list view, return 0 or placeholder
        // To get real progress, backend needs to return status counts.
        return 0;
    };
    return labels[type as keyof typeof labels];
  };

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
                <p className="text-xs text-muted-foreground">
                  Manager Dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-semibold mb-2">Projects</h2>
            <p className="text-muted-foreground">
              Manage and monitor all annotation projects
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/manager/labels")}
            >
              <Tag className="w-4 h-4 mr-2" />
              Manage Labels
            </Button>
            <Button
              className="bg-blue-500 hover:bg-blue-600"
              onClick={() => setIsCreateProjectOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filterAnnotationType}
              onValueChange={setFilterAnnotationType}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Annotation type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bounding-box">Bounding Box</SelectItem>
                <SelectItem value="polygon">Polygon</SelectItem>
                <SelectItem value="segmentation">Segmentation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No projects found matching your filters
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const progress =
                project.tasks.length > 0
                  ? (project.tasks.filter((t) => t.status === "approved")
                      .length /
                      project.tasks.length) *
                    100
                  : 0;

              const isProjectOverdue = new Date(project.deadline) < new Date();

              return (
                <Card
                  key={project.id}
                  className="p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border-t-4"
                  style={{
                    borderTopColor: progress === 100 ? "#22c55e" : "#3b82f6",
                  }}
                  onClick={() => navigate(`/manager/projects/${project.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FolderKanban className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{project.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {project.id}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {project.description}
                  </p>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Total Images
                      </span>
                      <span className="font-medium">{project.totalImages}</span>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <Card className="p-4 mb-6">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[250px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search projects by name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as ProjectStatus | 'ALL')}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value={ProjectStatus.ACTIVE}>Active</SelectItem>
                                <SelectItem value={ProjectStatus.PAUSED}>Paused</SelectItem>
                                <SelectItem value={ProjectStatus.COMPLETED}>Completed</SelectItem>
                                <SelectItem value={ProjectStatus.ARCHIVED}>Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </Card>

                {/* Projects Grid */}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : projects.length === 0 ? (
                    <Card className="p-12 text-center">
                        <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No projects found</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => {
                            const progress = getProgress(project);
                            const isProjectOverdue = project.deadline ? new Date(project.deadline) < new Date() : false;

                            return (
                                <Card
                                    key={project.id}
                                    className="p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border-t-4"
                                    style={{ borderTopColor: progress === 100 ? '#22c55e' : '#3b82f6' }}
                                    onClick={() => navigate(`/manager/projects/${project.id}`)}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <FolderKanban className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{project.name}</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {project.status}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                        {project.description || 'No description'}
                                    </p>

                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Progress</span>
                                            <span className="font-semibold">{Math.round(progress)}%</span>
                                        </div>
                                        <Progress value={progress} className="h-1.5" />
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Total Images</span>
                                            <span className="font-medium">{project.totalImages || 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Annotation Type</span>
                                            <Badge variant="outline" className="text-xs">
                                                {getAnnotationTypeLabel(project)}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Deadline</span>
                                            <span className={isProjectOverdue ? 'text-red-600 font-medium' : 'font-medium'}>
                                                {project.deadline ? format(new Date(project.deadline), 'MMM dd, yyyy') : 'No deadline'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Users className="w-4 h-4" />
                                            <span>
                                                {project._count?.members || 0} members
                                            </span>
                                        </div>
                                        {/* 
                                         // Label count not strictly available in list response _count unless requested
                                         // skipping for now
                                        */}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Project Dialog */}
            <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogDescription>
                            Set up a new annotation project
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 pt-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Project Name *</Label>
                                <Input
                                    placeholder="e.g. Medical Imaging Classification"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    placeholder="Describe the project goals..."
                                    value={projectDescription}
                                    onChange={(e) => setProjectDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Annotation Type *</Label>
                                    <Select value={annotationType} onValueChange={(v: any) => setAnnotationType(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="bounding-box">Bounding Box</SelectItem>
                                            <SelectItem value="polygon">Polygon</SelectItem>
                                            <SelectItem value="segmentation">Segmentation</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Project Deadline *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="w-full justify-start text-left">
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {projectDeadline ? format(projectDeadline, 'PPP') : 'Pick a date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={projectDeadline}
                                                onSelect={setProjectDeadline}
                                                disabled={(date) => date < new Date()}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setIsCreateProjectOpen(false);
                                    setProjectName('');
                                    setProjectDescription('');
                                    setProjectDeadline(undefined);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-blue-500 hover:bg-blue-600"
                                onClick={handleCreateProject}
                                disabled={!projectName || !projectDeadline}
                            >
                                Create Project
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}         
