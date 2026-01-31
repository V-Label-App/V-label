import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Progress } from "../../../components/ui/progress";
import { Badge } from "../../../components/ui/badge";
import { Calendar } from "../../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import {
  FolderKanban,
  Search,
  Plus,
  Tag,
  Users,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { UserNav } from "../../../components/common/UserNav";
import { useAuth } from "../../../context/AuthContext";
import { getProjects, addProject } from "../data/projects.mock";
import type { Project } from "../data/projects.mock";
import { projectCategoryApi } from "../../../services/project-category.api";
import type { ProjectCategory } from "../../../services/project-category.api";

export function ProjectListPage() {
  const navigate = useNavigate();
  const { isImpersonating } = useAuth();
  const [projects, setProjects] = useState<Project[]>(getProjects());
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAnnotationType, setFilterAnnotationType] =
    useState<string>("all");

  // Create Project Form State
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectDeadline, setProjectDeadline] = useState<Date>();

  const fetchCategories = async () => {
    try {
      const data = await projectCategoryApi.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Filtered Projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.id.toLowerCase().includes(searchQuery.toLowerCase());

      const projectProgress =
        project.tasks.length > 0
          ? (project.tasks.filter((t) => t.status === "approved").length /
              project.tasks.length) *
            100
          : 0;

      let matchesStatus = true;
      if (filterStatus === "completed") {
        matchesStatus = projectProgress === 100;
      } else if (filterStatus === "in-progress") {
        matchesStatus = projectProgress > 0 && projectProgress < 100;
      } else if (filterStatus === "not-started") {
        matchesStatus = projectProgress === 0;
      }

      const matchesType =
        filterAnnotationType === "all" ||
        project.annotationType === filterAnnotationType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [projects, searchQuery, filterStatus, filterAnnotationType]);

  const handleCreateProject = () => {
    if (!projectName || !projectDescription || !projectDeadline) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newProject: Project = {
      id: `PRJ-${Date.now()}`,
      name: projectName,
      description: projectDescription,
      categoryId: selectedCategoryId || undefined,
      annotationType: "bounding-box",
      deadline: format(projectDeadline, "yyyy-MM-dd"),
      createdAt: format(new Date(), "yyyy-MM-dd"),
      totalImages: 0,
      assignedTo: [],
      labelIds: [],
      tasks: [],
    };

    addProject(newProject);
    setProjects(getProjects()); // Refresh list

    // Reset form
    setProjectName("");
    setProjectDescription("");
    setProjectDeadline(undefined);
    setSelectedCategoryId("");
    setIsCreateProjectOpen(false);

    toast.success(
      "Project created successfully! You can now add images and labels.",
    );
  };

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId || categoryId === "none") return "No Category";
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : "Unknown Category";
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
            <UserNav />
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
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Category</span>
                      <Badge variant="outline" className="text-xs">
                        {getCategoryName(project.categoryId)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Deadline</span>
                      <span
                        className={
                          isProjectOverdue
                            ? "text-red-600 font-medium"
                            : "font-medium"
                        }
                      >
                        {format(new Date(project.deadline), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>
                        Assigned to {project.assignedTo.length} annotator
                        {project.assignedTo.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {project.labelIds && project.labelIds.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Tag className="w-4 h-4" />
                        <span>
                          {project.labelIds.length} label
                          {project.labelIds.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
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
              Set up a new annotation project with images and assign annotators
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
                <Label>Description *</Label>
                <Textarea
                  placeholder="Describe the project goals and requirements..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Project Category</Label>
                <Select
                  value={selectedCategoryId}
                  onValueChange={setSelectedCategoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
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
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {projectDeadline
                          ? format(projectDeadline, "PPP")
                          : "Pick a date"}
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
                  setProjectName("");
                  setProjectDescription("");
                  setProjectDeadline(undefined);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-500 hover:bg-blue-600"
                onClick={handleCreateProject}
                disabled={
                  !projectName || !projectDescription || !projectDeadline
                }
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
