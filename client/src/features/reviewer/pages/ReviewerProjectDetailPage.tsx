import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Progress } from "../../../components/ui/progress";
import { Input } from "../../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  ArrowLeft,
  FolderOpen,
  Clock,
  CheckCircle2,
  Loader2,
  MessageCircle,
  ClipboardCheck,
  XCircle,
  Search,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { projectApi } from "../../../services/project.api";
import { reviewerApi } from "../../../services/reviewer.api";
import type { ReviewQueueItem } from "../../../services/reviewer.api";
import { ChatPanel } from "../../../components/chat/ChatPanel";

export function ReviewerProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<ReviewQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reviews");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("SUBMITTED");

  // Fetch project details
  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;

      try {
        const projectData = await projectApi.getById(projectId);
        setProject(projectData);
      } catch (error) {
        console.error("Failed to fetch project:", error);
        toast.error("Failed to load project");
      }
    };

    fetchProject();
  }, [projectId]);

  // Fetch review queue for this project
  useEffect(() => {
    const fetchTasks = async () => {
      if (!projectId) return;

      setIsLoading(true);
      try {
        const result = await reviewerApi.getReviewQueue({
          projectId,
          status: filterStatus === "ALL" ? undefined : filterStatus,
          page: 1,
          limit: 100,
        });
        setTasks(result.data);
      } catch (error) {
        console.error("Failed to fetch review queue:", error);
        toast.error("Failed to load review queue");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [projectId, filterStatus]);

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const pendingTasks = tasks.filter((t) => t.status === "SUBMITTED");
  const approvedTasks = tasks.filter((t) => t.status === "APPROVED");
  const rejectedTasks = tasks.filter((t) => t.status === "REJECTED");

  const getStatusBadge = (status: string) => {
    const styles = {
      SUBMITTED: { className: "bg-blue-100 text-blue-700 border-blue-300", label: "Pending" },
      APPROVED: { className: "bg-green-100 text-green-700 border-green-300", label: "Approved" },
      REJECTED: { className: "bg-red-100 text-red-700 border-red-300", label: "Rejected" },
      IN_PROGRESS: { className: "bg-yellow-100 text-yellow-700 border-yellow-300", label: "In Progress" },
      ASSIGNED: { className: "bg-gray-100 text-gray-700 border-gray-300", label: "Assigned" },
    };
    return styles[status as keyof typeof styles] || styles.SUBMITTED;
  };

  // Filter tasks based on search
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.task.image?.originalFilename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.annotator.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/reviewer")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Review Projects
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{project.name}</h1>
                <p className="text-muted-foreground mt-1">
                  {project.description || "No description"}
                </p>
              </div>
            </div>

            {project.category && (
              <Badge className="bg-purple-50 text-purple-700 border-purple-200">
                {project.category.name}
              </Badge>
            )}
          </div>

          {/* Project Labels Section */}
          {project.projectLabels && project.projectLabels.length > 0 && (
            <Card className="p-4 mt-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Project Labels
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.projectLabels.map((pl: any) => (
                    <Badge
                      key={pl.label.id}
                      variant="outline"
                      style={{
                        backgroundColor: `${pl.label.color}20`,
                        borderColor: pl.label.color,
                        color: pl.label.color,
                      }}
                      className="px-3 py-1"
                    >
                      {pl.label.name}
                      {pl.label.category && (
                        <span className="ml-1 text-xs opacity-75">
                          ({pl.label.category.name})
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedTasks.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{rejectedTasks.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Overall Progress */}
        {project.progress !== undefined && (
          <Card className="p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Overall Project Progress</p>
              <span className="text-sm text-muted-foreground">
                {Math.round(project.progress)}%
              </span>
            </div>
            <Progress value={project.progress} className="h-2" />
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="reviews">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Review Queue ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageCircle className="w-4 h-4 mr-2" />
              Project Chat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="mt-6">
            {/* Search & Filter Bar */}
            <Card className="p-4 mb-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[250px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by task, annotator..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    <SelectItem value="SUBMITTED">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Review Queue Table */}
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : filteredTasks.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground text-lg mb-2">
                  {tasks.length === 0
                    ? "No reviews assigned yet"
                    : "No tasks match your filters"}
                </p>
                {tasks.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Waiting for annotators to submit work
                  </p>
                )}
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Preview</TableHead>
                      <TableHead>Task / Image</TableHead>
                      <TableHead>Annotator</TableHead>
                      <TableHead className="w-[120px]">Status</TableHead>
                      <TableHead className="w-[140px]">Deadline</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => {
                      const statusBadge = getStatusBadge(task.status);
                      return (
                        <TableRow
                          key={task.id}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <TableCell>
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center overflow-hidden">
                              {task.task.image ? (
                                <img
                                  src={task.task.image.storageUrl}
                                  alt={task.task.image.originalFilename}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-2xl">🖼️</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {task.task.image?.originalFilename ||
                                  `Task ${task.id.slice(0, 8)}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ID: {task.id.slice(0, 8)}...
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {task.annotator.fullName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {task.annotator.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusBadge.className}
                            >
                              {statusBadge.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {task.deadline ? (
                              <div className="text-sm">
                                {format(new Date(task.deadline), "MMM dd, yyyy")}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={task.status === "SUBMITTED" ? "default" : "outline"}
                              onClick={() => navigate(`/workspace/${task.taskId}`)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              {task.status === "SUBMITTED" ? "Review" : "View"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            <ChatPanel
              projectId={projectId!}
              projectName={project.name}
              isManager={false}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
