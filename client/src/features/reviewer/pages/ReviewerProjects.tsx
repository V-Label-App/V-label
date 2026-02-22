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

import { FolderKanban, Loader2, Users, ClipboardCheck, Search } from "lucide-react";
import { reviewerApi } from "../../../services/reviewer.api";
import type { ReviewerProject } from "../../../services/reviewer.api";
import { toast } from "sonner";

interface ReviewerProjectsProps {
  onOpenWorkspace: (taskId: string, mode: "review") => void;
}

export function ReviewerProjects(_props: ReviewerProjectsProps) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ReviewerProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const projectsData = await reviewerApi.getMyProjects();
        setProjects(projectsData);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        toast.error('Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Filter projects by search
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.id.toLowerCase().includes(searchQuery.toLowerCase())
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
          <h2 className="text-3xl font-semibold mb-2">Review Projects</h2>
          <p className="text-muted-foreground">
            View projects assigned to you for quality review
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
            <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {projects.length === 0 ? "No projects yet" : "No projects found"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {projects.length === 0
                ? "You haven't been added to any review projects yet"
                : "Try adjusting your search"}
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 border-b border-gray-200">
                  <TableRow>
                    <TableHead className="w-[35%]">Project Name</TableHead>
                    <TableHead className="w-[15%]">Category</TableHead>
                    <TableHead className="w-[20%]">Progress</TableHead>
                    <TableHead className="w-[10%]">Review Tasks</TableHead>
                    <TableHead className="w-[10%]">Members</TableHead>
                    <TableHead className="w-[10%]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200">
                  {filteredProjects.map((project) => {
                    const progress = project.progress || 0;
                    return (
                      <TableRow
                        key={project.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/reviewer/projects/${project.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FolderKanban className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="min-w-0">
                              <div
                                className="font-semibold text-gray-900 line-clamp-2 max-w-full"
                                title={project.name}
                              >
                                {project.name}
                              </div>
                              <div className="text-xs text-gray-500 truncate max-w-full">
                                {project.description || "No description"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {project.category ? (
                            <Badge className="bg-purple-50 text-purple-700 border border-purple-200">
                              {project.category.name}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-[100px]">
                              <Progress value={progress} className="h-2" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 w-12 text-right">
                              {Math.round(progress)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ClipboardCheck className="w-4 h-4 text-purple-500" />
                            <span className="text-sm font-medium text-gray-700">
                              {project._count.tasks || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">
                              {project._count.members || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`border ${getStatusBadgeColor(project.status)}`}
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
