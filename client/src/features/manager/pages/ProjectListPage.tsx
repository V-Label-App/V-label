import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Progress } from "../../../components/ui/progress";

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
  Loader2,
} from "lucide-react";
import { cn } from "../../../components/ui/utils";
import { format } from "date-fns";
import { toast } from "sonner";

import { useAuth } from "../../../context/AuthContext";
import { projectApi } from "../../../services/project.api";
import { projectCategoryApi } from "../../../services/project-category.api";
import type { ProjectCategory } from "../../../services/project-category.api";
import { ProjectStatus } from "../../../types/project.types";
import type { Project } from "../../../types/project.types";

export function ProjectListPage() {
  const navigate = useNavigate();
  const {} = useAuth();

  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | "ALL">(
    "ALL",
  );

  // Removed sorting state - not needed for cleaner UI

  // Create Project State
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectDeadline, setProjectDeadline] = useState<Date>();

  // Project Category State
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("none");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const data = await projectCategoryApi.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories", error);
      toast.error("Failed to load categories");
    }
  };

  // Fetch Projects
  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const queryPayload: any = {
        search: searchQuery || undefined,
        status: filterStatus === "ALL" ? undefined : filterStatus,
      };

      const customResponse = await projectApi.getAll(queryPayload);
      const data = customResponse.data || [];
      setProjects(data as Project[]);
    } catch (error) {
      console.error("Failed to fetch projects", error);
      toast.error("Failed to load projects");
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
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await projectApi.create({
        name: projectName,
        description: projectDescription,
        // If "none", send undefined. If valid ID, send ID.
        categoryId:
          selectedCategoryId === "none" ? undefined : selectedCategoryId,
        deadline: projectDeadline.toISOString(),
        enableAiAssistance: false,
        // Default to bounding-box as UI is removed
        labelConfig: [{ type: "meta", annotationType: "bounding-box" }],
      });

      toast.success("Project created successfully!");
      setIsCreateProjectOpen(false);

      // Reset form
      setProjectName("");
      setProjectDescription("");
      setSelectedCategoryId("none"); // Reset to "none"
      setProjectDeadline(undefined);

      // Refresh list
      fetchProjects();
    } catch (error: any) {
      console.error("Create project failed", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create project";
      toast.error(errorMessage);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "ALL" || project.status === filterStatus;
    const matchesCategory =
      filterCategory === "ALL" || project.categoryId === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadgeColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.ACTIVE:
        return "bg-blue-50 text-blue-700 border-blue-200";
      case ProjectStatus.COMPLETED:
        return "bg-green-50 text-green-700 border-green-200";
      case ProjectStatus.PAUSED:
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case ProjectStatus.ARCHIVED:
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const memberCount = (project: Project) => Math.max(0, (project._count?.members || 0) - 1);

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

            <Select
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as ProjectStatus | "ALL")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value={ProjectStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={ProjectStatus.PAUSED}>Paused</SelectItem>
                <SelectItem value={ProjectStatus.COMPLETED}>
                  Completed
                </SelectItem>
                <SelectItem value={ProjectStatus.ARCHIVED}>Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Projects Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderKanban className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {projects.length === 0 ? "No projects yet" : "No projects found"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterStatus !== "ALL" || filterCategory !== "ALL"
                ? "Try adjusting your filters"
                : "Get started by creating your first project"}
            </p>
            {!searchQuery &&
              filterStatus === "ALL" &&
              filterCategory === "ALL" && (
                <Button
                  className="bg-blue-500 hover:bg-blue-600"
                  onClick={() => setIsCreateProjectOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </Button>
              )}
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-200">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[30%] font-bold text-slate-700">Project Name</TableHead>
                    <TableHead className="w-[12%] font-bold text-slate-700">Deadline</TableHead>
                    <TableHead className="w-[13%] font-bold text-slate-700">Category</TableHead>
                    <TableHead className="w-[15%] font-bold text-slate-700">Progress</TableHead>
                    <TableHead className="w-[10%] text-center font-bold text-slate-700">Images</TableHead>
                    <TableHead className="w-[10%] text-center font-bold text-slate-700">Members</TableHead>
                    <TableHead className="w-[10%] font-bold text-slate-700">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => {
                    const progress = project.progress || 0;
                    return (
                      <TableRow
                        key={project.id}
                        className="hover:bg-slate-50/80 transition-all cursor-pointer group h-[80px] border-b border-slate-100 last:border-0"
                        onClick={() => navigate(`/manager/projects/${project.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FolderKanban className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                {project.name}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {project.description || "No description"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {project.deadline ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <CalendarIcon className="w-3.5 h-3.5" />
                                <span className="text-sm font-medium">
                                  {format(new Date(project.deadline), "MMM d, yyyy")}
                                </span>
                              </div>
                              {new Date(project.deadline) < new Date() && (
                                <Badge className="bg-red-50 text-red-600 border-none text-[10px] w-fit px-1 h-4">
                                  OVERDUE
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 italic">No deadline</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {project.category ? (
                            <Badge className="bg-white text-indigo-600 border border-indigo-100 font-medium px-2 py-0.5 shadow-sm">
                              {project.category.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-300 italic">No category</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5 min-w-[120px]">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <span>Progress</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-1.5 bg-slate-100" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center justify-center gap-1">
                            <span className="text-sm font-medium text-slate-700">
                              {project.totalImages || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center items-center gap-1.5 text-slate-600">
                            <Users className="w-4 h-4" />
                            <span className="text-sm font-medium">{memberCount(project)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border-none font-bold text-[10px] uppercase tracking-widest px-2 shadow-sm w-[90px] justify-center",
                              getStatusBadgeColor(project.status)
                            )}
                          >
                            {project.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
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
                <Select
                  value={selectedCategoryId}
                  onValueChange={setSelectedCategoryId}
                >
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
                  setSelectedCategoryId("none");
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
