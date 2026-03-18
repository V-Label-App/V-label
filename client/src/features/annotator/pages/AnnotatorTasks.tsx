import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { Progress } from "../../../components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";

import {
  FolderKanban,
  Loader2,
  Users,
  Search,
  Sparkles,
} from "lucide-react";
import { annotatorApi } from "../../../services/annotator.api";
import type { AnnotatorProject } from "../../../services/annotator.api";
import { toast } from "sonner";
import { cn } from "../../../components/ui/utils";

interface AnnotatorTasksProps {
  onOpenWorkspace: (taskId: string, mode: "annotate") => void;
}

export function AnnotatorTasks(_props: AnnotatorTasksProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<AnnotatorProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const projectsData = await annotatorApi.getMyProjects();
        setProjects(projectsData);
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        toast.error("Failed to load projects");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Filter projects by search
  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "COMPLETED":
        return "bg-green-50 text-green-700 border-green-200";
      case "PAUSED":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "ARCHIVED":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-semibold mb-2">My Projects</h2>
          <p className="text-muted-foreground">
            View projects you're assigned to and manage your tasks
          </p>
        </div>

        {/* Search Bar */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
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
          </div>
        </Card>

        {/* Projects Table */}
        {filteredProjects.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderKanban className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {projects.length === 0 ? "No projects yet" : "No projects found"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {projects.length === 0
                ? "You haven't been added to any projects yet"
                : "Try adjusting your search"}
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-200">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[35%] font-bold text-slate-700">Project Name</TableHead>
                    <TableHead className="w-[15%] font-bold text-slate-700">Category</TableHead>
                    <TableHead className="w-[20%] font-bold text-slate-700">Progress</TableHead>
                    <TableHead className="w-[10%] text-center font-bold text-slate-700">My Tasks</TableHead>
                    <TableHead className="w-[10%] text-center font-bold text-slate-700">Members</TableHead>
                    <TableHead className="w-[10%] font-bold text-slate-700">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => {
                    const progress = project.progress || 0;
                    const isPaused = project.status === "PAUSED";
                    const memberCount = Math.max(0, (project._count.members || 0) - 1);
                    return (
                      <TableRow
                        key={project.id}
                        className={cn(
                          "hover:bg-slate-50/80 transition-all cursor-pointer group h-[80px] border-b border-slate-100 last:border-0",
                          isPaused && "opacity-60 cursor-not-allowed"
                        )}
                        onClick={() =>
                          !isPaused &&
                          navigate(`/annotator/projects/${project.id}`)
                        }
                        title={isPaused ? "This project is paused" : undefined}
                      >
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FolderKanban className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div
                                  className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors truncate"
                                  title={project.name}
                                >
                                  {project.name}
                                </div>
                                {project.enableAiAssistance && (
                                  <Badge className="bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 shrink-0 text-xs px-1.5 py-0">
                                    <Sparkles className="w-3 h-3" />
                                    AI
                                  </Badge>
                                )}
                              </div>
                              <div
                                className="text-xs text-slate-500 truncate"
                                title={project.description || "No description"}
                              >
                                {project.description || "No description"}
                              </div>
                            </div>
                          </div>
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
                              {project._count.tasks || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center items-center gap-1.5 text-slate-600">
                            <Users className="w-4 h-4" />
                            <span className="text-sm font-medium">{memberCount}</span>
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
    </div>
  );
}
