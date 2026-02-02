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

import { useAuth } from '../../../context/AuthContext';
import { projectApi } from '../../../services/project.api';
import { projectCategoryApi } from '../../../services/project-category.api';
import type { ProjectCategory } from '../../../services/project-category.api';
import { ProjectStatus } from '../../../types/project.types';
import type { Project } from '../../../types/project.types';

export function ProjectListPage() {
  const navigate = useNavigate();
  const { } = useAuth();

  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'ALL'>('ALL');

  // Create Project State
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectDeadline, setProjectDeadline] = useState<Date>();

  // Project Category State
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('none');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');


  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const data = await projectCategoryApi.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories', error);
      toast.error('Failed to load categories');
    }
  };

  // Fetch Projects
  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const queryPayload: any = {
        search: searchQuery || undefined,
        status: filterStatus === 'ALL' ? undefined : filterStatus,
      };

      const customResponse = await projectApi.getAll(queryPayload);
      const data = customResponse.data || [];
      setProjects(data as Project[]);
    } catch (error) {
      console.error('Failed to fetch projects', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  // Load categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

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
        // If "none", send undefined. If valid ID, send ID.
        categoryId: selectedCategoryId === "none" ? undefined : selectedCategoryId,
        deadline: projectDeadline.toISOString(),
        enableAiAssistance: false,
        // Default to bounding-box as UI is removed
        labelConfig: [{ type: 'meta', annotationType: 'bounding-box' }]
      });

      toast.success('Project created successfully!');
      setIsCreateProjectOpen(false);

      // Reset form
      setProjectName('');
      setProjectDescription('');
      setSelectedCategoryId('none'); // Reset to "none"
      setProjectDeadline(undefined);

      // Refresh list
      fetchProjects();
    } catch (error: any) {
      console.error('Create project failed', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create project';
      toast.error(errorMessage);
    }
  };




  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || project.status === filterStatus;

    const matchesCategory = filterCategory === 'ALL' || project.categoryId === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* Header */}



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

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
        ) : filteredProjects.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No projects found matching your filters
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const progress = project.progress || 0;

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
                        <p className="text-xs text-muted-foreground mb-1">
                          {project.id}
                        </p>
                        {project.category && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {project.category.name}
                          </span>
                        )}
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

                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>
                        {project._count?.members || 0} members
                      </span>
                    </div>
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

              <div className="space-y-2">
                <Label>Project Category</Label>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4">
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
                  setSelectedCategoryId('none');
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
    </div >
  );
}         
