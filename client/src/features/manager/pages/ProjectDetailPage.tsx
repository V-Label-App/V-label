import React, { useState, useEffect } from "react";
import { ExportDialog } from "../components/ExportDialog";
import { DatasetList } from "../components/DatasetList";
import { UploadImageDialog } from "../components/UploadImageDialog";
import { DatasetCreateDialog } from "../components/DatasetCreateDialog";
import { LabelRequestManager } from "../components/LabelRequestManager";
import { ActivityTab } from "../components/ActivityTab";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../../components/ui/dialog";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../../../components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../components/ui/avatar";
import { ScrollArea } from "../../../components/ui/scroll-area";
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
  FileUp,
  Search,
  Loader2,
  CheckCircle2,
  Sparkles,
  UserMinus,
  AlertTriangle,
  Eye,
  Award,
  History,
  Zap,
  ShieldCheck,
  RefreshCw,
  ClipboardCheck,
  XCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Tag,
  ImageIcon,
  UserPlus,
  Settings2,
  Play,
  Circle,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "../../../components/ui/utils";

import { useAuth } from "../../../context/AuthContext";
import { ChatPanel } from "../../../components/chat/ChatPanel";
import { projectApi } from "../../../services/project.api";
import { ProjectHealthDashboard } from "../components/ProjectHealthDashboard";
import { ProjectAnalytics } from "../components/ProjectAnalytics";
import {
  projectLabelApi,
  labelApi,
  labelRequestApi,
  type Label as ApiLabel,
} from "../../../services/label.api";
import { aiApi } from "../../../services/ai.api";
import {
  projectCategoryApi,
  type ProjectCategory,
} from "../../../services/project-category.api";
import { LabelSelector } from "../../../components/LabelSelector";
import type { Project, AssignmentRule } from "../../../types/project.types";
import { ProjectStatus } from "../../../types/project.types";
import { Switch } from "../../../components/ui/switch";
import { Checkbox } from "../../../components/ui/checkbox";
import { useDebounce } from "../../../hooks/useDebounce";
import { calculateLevelLinear } from "../../../utils/levelUtils";

const getLatestAnnotatorAssignment = (task: any) => {
  if (!task || !task.assignments || !Array.isArray(task.assignments))
    return undefined;
  const annotatorAssignments = task.assignments.filter(
    (a: any) => a.annotatorId,
  );
  if (annotatorAssignments.length === 0) return undefined;
  return [...annotatorAssignments].sort((a, b) => {
    const dateA = a.updatedAt
      ? new Date(a.updatedAt).getTime()
      : new Date(a.createdAt).getTime();
    const dateB = b.updatedAt
      ? new Date(b.updatedAt).getTime()
      : new Date(b.createdAt).getTime();
    return dateB - dateA;
  })[0];
};

const adjustDeadline = (date: Date | undefined | null): any => {
  if (!date) return undefined;
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Data State
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");

  // Label State
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [allAvailableLabels, setAllAvailableLabels] = useState<ApiLabel[]>([]);

  // Placeholder for tasks since API doesn't return them yet
  const [tasks, setTasks] = useState<any[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const TASKS_PER_USER_PAGE = 8;
  const [userPages, setUserPages] = useState<Record<string, number>>({});
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [workloads, setWorkloads] = useState<Record<string, any>>({});

  const [checklistOpen, setChecklistOpen] = useState(true);

  // Dialog States
  const [isAddImagesOpen, setIsAddImagesOpen] = useState(false);
  const [pendingLabelRequests, setPendingLabelRequests] = useState(0);

  // Search & Filter State
  const [taskSearchQuery, setTaskSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(taskSearchQuery, 500);
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>("all");
  const [taskFilterAssignee, setTaskFilterAssignee] = useState<string>("all");

  // Edit Project State - Pre-fill when opening
  // Edit Project State - Pre-fill when opening
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState<Date>();
  const [editStatus, setEditStatus] = useState<ProjectStatus>(
    ProjectStatus.ACTIVE,
  );
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [editEnableAi, setEditEnableAi] = useState(false);
  const [isAiRefactoring, setIsAiRefactoring] = useState(false);

  // Assignment Rule State
  const [editAssignmentRule, setEditAssignmentRule] = useState<
    Partial<AssignmentRule>
  >({
    isAutoAssignEnabled: false,
    assignmentStrategy: "ROUND_ROBIN",
    autoAssignReviewer: true,
    reviewerAssignmentStrategy: "ROUND_ROBIN",
    reviewerDelayHours: 0,
    maxTasksPerAnnotator: 10,
    maxTasksPerReviewer: 20,
    minAnnotatorReputation: 0,
    minReviewerReputation: 70,
    maxRejectionsBeforeReassign: 3,
    autoReassignOnSkip: true,
  });

  const [categories, setCategories] = useState<ProjectCategory[]>([]);

  // Member Management State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [potentialMembers, setPotentialMembers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]); // Multi-select
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("all");
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  const handleSearchUsers = React.useCallback(
    async (query: string) => {
      if (!project) return;
      setMemberSearchQuery(query);

      setIsSearchingMembers(true);
      try {
        // Debounce could be added here, but for now direct call
        const users = await projectApi.searchPotentialMembers(
          project.id,
          query,
        );
        setPotentialMembers(users);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearchingMembers(false);
      }
    },
    [project],
  );

  const handleToggleMemberSelection = (user: any) => {
    setSelectedMembers((prev) => {
      const exists = prev.find((m) => m.id === user.id);
      if (exists) {
        return prev.filter((m) => m.id !== user.id);
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
      const promises = selectedMembers.map((user) => {
        // Use the user's system role (or fallback to ANNOTATOR if missing)
        const roleToAdd = user.role || "ANNOTATOR";

        return projectApi.addMember(project.id, user.id, roleToAdd);
      });

      await Promise.all(promises);

      toast.success(
        `Successfully added ${selectedMembers.length} members to the project`,
      );

      setIsAddMemberOpen(false);
      setSelectedMembers([]);
      setMemberSearchQuery("");
      setPotentialMembers([]);

      // Refresh project
      const updated = await projectApi.getById(project.id);
      setProject(updated);
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to add some members. Please try again.");
    } finally {
      setIsAddingMembers(false);
    }
  };

  // ...

  // Remove Member State
  const [isRemoveMemberOpen, setIsRemoveMemberOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<any>(null);

  // Task Assignment State
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [taskToAssign, setTaskToAssign] = useState<any>(null);
  const [selectedAnnotatorId, setSelectedAnnotatorId] = useState<string>("");
  const [selectedDeadline, setSelectedDeadline] = useState<Date | undefined>();
  const [reassignmentReason, setReassignmentReason] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isBulkAssign, setIsBulkAssign] = useState(false);

  // Reviewer Assignment State
  const [isAssignReviewerDialogOpen, setIsAssignReviewerDialogOpen] =
    useState(false);
  const [taskToAssignReviewer, setTaskToAssignReviewer] = useState<any>(null);
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>("");
  const [selectedReviewerDeadline, setSelectedReviewerDeadline] = useState<
    Date | undefined
  >();
  const [reviewerReassignmentReason, setReviewerReassignmentReason] =
    useState<string>("");
  const [isAssigningReviewer, setIsAssigningReviewer] = useState(false);
  const [isBulkAssignReviewer, setIsBulkAssignReviewer] = useState(false);

  // Force Assign State
  const [isForceAssignDialogOpen, setIsForceAssignDialogOpen] = useState(false);
  const [forceAssignData, setForceAssignData] = useState<{
    currentTasks: number;
    maxTasks: number;
    requestedTasks?: number;
    remainingSlots?: number;
    mode: "manual" | "bulk";
    taskId?: string;
    taskIds?: string[];
    annotatorId: string;
    deadline?: Date;
    reason?: string;
  } | null>(null);

  // Task Unassign State
  const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false);
  const [taskToUnassign, setTaskToUnassign] = useState<any>(null);
  const [isUnassigning, setIsUnassigning] = useState(false);

  // Bulk Deadline State
  const [isBulkDeadlineDialogOpen, setIsBulkDeadlineDialogOpen] =
    useState(false);
  const [bulkDeadlineUserId, setBulkDeadlineUserId] = useState<string | null>(
    null,
  );
  const [bulkDeadline, setBulkDeadline] = useState<Date | undefined>();
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Bulk Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Task History Dialog State
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedTaskForHistory, setSelectedTaskForHistory] =
    useState<any>(null);

  // Bulk Unassign State
  const [isBulkUnassignDialogOpen, setIsBulkUnassignDialogOpen] =
    useState(false);
  const [isBulkUnassigning, setIsBulkUnassigning] = useState(false);
  const [bulkUnassignUserId, setBulkUnassignUserId] = useState<string | null>(
    null,
  );

  // Fetch tasks function
  const fetchTasks = React.useCallback(async () => {
    if (!projectId) return;

    setIsTasksLoading(true);
    try {
      const params: any = {
        page: 1,
        limit: 1000, // Fetch all tasks
      };

      if (taskFilterStatus && taskFilterStatus !== "all") {
        params.status = taskFilterStatus.toUpperCase();
      }

      if (taskFilterAssignee && taskFilterAssignee !== "all") {
        params.assigneeId = taskFilterAssignee;
      }

      const response = await projectApi.getTasks(projectId, params);
      setTasks(response.data || []);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setIsTasksLoading(false);
    }
  }, [projectId, taskFilterStatus, taskFilterAssignee]);

  // Fetch workloads function
  const fetchWorkloads = React.useCallback(async () => {
    if (!projectId) return;

    try {
      const workloadsList = await projectApi.getWorkloads(projectId);
      const workloadsMap = workloadsList.reduce(
        (acc: Record<string, any>, workload: any) => {
          acc[workload.userId] = workload;
          return acc;
        },
        {},
      );
      setWorkloads(workloadsMap);
    } catch (error) {
      console.error("Failed to fetch workloads:", error);
    }
  }, [projectId]);

  // Handle task assignment (single or bulk)
  const handleAssignTask = async () => {
    if (!projectId || !selectedAnnotatorId) return;

    // Bulk assign mode
    if (isBulkAssign) {
      if (selectedTasks.length === 0) return;

      setIsAssigning(true);
      try {
        // Use bulk assign endpoint
        await projectApi.bulkAssignTasks(
          projectId,
          selectedTasks,
          selectedAnnotatorId,
          adjustDeadline(selectedDeadline),
        );
        toast.success(`${selectedTasks.length} tasks assigned successfully`);
        setIsAssignDialogOpen(false);
        setSelectedAnnotatorId("");
        setSelectedDeadline(undefined);
        setSelectedTasks([]); // Clear selection
        setIsBulkAssign(false);
        fetchTasks();
        fetchWorkloads();
      } catch (error: any) {
        console.error("Failed to assign tasks:", error);
        if (
          error.response?.status === 400 &&
          error.response?.data?.error === "Workload limit exceeded"
        ) {
          setIsAssignDialogOpen(false);
          setForceAssignData({
            currentTasks: error.response.data.currentTasks,
            maxTasks: error.response.data.maxTasks,
            requestedTasks: error.response.data.requestedTasks,
            remainingSlots: error.response.data.remainingSlots,
            mode: "bulk",
            taskIds: selectedTasks,
            annotatorId: selectedAnnotatorId,
            deadline: adjustDeadline(selectedDeadline),
          });
          setIsForceAssignDialogOpen(true);
        } else {
          toast.error(error.response?.data?.error || "Failed to assign tasks");
        }
      } finally {
        setIsAssigning(false);
      }
      return;
    }

    // Single assign mode
    if (!taskToAssign) return;

    // Check if it's a reassignment and reason is required
    const currentAssignment = getLatestAnnotatorAssignment(taskToAssign);
    const isReassignment =
      currentAssignment &&
      currentAssignment.annotatorId !== selectedAnnotatorId;

    if (isReassignment && !reassignmentReason.trim()) {
      toast.error("Please provide a reason for reassignment");
      return;
    }

    setIsAssigning(true);
    try {
      await projectApi.assignTask(
        projectId,
        taskToAssign.id,
        selectedAnnotatorId,
        adjustDeadline(selectedDeadline),
        isReassignment ? reassignmentReason : undefined,
      );
      toast.success("Task assigned successfully");
      setIsAssignDialogOpen(false);
      setTaskToAssign(null);
      setSelectedAnnotatorId("");
      setSelectedDeadline(undefined);
      setReassignmentReason("");
      fetchTasks();
      fetchWorkloads();
    } catch (error: any) {
      console.error("Failed to assign task:", error);
      if (
        error.response?.status === 400 &&
        error.response?.data?.error === "Workload limit exceeded"
      ) {
        setIsAssignDialogOpen(false);
        setForceAssignData({
          currentTasks: error.response.data.currentTasks,
          maxTasks: error.response.data.maxTasks,
          mode: "manual",
          taskId: taskToAssign.id,
          annotatorId: selectedAnnotatorId,
          deadline: adjustDeadline(selectedDeadline),
          reason: isReassignment ? reassignmentReason : undefined,
        });
        setIsForceAssignDialogOpen(true);
      } else {
        toast.error(error.response?.data?.error || "Failed to assign task");
      }
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle force assign when workload limit implies
  const handleForceAssign = async () => {
    if (!forceAssignData || !projectId) return;

    setIsAssigning(true);
    try {
      if (forceAssignData.mode === "bulk" && forceAssignData.taskIds) {
        await projectApi.bulkAssignTasks(
          projectId,
          forceAssignData.taskIds,
          forceAssignData.annotatorId,
          adjustDeadline(forceAssignData.deadline),
          true,
        );
        toast.success(
          `${forceAssignData.taskIds.length} tasks force assigned successfully`,
        );
        setSelectedTasks([]);
        setIsBulkAssign(false);
      } else if (forceAssignData.mode === "manual" && forceAssignData.taskId) {
        await projectApi.assignTask(
          projectId,
          forceAssignData.taskId,
          forceAssignData.annotatorId,
          adjustDeadline(forceAssignData.deadline),
          forceAssignData.reason,
          true,
        );
        toast.success("Task force assigned successfully");
        setTaskToAssign(null);
        setReassignmentReason("");
      }
      setIsForceAssignDialogOpen(false);
      setSelectedAnnotatorId("");
      setSelectedDeadline(undefined);
      fetchTasks();
      fetchWorkloads();
    } catch (error: any) {
      console.error("Failed to force assign:", error);
      toast.error(
        error.response?.data?.error || "Failed to force assign tasks",
      );
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle reviewer assignment
  const handleAssignReviewer = async () => {
    if (!projectId || !selectedReviewerId) return;

    // Bulk assign mode
    if (isBulkAssignReviewer) {
      if (selectedTasks.length === 0) return;

      setIsAssigningReviewer(true);
      try {
        // Use Promise.all to assign reviewer to all selected tasks
        await Promise.all(
          selectedTasks.map((taskId) =>
            projectApi.assignReviewer(
              projectId,
              taskId,
              selectedReviewerId,
              adjustDeadline(selectedReviewerDeadline),
              undefined,
              true,
            ),
          ),
        );
        toast.success(
          `${selectedTasks.length} tasks assigned to reviewer successfully`,
        );
        setIsAssignReviewerDialogOpen(false);
        setSelectedReviewerId("");
        setSelectedReviewerDeadline(undefined);
        setSelectedTasks([]); // Clear selection
        setIsBulkAssignReviewer(false);
        fetchTasks();
        fetchWorkloads();
      } catch (error: any) {
        console.error("Failed to assign reviewer:", error);
        toast.error(
          error.response?.data?.error || "Failed to assign reviewer to tasks",
        );
      } finally {
        setIsAssigningReviewer(false);
      }
      return;
    }

    // Single assign mode
    if (!taskToAssignReviewer) return;

    // Check if it's a reassignment and reason is required
    const currentReviewerAssignment = taskToAssignReviewer.assignments?.find(
      (a: any) => a.reviewerId,
    );
    const isReassignment =
      currentReviewerAssignment &&
      currentReviewerAssignment.reviewerId !== selectedReviewerId;

    if (isReassignment && !reviewerReassignmentReason.trim()) {
      toast.error("Please provide a reason for reviewer reassignment");
      return;
    }

    setIsAssigningReviewer(true);
    try {
      await projectApi.assignReviewer(
        projectId,
        taskToAssignReviewer.id,
        selectedReviewerId,
        adjustDeadline(selectedReviewerDeadline),
        isReassignment ? reviewerReassignmentReason : undefined,
        true,
      );
      toast.success("Reviewer assigned successfully");
      setIsAssignReviewerDialogOpen(false);
      setTaskToAssignReviewer(null);
      setSelectedReviewerId("");
      setSelectedReviewerDeadline(undefined);
      setReviewerReassignmentReason("");
      setIsBulkAssignReviewer(false);
      fetchTasks();
      fetchWorkloads();
    } catch (error: any) {
      console.error("Failed to assign reviewer:", error);
      toast.error(error.response?.data?.error || "Failed to assign reviewer");
    } finally {
      setIsAssigningReviewer(false);
    }
  };

  const handleViewHistory = (task: any) => {
    setSelectedTaskForHistory(task);
    setIsHistoryDialogOpen(true);
  };

  // Handle task unassignment
  const handleUnassignTask = async () => {
    if (!projectId || !taskToUnassign) return;

    setIsUnassigning(true);
    try {
      await projectApi.unassignTask(projectId, taskToUnassign.id);
      toast.success("Task unassigned successfully");
      setIsUnassignDialogOpen(false);
      setTaskToUnassign(null);
      fetchTasks(); // Refresh tasks
      fetchWorkloads(); // Refresh workloads
    } catch (error: any) {
      console.error("Failed to unassign task:", error);
      toast.error(error.response?.data?.error || "Failed to unassign task");
    } finally {
      setIsUnassigning(false);
    }
  };

  // Handle bulk deadline update for all tasks of a user
  const handleBulkDeadlineUpdate = async () => {
    if (!projectId || !bulkDeadlineUserId || !bulkDeadline) return;

    const userTasks = groupedTasks[bulkDeadlineUserId];
    if (!userTasks || userTasks.length === 0) return;

    setIsBulkUpdating(true);
    try {
      // Update deadline for all tasks of this user
      await Promise.all(
        userTasks.map((task: any) => {
          return projectApi.updateTaskDeadline(
            projectId,
            task.id,
            adjustDeadline(bulkDeadline),
          );
        }),
      );

      toast.success(
        `Deadline updated for ${userTasks.length} task${userTasks.length > 1 ? "s" : ""}`,
      );
      setIsBulkDeadlineDialogOpen(false);
      setBulkDeadlineUserId(null);
      setBulkDeadline(undefined);
      fetchTasks(); // Refresh tasks
      fetchWorkloads(); // Refresh workloads
    } catch (error: any) {
      console.error("Failed to update deadlines:", error);
      toast.error(error.response?.data?.error || "Failed to update deadlines");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Handle bulk delete tasks (remove images from project)
  const handleDeleteTasks = async () => {
    if (!projectId || selectedTasks.length === 0) return;

    setIsDeleting(true);
    try {
      // Get image IDs from selected tasks
      const imageIds = selectedTasks
        .map((taskId) => {
          const task = tasks.find((t) => t.id === taskId);
          return task?.imageId;
        })
        .filter(Boolean) as string[];

      if (imageIds.length === 0) {
        toast.error("No images to delete");
        return;
      }

      // Delete images (which will also delete associated tasks)
      await projectApi.deleteImages(projectId, imageIds);

      toast.success(
        `${imageIds.length} task${imageIds.length > 1 ? "s" : ""} deleted successfully`,
      );
      setIsDeleteDialogOpen(false);
      setSelectedTasks([]);
      fetchTasks(); // Refresh tasks
      fetchWorkloads(); // Refresh workloads
    } catch (error: any) {
      console.error("Failed to delete tasks:", error);
      toast.error(error.response?.data?.error || "Failed to delete tasks");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk unassign tasks
  const handleBulkUnassignTasks = async () => {
    if (!projectId || !bulkUnassignUserId) return;

    const userTasks = groupedTasks[bulkUnassignUserId];
    if (!userTasks || userTasks.length === 0) return;

    // Get selected tasks from this user
    const userTaskIds = userTasks.map((t: any) => t.id);
    const tasksToUnassign = selectedTasks.filter((id) =>
      userTaskIds.includes(id),
    );

    if (tasksToUnassign.length === 0) return;

    setIsBulkUnassigning(true);
    try {
      // Use bulk unassign endpoint
      await projectApi.bulkUnassignTasks(projectId, tasksToUnassign);

      toast.success(
        `${tasksToUnassign.length} task${tasksToUnassign.length > 1 ? "s" : ""} unassigned successfully`,
      );
      setIsBulkUnassignDialogOpen(false);
      setBulkUnassignUserId(null);
      setSelectedTasks([]);
      fetchTasks();
      fetchWorkloads();
    } catch (error: any) {
      console.error("Failed to unassign tasks:", error);
      toast.error(error.response?.data?.error || "Failed to unassign tasks");
    } finally {
      setIsBulkUnassigning(false);
    }
  };

  // Handle tab query parameter from URL
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Load Project
  useEffect(() => {
    if (projectId) {
      setIsLoading(true);
      projectApi
        .getById(projectId)
        .then((data) => {
          setProject(data);
          // Tasks are currently not returned by API, so we default to empty
          setTasks([]);
        })
        .catch((err) => {
          console.error(err);
          toast.error("Project not found or error loading");
          navigate("/manager/projects");
        })
        .finally(() => setIsLoading(false));

      // Load Project Labels
      projectLabelApi
        .getProjectLabels(projectId)
        .then((labels) => {
          setSelectedLabelIds(labels.map((pl) => pl.labelId));
        })
        .catch((err) => {
          console.error("Failed to load project labels", err);
        });

      // Load Global/Available Labels for mapping config
      labelApi
        .getAll()
        .then((labels) => setAllAvailableLabels(labels))
        .catch((err) => console.error("Failed to load all labels", err));

      // Load pending label requests count
      labelRequestApi
        .getPendingCount(projectId)
        .then((count) => setPendingLabelRequests(count))
        .catch((err) =>
          console.error("Failed to load pending requests count", err),
        );
    }
  }, [projectId, navigate]);

  useEffect(() => {
    if (project) {
      setEditName(project.name);
      setEditDescription(project.description || "");
      if (project.deadline) setEditDeadline(new Date(project.deadline));
      setEditStatus(project.status as ProjectStatus);
      setEditCategoryId(project.categoryId || "");
      setEditEnableAi(project.enableAiAssistance);

      if (project.assignmentRule) {
        setEditAssignmentRule(project.assignmentRule);
      }

      // Fetch tasks and workloads when project loads
      fetchTasks();
      fetchWorkloads();
    }
  }, [project, activeTab, fetchTasks, fetchWorkloads]);

  // Fetch tasks when filters change
  useEffect(() => {
    if (projectId && activeTab === "tasks") {
      fetchTasks();
      fetchWorkloads();
    }
  }, [
    projectId,
    activeTab,
    fetchTasks,
    fetchWorkloads,
    taskFilterStatus,
    taskFilterAssignee,
    debouncedSearchQuery,
  ]);

  // Load available categories
  useEffect(() => {
    projectCategoryApi
      .getAll()
      .then((cats) => setCategories(cats))
      .catch((err) => console.error("Failed to load categories", err));
  }, []);

  // Trigger initial search when Add Member dialog opens
  useEffect(() => {
    if (isAddMemberOpen) {
      handleSearchUsers("");
    } else {
      // Cleanup when closed
      setMemberSearchQuery("");
      setPotentialMembers([]);
      setSelectedMembers([]);
    }
  }, [isAddMemberOpen, handleSearchUsers]);

  // Removed client-side page reset effect as we handle it above with debounced query
  // useEffect(() => {
  //   setCurrentPage(1);
  // }, [taskSearchQuery, taskFilterStatus, taskFilterAssignee]);

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
  const annotators = projectMembers.filter(
    (m: any) => m.projectRole === "ANNOTATOR" || m.projectRole === "REVIEWER",
  );

  // Separate tasks by status
  const activeTasks = tasks.filter((t: any) => {
    const assignment = getLatestAnnotatorAssignment(t);
    if (!assignment) return true; // No assignment yet = unassigned active task
    const status = assignment?.status;
    const isSkipWithoutRejection =
      status === "SKIPPED" && (assignment?.rejectionCount || 0) === 0;

    return (
      status === "ASSIGNED" ||
      status === "IN_PROGRESS" ||
      isSkipWithoutRejection
    );
  });

  const submittedTasks = tasks.filter((t: any) => {
    const assignment = getLatestAnnotatorAssignment(t);
    return assignment?.status === "SUBMITTED";
  });

  const completedTasks = tasks.filter((t: any) => {
    const assignment = getLatestAnnotatorAssignment(t);
    return assignment?.status === "APPROVED";
  });

  const rejectedTasks = tasks.flatMap((t: any) => {
    // Hide from rejected tab if the task itself is currently being handled
    // We check both the task status and its assignments for maximum reliability
    const isHandled =
      ["IN_PROGRESS", "SUBMITTED", "APPROVED"].includes(
        t.status?.toUpperCase(),
      ) ||
      t.assignments?.some((a: any) =>
        ["ASSIGNED", "IN_PROGRESS", "SUBMITTED", "APPROVED"].includes(
          a.status?.toUpperCase(),
        ),
      );

    if (isHandled) return [];

    const historicalRejections =
      t.assignments?.filter((a: any) => (a.rejectionCount || 0) > 0) || [];

    return historicalRejections.map((a: any) => ({
      ...t,
      _specificAssignment: a,
      _isHistoricalSkip: a.status === "SKIPPED",
    }));
  });

  const groupedTasks = tasks.reduce((acc: Record<string, any[]>, task: any) => {
    const annotatorAssignment = getLatestAnnotatorAssignment(task);
    const assigneeId = annotatorAssignment?.annotatorId || "unassigned";
    if (!acc[assigneeId]) {
      acc[assigneeId] = [];
    }
    acc[assigneeId].push(task);
    return acc;
  }, {});

  const groupedActiveTasks = Object.fromEntries(
    Object.entries(
      activeTasks.reduce((acc: Record<string, any[]>, task: any) => {
        const annotatorAssignment = getLatestAnnotatorAssignment(task);
        const assigneeId = annotatorAssignment?.annotatorId || "unassigned";
        if (!acc[assigneeId]) {
          acc[assigneeId] = [];
        }
        acc[assigneeId].push(task);
        return acc;
      }, {}),
    ).map(([assigneeId, tasks]) => [
      assigneeId,
      [...tasks].sort((a: any, b: any) => {
        const aSkipped = getLatestAnnotatorAssignment(a)?.status === "SKIPPED";
        const bSkipped = getLatestAnnotatorAssignment(b)?.status === "SKIPPED";
        return aSkipped === bSkipped ? 0 : aSkipped ? -1 : 1;
      }),
    ]),
  );

  const groupedSubmittedTasks = submittedTasks.reduce(
    (acc: Record<string, any[]>, task: any) => {
      const annotatorAssignment = getLatestAnnotatorAssignment(task);
      const assigneeId = annotatorAssignment?.annotatorId || "unassigned";
      if (!acc[assigneeId]) {
        acc[assigneeId] = [];
      }
      acc[assigneeId].push(task);
      return acc;
    },
    {},
  );

  const groupedCompletedTasks = completedTasks.reduce(
    (acc: Record<string, any[]>, task: any) => {
      const annotatorAssignment = getLatestAnnotatorAssignment(task);
      const assigneeId = annotatorAssignment?.annotatorId || "unassigned";
      if (!acc[assigneeId]) {
        acc[assigneeId] = [];
      }
      acc[assigneeId].push(task);
      return acc;
    },
    {},
  );

  const groupedRejectedTasks = rejectedTasks.reduce(
    (acc: Record<string, any[]>, taskWrapper: any) => {
      const assignment = taskWrapper._specificAssignment;
      const assigneeId = assignment?.annotatorId || "unassigned";
      if (!acc[assigneeId]) {
        acc[assigneeId] = [];
      }
      acc[assigneeId].push(taskWrapper);
      return acc;
    },
    {},
  );

  // Get workload from cached workloads (total active tasks)
  const workloadMap: Record<string, number> = Object.keys(workloads).reduce(
    (acc: Record<string, number>, userId: string) => {
      const workload = workloads[userId];
      acc[userId] =
        (workload.assignedTasks || 0) + (workload.inProgressTasks || 0);
      return acc;
    },
    {},
  );

  // Toggle user expansion
  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
      // Initialize page 1 for this user if not set
      if (!userPages[userId]) {
        setUserPages((prev) => ({ ...prev, [userId]: 1 }));
      }
    }
    setExpandedUsers(newExpanded);
  };

  // Per-user pagination helpers
  const getUserPage = (userId: string) => userPages[userId] || 1;

  const setUserPage = (userId: string, page: number) => {
    setUserPages((prev) => ({ ...prev, [userId]: page }));
  };

  const getPaginatedUserTasks = (userTasks: any[], userId: string) => {
    const page = getUserPage(userId);
    const startIndex = (page - 1) * TASKS_PER_USER_PAGE;
    const endIndex = startIndex + TASKS_PER_USER_PAGE;
    return userTasks.slice(startIndex, endIndex);
  };

  const getUserTotalPages = (userTasks: any[]) => {
    return Math.ceil(userTasks.length / TASKS_PER_USER_PAGE);
  };

  const approvedTasksCount = tasks.filter((t: any) => {
    const assignment = getLatestAnnotatorAssignment(t);
    return assignment?.status === "APPROVED";
  }).length;
  const totalTasksCount = project._count?.tasks || 0;
  const projectProgress =
    totalTasksCount > 0
      ? Math.round((approvedTasksCount / totalTasksCount) * 100)
      : 0;

  // Handlers
  const handleSaveLabels = async () => {
    if (!project) return;

    try {
      // Construct labelConfig from selected labels
      const selectedLabels = allAvailableLabels.filter((l) =>
        selectedLabelIds.includes(l.id),
      );

      const metaConfig = project.labelConfig?.find(
        (l: any) => l.type === "meta",
      );
      const newLabelConfig = [
        ...(metaConfig ? [metaConfig] : []),
        ...selectedLabels.map((l) => ({
          id: l.id,
          name: l.name,
          color: l.color,
        })),
      ];

      await Promise.all([
        projectApi.update(project.id, {
          labelConfig: newLabelConfig,
        }),
        projectLabelApi.updateProjectLabels(project.id, selectedLabelIds),
      ]);

      toast.success("Labels updated successfully");

      // Refresh project data
      const updatedProject = await projectApi.getById(project.id);
      setProject(updatedProject);
    } catch (error) {
      console.error("Failed to update labels:", error);
      toast.error("Failed to update labels");
    }
  };

  const handleAiRefactorDescription = async () => {
    if (!editDescription || editDescription.trim() === "") {
      toast.error("Please enter a description first");
      return;
    }

    setIsAiRefactoring(true);
    try {
      const { refactoredText } = await aiApi.refactorText(
        editDescription,
        "project description",
      );
      setEditDescription(refactoredText);
      toast.success("Description refactored successfully");
    } catch (error: any) {
      console.error("Failed to refactor description:", error);
      toast.error(
        error.response?.data?.error || "Failed to refactor description",
      );
    } finally {
      setIsAiRefactoring(false);
    }
  };

  const handleEditProject = async () => {
    if (!project || !editName || !editDeadline) return;

    try {
      await projectApi.update(project.id, {
        name: editName,
        description: editDescription,
        deadline: editDeadline ? adjustDeadline(editDeadline)?.toISOString() : undefined,
        status: editStatus,
        categoryId: editCategoryId === "none" ? "" : editCategoryId,
        enableAiAssistance: editEnableAi,
        assignmentRule: editAssignmentRule,
      });

      // Refresh project data to be sure
      const updated = await projectApi.getById(project.id);
      setProject(updated);
      toast.success("Project updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update project");
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (
      confirm(
        `Are you sure you want to delete "${project.name}"? This action cannot be undone.`,
      )
    ) {
      try {
        await projectApi.delete(project.id);
        navigate("/manager/projects");
        toast.success("Project deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete project");
      }
    }
  };

  // const isOverdue = (deadline?: string) => {
  //   if (!deadline) return false;
  //   return new Date(deadline) < new Date();
  // };

  // Analytics Mock Data (Until we have real stats)
  // const statusData = [ ... ]; // removed unused
  // const annotatorData: any[] = [];
  // const progressData: any[] = [];

  const exportProjectCOCO = async(
    trainRatio: number,
    valRatio: number,
    testRatio: number,
  ) => {
    if (!project) return;
    setIsExporting(true);
    try {
      await projectApi.exportCOCO(
        project.id,
        project.name,
        trainRatio,
        valRatio,
        testRatio,
      );
      setIsExportDialogOpen(false);
      toast.success("Export thành công!", {
        description: `Đã lưu Export_${project.name.replace(/\s+/g, "_")}-coco.zip`,
      });
    } catch {
      toast.error("Export thất bại. Vui lòng thử lại.");
    } finally {
      setIsExporting(false);
    }
  };

  // Member Management Handlers

  const confirmRemoveMember = (member: any) => {
    setMemberToRemove(member);
    setIsRemoveMemberOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !project) return;

    try {
      await projectApi.removeMember(project.id, memberToRemove.userId);
      toast.success("Member removed successfully");

      // Update local state
      setProject((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          members: (prev.members || []).filter(
            (m: any) => m.userId !== memberToRemove.userId,
          ),
        };
      });

      setIsRemoveMemberOpen(false);
    } catch (error: any) {
      console.error(error);
      const errorMessage =
        error?.response?.data?.error || "Failed to remove member";
      toast.error(errorMessage);
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks((prev) => [...prev, taskId]);
    } else {
      setSelectedTasks((prev) => prev.filter((id) => id !== taskId));
    }
  };

  // Setup Checklist computation
  const checklistSteps = project ? (() => {
    const hasLabels = selectedLabelIds.length > 0;
    const hasImages = (project._count?.images || 0) > 0;
    const annotatorMembers = projectMembers.filter((m: any) => m.projectRole === "ANNOTATOR");
    const reviewerMembers = projectMembers.filter((m: any) => m.projectRole === "REVIEWER");
    const isActive = project.status === "ACTIVE";
    return [
      { id: "labels", iconName: "tag", label: "Add project labels", detail: hasLabels ? `${selectedLabelIds.length} label(s) configured` : "No labels added yet", done: hasLabels, actionLabel: "Go to Settings" as string | undefined, onAction: () => setActiveTab("settings") as unknown as (() => void) | undefined },
      { id: "images", iconName: "image", label: "Upload images", detail: hasImages ? `${project._count?.images} image(s) uploaded` : "No images uploaded yet", done: hasImages, actionLabel: "Upload" as string | undefined, onAction: (() => setIsAddImagesOpen(true)) as (() => void) | undefined },
      { id: "annotators", iconName: "userplus", label: "Add annotators", detail: annotatorMembers.length > 0 ? `${annotatorMembers.length} annotator(s) added` : "No annotators added yet", done: annotatorMembers.length > 0, actionLabel: "Manage Team" as string | undefined, onAction: (() => setActiveTab("team")) as (() => void) | undefined },
      { id: "reviewers", iconName: "shield", label: "Add reviewers", detail: reviewerMembers.length > 0 ? `${reviewerMembers.length} reviewer(s) added` : "No reviewers added yet", done: reviewerMembers.length > 0, actionLabel: "Manage Team" as string | undefined, onAction: (() => setActiveTab("team")) as (() => void) | undefined },
      { id: "rules", iconName: "settings", label: "Configure assignment rules", detail: project.assignmentRule ? "Assignment rules configured" : "Using default rules", done: !!project.assignmentRule, actionLabel: "Settings" as string | undefined, onAction: (() => setActiveTab("settings")) as (() => void) | undefined },
      { id: "active", iconName: "play", label: "Activate project", detail: isActive ? "Project is active and accepting work" : "Project is not yet active", done: isActive, actionLabel: isActive ? undefined : "Activate", onAction: isActive ? undefined : (() => setActiveTab("settings")) as (() => void) | undefined },
    ];
  })() : [];
  const checklistCompleted = checklistSteps.filter((s) => s.done).length;
  const checklistAllDone = checklistSteps.length > 0 && checklistCompleted === checklistSteps.length;

  return (
    <div className="min-h-screen bg-gray-50 animate-in fade-in slide-in-from-bottom-5 duration-700 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-8 py-8 min-w-0">
        {/* Back Button & Actions */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/manager/projects")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAddImagesOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Add Images
            </Button>

            <Button
              variant="outline"
              onClick={() => toast.info("Import functionality coming soon!")}
            >
              <FileUp className="w-4 h-4 mr-2" />
              Import
            </Button>

            <Button
              variant="outline"
              disabled={projectProgress < 100 || isExporting}
              title={
                projectProgress < 100
                  ? "Project progress must be 100% to export"
                  : "Export as COCO JSON"
              }
              onClick={() => setIsExportDialogOpen(true)}
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? "Exporting..." : "Export"}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setActiveTab("settings")}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDeleteProject}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Project Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shadow-sm">
                <FolderOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{project.name}</h1>
                <p className="text-muted-foreground mt-1 max-w-2xl">
                  {project.description || "No description provided for this project"}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              {project.category && (
                <Badge className="bg-purple-50 text-purple-700 border-purple-200">
                  {project.category.name}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 py-1 px-2.5 cursor-help border text-[10px] font-medium uppercase tracking-wider transition-opacity",
                          project.assignmentRule?.isAutoAssignEnabled
                            ? "bg-muted/60 text-foreground border-border"
                            : "bg-muted/30 text-muted-foreground border-border opacity-50",
                        )}
                      >
                        <Zap className="w-3 h-3" />
                        Auto-Assign: {project.assignmentRule?.isAutoAssignEnabled ? "ON" : "OFF"}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {project.assignmentRule?.isAutoAssignEnabled
                          ? "Tasks are automatically assigned to available annotators."
                          : "Manual task assignment is required."}
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 py-1 px-2.5 cursor-help border text-[10px] font-medium uppercase tracking-wider transition-opacity",
                          project.assignmentRule?.autoAssignReviewer
                            ? "bg-muted/60 text-foreground border-border"
                            : "bg-muted/30 text-muted-foreground border-border opacity-50",
                        )}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        Auto-Reviewer: {project.assignmentRule?.autoAssignReviewer ? "ON" : "OFF"}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {project.assignmentRule?.autoAssignReviewer
                          ? "Reviewers are automatically assigned to submitted tasks."
                          : "Manual reviewer assignment is required."}
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 py-1 px-2.5 cursor-help border text-[10px] font-medium uppercase tracking-wider transition-opacity",
                          project.assignmentRule?.autoReassignOnSkip
                            ? "bg-muted/60 text-foreground border-border"
                            : "bg-muted/30 text-muted-foreground border-border opacity-50",
                        )}
                      >
                        <RefreshCw className="w-3 h-3" />
                        Auto-Reassign: {project.assignmentRule?.autoReassignOnSkip ? "ON" : "OFF"}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {project.assignmentRule?.autoReassignOnSkip
                          ? "Tasks are immediately reassigned to others when skipped."
                          : "Skipped tasks require manual intervention."}
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 py-1 px-2.5 cursor-help border text-[10px] font-medium uppercase tracking-wider transition-opacity",
                          project.enableAiAssistance
                            ? "bg-muted/60 text-foreground border-border"
                            : "bg-muted/30 text-muted-foreground border-border opacity-50",
                        )}
                      >
                        <Sparkles className="w-3 h-3" />
                        AI Assistance: {project.enableAiAssistance ? "ON" : "OFF"}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {project.enableAiAssistance
                          ? "AI-powered tools are enabled to assist annotators."
                          : "AI assistance is disabled for this project."}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                  <p className="text-2xl font-bold">
                    {tasks.length}
                  </p>
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
                  <p className="text-2xl font-bold">
                    {submittedTasks.length}
                  </p>
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
                  <p className="text-2xl font-bold">
                    {completedTasks.length}
                  </p>
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
                  <p className="text-2xl font-bold">
                    {rejectedTasks.length}
                  </p>
                </div>
              </div>
            </Card>
        </div>

        {/* Overall Progress */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Overall Project Progress</p>
            <span className="text-sm text-muted-foreground">
              {Math.round(projectProgress)}%
            </span>
          </div>
          <Progress value={projectProgress} className="h-2" />
        </Card>

        {/* Setup Checklist */}
        {!checklistAllDone && (
          <Card className="overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-muted/30 transition-colors"
              onClick={() => setChecklistOpen((v) => !v)}
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-semibold">Setup Checklist</p>
                  <p className="text-xs text-muted-foreground">
                    {checklistCompleted} of {checklistSteps.length} complete
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {checklistSteps.map((s) => (
                    <span
                      key={s.id}
                      className={cn(
                        "h-1.5 w-6 rounded-full transition-colors",
                        s.done ? "bg-emerald-500" : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                {checklistOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {checklistOpen && (
              <div className="border-t grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
                {checklistSteps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center justify-between gap-3 px-4 py-3",
                      idx > 0 && "border-t sm:border-t-0",
                      idx >= 2 && "sm:border-t",
                      step.done ? "bg-emerald-50/50" : "bg-background"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {step.done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <span className={cn("text-muted-foreground shrink-0", step.done && "text-emerald-600")}>
                        {step.iconName === "tag" && <Tag className="w-4 h-4" />}
                        {step.iconName === "image" && <ImageIcon className="w-4 h-4" />}
                        {step.iconName === "userplus" && <UserPlus className="w-4 h-4" />}
                        {step.iconName === "shield" && <ShieldCheck className="w-4 h-4" />}
                        {step.iconName === "settings" && <Settings2 className="w-4 h-4" />}
                        {step.iconName === "play" && <Play className="w-4 h-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className={cn("text-sm font-medium leading-none", step.done ? "text-foreground" : "text-muted-foreground")}>
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.detail}</p>
                      </div>
                    </div>
                    {!step.done && step.actionLabel && step.onAction && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); step.onAction!(); }}
                      >
                        {step.actionLabel}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Tabs: Tasks & Analytics */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger
              value="health"
              className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700"
            >
              Health (Rescue)
            </TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="resources" className="relative">
              Resources
              {pendingLabelRequests > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {pendingLabelRequests}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="analytics">
              <div className="flex items-center gap-2">
                Analytics
              </div>
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="health">
            <ProjectHealthDashboard
              projectId={project.id}
              onViewAllActivity={() => setActiveTab("activity")}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <ProjectAnalytics
              tasks={tasks}
              project={project}
              workloads={workloads}
            />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <Tabs defaultValue="active" className="space-y-4">
              <TabsList className="inline-flex h-auto gap-2 bg-transparent border-b w-full justify-start rounded-none p-0 pb-3">
                <TabsTrigger
                  value="active"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-700 data-[state=active]:shadow-none rounded-md border-2 border-transparent px-4 py-1.5 text-sm font-medium transition-all hover:bg-gray-50"
                >
                  Active Tasks ({activeTasks.length})
                </TabsTrigger>
                <TabsTrigger
                  value="submitted"
                  className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-purple-700 data-[state=active]:shadow-none rounded-md border-2 border-transparent px-4 py-1.5 text-sm font-medium transition-all hover:bg-gray-50"
                >
                  Submitted Tasks ({submittedTasks.length})
                </TabsTrigger>
                <TabsTrigger
                  value="rejected"
                  className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700 data-[state=active]:border-red-700 data-[state=active]:shadow-none rounded-md border-2 border-transparent px-4 py-1.5 text-sm font-medium transition-all hover:bg-gray-50"
                >
                  Rejected Tasks ({rejectedTasks.length})
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-700 data-[state=active]:shadow-none rounded-md border-2 border-transparent px-4 py-1.5 text-sm font-medium transition-all hover:bg-gray-50"
                >
                  Completed Tasks ({completedTasks.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-6">
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
                        <SelectItem value="assigned">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            Assigned
                          </div>
                        </SelectItem>
                        <SelectItem value="in_progress">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            In Progress
                          </div>
                        </SelectItem>
                        <SelectItem value="rejected">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            Rejected
                          </div>
                        </SelectItem>
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
                        {annotators
                          .filter((a: any) => a.projectRole === "ANNOTATOR")
                          .map((a: any) => (
                            <SelectItem key={a.userId} value={a.userId}>
                              {a.user?.fullName || a.user?.email || "Unknown"}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold">Active Tasks</h3>
                      <p className="text-sm text-muted-foreground">
                        Showing {activeTasks.length} tasks
                        {selectedTasks.length > 0 && (
                          <span className="ml-2 text-blue-600 font-medium">
                            ({selectedTasks.length} selected)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-[50px]">
                            <Checkbox
                              checked={
                                activeTasks.length > 0 &&
                                activeTasks.every((t) =>
                                  selectedTasks.includes(t.id),
                                )
                              }
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTasks(
                                    activeTasks.map((t) => t.id),
                                  );
                                } else {
                                  setSelectedTasks([]);
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>User / Task</TableHead>
                          <TableHead className="w-[100px] text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isTasksLoading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                              <p className="text-sm text-muted-foreground mt-2">
                                Loading tasks...
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : activeTasks.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-8 text-muted-foreground"
                            >
                              No active tasks found
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {Object.entries(groupedActiveTasks).map(
                              ([assigneeId, userTasks]) => {
                                const firstTask = userTasks[0];
                                const annotatorAssignment =
                                  getLatestAnnotatorAssignment(firstTask);
                                const assignee = annotatorAssignment?.annotator;
                                const isExpanded =
                                  expandedUsers.has(assigneeId);
                                const taskCount = userTasks.length;
                                const skippedCount = (userTasks as any[]).filter(
                                  (t) => getLatestAnnotatorAssignment(t)?.status === "SKIPPED"
                                ).length;

                                return (
                                  <React.Fragment key={`group-${assigneeId}`}>
                                    {/* User Group Row */}
                                    <TableRow
                                      className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 cursor-pointer border-b-2 border-gray-300"
                                      onClick={() =>
                                        toggleUserExpansion(assigneeId)
                                      }
                                    >
                                      <TableCell className="py-4">
                                        <Checkbox
                                          checked={userTasks.every((t: any) =>
                                            selectedTasks.includes(t.id),
                                          )}
                                          onCheckedChange={(checked) => {
                                            userTasks.forEach((t: any) =>
                                              handleSelectTask(t.id, !!checked),
                                            );
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </TableCell>
                                      <TableCell colSpan={2} className="py-4">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            {isExpanded ? (
                                              <ChevronDown className="h-5 w-5 text-gray-700 flex-shrink-0" />
                                            ) : (
                                              <ChevronRight className="h-5 w-5 text-gray-700 flex-shrink-0" />
                                            )}
                                            {assignee ? (
                                              <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                                                  <AvatarImage
                                                    src={assignee.avatarUrl}
                                                    alt={assignee.fullName}
                                                  />
                                                  <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                                                    {assignee.fullName
                                                      ?.charAt(0)
                                                      .toUpperCase() || "U"}
                                                  </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-base font-semibold text-gray-900">
                                                      {assignee.fullName}
                                                    </span>
                                                    {skippedCount > 0 && (
                                                      <TooltipProvider>
                                                        <Tooltip>
                                                          <TooltipTrigger asChild>
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 text-[10px] font-semibold cursor-default">
                                                              <AlertTriangle className="w-3 h-3" />
                                                              {skippedCount} skipped
                                                            </span>
                                                          </TooltipTrigger>
                                                          <TooltipContent>
                                                            <p className="text-xs">This annotator has {skippedCount} skipped task{skippedCount > 1 ? "s" : ""} in this project.</p>
                                                          </TooltipContent>
                                                        </Tooltip>
                                                      </TooltipProvider>
                                                    )}
                                                  </div>
                                                  <div className="text-xs text-gray-600">
                                                    {assignee.email}
                                                  </div>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gray-400 flex items-center justify-center ring-2 ring-white shadow-sm">
                                                  <Users className="h-5 w-5 text-white" />
                                                </div>
                                                <span className="text-base font-semibold text-gray-800">
                                                  Unassigned Tasks
                                                </span>
                                              </div>
                                            )}
                                            <Badge
                                              variant="secondary"
                                              className="ml-2 text-sm font-semibold px-3 py-1"
                                            >
                                              {taskCount}{" "}
                                              {taskCount === 1
                                                ? "task"
                                                : "tasks"}
                                            </Badge>
                                          </div>
                                          <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-2"
                                          >
                                            {!assignee &&
                                              (() => {
                                                // Count how many selected tasks are from unassigned section
                                                const unassignedTaskIds =
                                                  userTasks.map(
                                                    (t: any) => t.id,
                                                  );
                                                const selectedUnassignedCount =
                                                  selectedTasks.filter((id) =>
                                                    unassignedTaskIds.includes(
                                                      id,
                                                    ),
                                                  ).length;

                                                return selectedUnassignedCount >
                                                  0 ? (
                                                  <>
                                                    <Button
                                                      onClick={() => {
                                                        setIsBulkAssign(true);
                                                        setIsAssignDialogOpen(
                                                          true,
                                                        );
                                                      }}
                                                      size="sm"
                                                      className="gap-2"
                                                    >
                                                      <Users className="h-4 w-4" />
                                                      Assign{" "}
                                                      {selectedUnassignedCount}{" "}
                                                      Task
                                                      {selectedUnassignedCount >
                                                      1
                                                        ? "s"
                                                        : ""}
                                                    </Button>
                                                    <Button
                                                      onClick={() =>
                                                        setIsDeleteDialogOpen(
                                                          true,
                                                        )
                                                      }
                                                      size="sm"
                                                      variant="destructive"
                                                      className="gap-2"
                                                    >
                                                      <Trash2 className="h-4 w-4" />
                                                      Delete{" "}
                                                      {selectedUnassignedCount}{" "}
                                                      Task
                                                      {selectedUnassignedCount >
                                                      1
                                                        ? "s"
                                                        : ""}
                                                    </Button>
                                                  </>
                                                ) : null;
                                              })()}
                                            {assignee &&
                                              (() => {
                                                // Count how many selected tasks are from this assigned user's section
                                                const assignedUserTaskIds =
                                                  userTasks.map(
                                                    (t: any) => t.id,
                                                  );
                                                const selectedAssignedCount =
                                                  selectedTasks.filter((id) =>
                                                    assignedUserTaskIds.includes(
                                                      id,
                                                    ),
                                                  ).length;

                                                return (
                                                  <>
                                                    {selectedAssignedCount >
                                                      0 && (
                                                      <Button
                                                        onClick={() => {
                                                          setBulkUnassignUserId(
                                                            assigneeId,
                                                          );
                                                          setIsBulkUnassignDialogOpen(
                                                            true,
                                                          );
                                                        }}
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-2"
                                                      >
                                                        <UserMinus className="h-4 w-4" />
                                                        Unassign{" "}
                                                        {selectedAssignedCount}{" "}
                                                        Task
                                                        {selectedAssignedCount >
                                                        1
                                                          ? "s"
                                                          : ""}
                                                      </Button>
                                                    )}
                                                    <DropdownMenu>
                                                      <DropdownMenuTrigger
                                                        asChild
                                                      >
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                        >
                                                          <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                      </DropdownMenuTrigger>
                                                      <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                          onClick={() => {
                                                            setBulkDeadlineUserId(
                                                              assigneeId,
                                                            );
                                                            setIsBulkDeadlineDialogOpen(
                                                              true,
                                                            );
                                                          }}
                                                        >
                                                          <Clock className="mr-2 h-4 w-4" />
                                                          Set Deadline for All
                                                          Tasks
                                                        </DropdownMenuItem>
                                                      </DropdownMenuContent>
                                                    </DropdownMenu>
                                                  </>
                                                );
                                              })()}
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>

                                    {/* Expanded Task Rows */}
                                    {isExpanded &&
                                      getPaginatedUserTasks(
                                        userTasks,
                                        assigneeId,
                                      ).map((task: any, i: number) => {
                                        const taskAssignment =
                                          getLatestAnnotatorAssignment(task);
                                        const status =
                                          taskAssignment?.status ||
                                          "UNASSIGNED";

                                        return (
                                          <TableRow
                                            key={task.id || i}
                                            className="bg-white hover:bg-gray-50 border-b border-gray-100"
                                          >
                                            <TableCell className="py-3">
                                              <Checkbox
                                                checked={selectedTasks.includes(
                                                  task.id,
                                                )}
                                                disabled={
                                                  status === "IN_PROGRESS"
                                                }
                                                onCheckedChange={(checked) =>
                                                  handleSelectTask(
                                                    task.id,
                                                    !!checked,
                                                  )
                                                }
                                              />
                                            </TableCell>
                                            <TableCell className="py-3">
                                              <div className="flex items-center gap-3 pl-8">
                                                <div className="w-14 h-14 rounded overflow-hidden bg-gray-100 border flex-shrink-0">
                                                  <img
                                                    src={task.image?.storageUrl}
                                                    alt={
                                                      task.image
                                                        ?.originalFilename ||
                                                      "Task image"
                                                    }
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                  />
                                                </div>
                                                <div className="min-w-0 flex-1 space-y-1.5">
                                                  <div className="font-medium text-sm truncate">
                                                    {task.image
                                                      ?.originalFilename ||
                                                      "Untitled"}
                                                  </div>
                                                  <div className="text-xs text-muted-foreground font-mono">
                                                    ID: {task.id.slice(0, 8)}...
                                                  </div>
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge
                                                      variant={
                                                        status === "REJECTED"
                                                          ? "destructive"
                                                          : "outline"
                                                      }
                                                      className={`font-normal capitalize text-xs ${
                                                        status === "APPROVED"
                                                          ? "bg-green-100 text-green-800 border-green-300"
                                                          : status ===
                                                              "SUBMITTED"
                                                            ? "bg-purple-100 text-purple-800 border-purple-300"
                                                            : status ===
                                                                "IN_PROGRESS"
                                                              ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                                              : status ===
                                                                  "ASSIGNED"
                                                                ? "bg-blue-100 text-blue-800 border-blue-300"
                                                                : status ===
                                                                    "SKIPPED"
                                                                  ? "bg-orange-100 text-orange-800 border-orange-300"
                                                                  : status ===
                                                                      "UNASSIGNED"
                                                                    ? "bg-gray-100 text-gray-600 border-gray-300"
                                                                    : ""
                                                      }`}
                                                    >
                                                      {status
                                                        .toLowerCase()
                                                        .replace("_", " ")}
                                                    </Badge>
                                                    {taskAssignment &&
                                                      project &&
                                                      taskAssignment.rejectionCount >=
                                                        (project.assignmentRule
                                                          ?.maxRejectionsBeforeReassign ||
                                                          3) && (
                                                        <Badge
                                                          variant="destructive"
                                                          className="animate-pulse bg-red-600 hover:bg-red-700 flex items-center gap-1 text-[10px] py-0 px-2 h-5"
                                                        >
                                                          <AlertTriangle className="h-3 w-3" />
                                                          Needs Reassign
                                                        </Badge>
                                                      )}
                                                    {taskAssignment?.deadline && (
                                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        <span>
                                                          {new Date(
                                                            taskAssignment.deadline,
                                                          ).toLocaleDateString()}{" "}
                                                          {new Date(
                                                            taskAssignment.deadline,
                                                          ).toLocaleTimeString(
                                                            [],
                                                            {
                                                              hour: "2-digit",
                                                              minute: "2-digit",
                                                            },
                                                          )}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                  {status === "SKIPPED" &&
                                                    taskAssignment?.annotatorNote && (
                                                      <div className="mt-1 flex items-start gap-1 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                                                        <span className="font-medium shrink-0">
                                                          Skip reason:
                                                        </span>
                                                        <span className="break-words">
                                                          {
                                                            taskAssignment.annotatorNote
                                                          }
                                                        </span>
                                                      </div>
                                                    )}
                                                </div>
                                              </div>
                                            </TableCell>
                                            <TableCell className="py-3 text-right">
                                              {assignee ? (
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                    >
                                                      <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                      disabled={
                                                        status === "IN_PROGRESS"
                                                      }
                                                      onClick={() => {
                                                        if (
                                                          status ===
                                                          "IN_PROGRESS"
                                                        )
                                                          return;
                                                        setTaskToAssign(task);
                                                        setSelectedAnnotatorId(
                                                          taskAssignment?.annotatorId ||
                                                            "",
                                                        );
                                                        setIsAssignDialogOpen(
                                                          true,
                                                        );
                                                      }}
                                                    >
                                                      <Edit className="mr-2 h-4 w-4" />
                                                      Reassign
                                                      {status ===
                                                        "IN_PROGRESS" && (
                                                        <span className="ml-auto text-xs text-gray-400">
                                                          In Progress
                                                        </span>
                                                      )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                      disabled={
                                                        status === "IN_PROGRESS"
                                                      }
                                                      onClick={() => {
                                                        if (
                                                          status ===
                                                          "IN_PROGRESS"
                                                        )
                                                          return;
                                                        setTaskToUnassign(task);
                                                        setIsUnassignDialogOpen(
                                                          true,
                                                        );
                                                      }}
                                                      className="text-red-600"
                                                    >
                                                      <Trash2 className="mr-2 h-4 w-4" />
                                                      Unassign
                                                      {status ===
                                                        "IN_PROGRESS" && (
                                                        <span className="ml-auto text-xs text-gray-400">
                                                          In Progress
                                                        </span>
                                                      )}
                                                    </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                              ) : (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    setTaskToAssign(task);
                                                    setSelectedAnnotatorId("");
                                                    setIsAssignDialogOpen(true);
                                                  }}
                                                >
                                                  Assign
                                                </Button>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}

                                    {/* Per-User Pagination Controls */}
                                    {isExpanded &&
                                      getUserTotalPages(userTasks) > 1 && (
                                        <TableRow className="bg-gray-50">
                                          <TableCell
                                            colSpan={3}
                                            className="py-3"
                                          >
                                            <div className="flex items-center justify-between px-8">
                                              <div className="text-sm text-muted-foreground">
                                                Page {getUserPage(assigneeId)}{" "}
                                                of{" "}
                                                {getUserTotalPages(userTasks)}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Button
                                                  variant="outline"
                                                  size="icon"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUserPage(assigneeId, 1);
                                                  }}
                                                  disabled={
                                                    getUserPage(assigneeId) ===
                                                    1
                                                  }
                                                >
                                                  <ChevronsLeft className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                  variant="outline"
                                                  size="icon"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUserPage(
                                                      assigneeId,
                                                      Math.max(
                                                        1,
                                                        getUserPage(
                                                          assigneeId,
                                                        ) - 1,
                                                      ),
                                                    );
                                                  }}
                                                  disabled={
                                                    getUserPage(assigneeId) ===
                                                    1
                                                  }
                                                >
                                                  <ChevronLeft className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                  variant="outline"
                                                  size="icon"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUserPage(
                                                      assigneeId,
                                                      Math.min(
                                                        getUserTotalPages(
                                                          userTasks,
                                                        ),
                                                        getUserPage(
                                                          assigneeId,
                                                        ) + 1,
                                                      ),
                                                    );
                                                  }}
                                                  disabled={
                                                    getUserPage(assigneeId) ===
                                                    getUserTotalPages(userTasks)
                                                  }
                                                >
                                                  <ChevronRight className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                  variant="outline"
                                                  size="icon"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setUserPage(
                                                      assigneeId,
                                                      getUserTotalPages(
                                                        userTasks,
                                                      ),
                                                    );
                                                  }}
                                                  disabled={
                                                    getUserPage(assigneeId) ===
                                                    getUserTotalPages(userTasks)
                                                  }
                                                >
                                                  <ChevronsRight className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      )}
                                  </React.Fragment>
                                );
                              },
                            )}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>

              {/* Submitted Tasks Tab */}
              <TabsContent value="submitted" className="space-y-6">
                {/* Search & Filter for Submitted Tasks */}
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
                      value={taskFilterAssignee}
                      onValueChange={setTaskFilterAssignee}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assignees</SelectItem>
                        {annotators
                          .filter((a: any) => a.projectRole === "ANNOTATOR")
                          .map((a: any) => (
                            <SelectItem key={a.userId} value={a.userId}>
                              {a.user?.fullName || a.user?.email || "Unknown"}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold">Submitted Tasks</h3>
                      <p className="text-sm text-muted-foreground">
                        Showing {submittedTasks.length} tasks awaiting review
                        {selectedTasks.length > 0 && (
                          <span className="ml-2 text-blue-600 font-medium">
                            ({selectedTasks.length} selected)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-[50px]">
                            <Checkbox
                              checked={
                                submittedTasks.length > 0 &&
                                submittedTasks.every((t) =>
                                  selectedTasks.includes(t.id),
                                )
                              }
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTasks(
                                    submittedTasks.map((t) => t.id),
                                  );
                                } else {
                                  setSelectedTasks([]);
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>User / Task</TableHead>
                          <TableHead className="w-[120px] text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isTasksLoading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                              <p className="text-sm text-muted-foreground mt-2">
                                Loading tasks...
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : submittedTasks.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center py-8 text-muted-foreground"
                            >
                              No submitted tasks awaiting review
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {Object.entries(groupedSubmittedTasks).map(
                              ([assigneeId, userTasks]) => {
                                const firstTask = userTasks[0];
                                const annotatorAssignment =
                                  getLatestAnnotatorAssignment(firstTask);
                                const assignee = annotatorAssignment?.annotator;
                                const isExpanded =
                                  expandedUsers.has(assigneeId);
                                const taskCount = userTasks.length;

                                return (
                                  <React.Fragment
                                    key={`submitted-group-${assigneeId}`}
                                  >
                                    {/* User Group Row */}
                                    <TableRow
                                      className="bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 cursor-pointer border-b-2 border-purple-300"
                                      onClick={() =>
                                        toggleUserExpansion(assigneeId)
                                      }
                                    >
                                      <TableCell className="py-4">
                                        <Checkbox
                                          checked={userTasks.every((t: any) =>
                                            selectedTasks.includes(t.id),
                                          )}
                                          onCheckedChange={(checked) => {
                                            userTasks.forEach((t: any) =>
                                              handleSelectTask(t.id, !!checked),
                                            );
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </TableCell>
                                      <TableCell colSpan={2}>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            {isExpanded ? (
                                              <ChevronDown className="h-5 w-5 text-gray-700 flex-shrink-0" />
                                            ) : (
                                              <ChevronRight className="h-5 w-5 text-gray-700 flex-shrink-0" />
                                            )}
                                            <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                                              <AvatarImage
                                                src={
                                                  assignee?.avatarUrl ||
                                                  undefined
                                                }
                                                alt={
                                                  assignee?.fullName || "User"
                                                }
                                                className="object-cover"
                                              />
                                              <AvatarFallback className="bg-purple-500 text-white text-sm font-semibold">
                                                {assignee?.fullName
                                                  ?.charAt(0)
                                                  .toUpperCase() || "A"}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                              <div className="font-medium text-gray-900">
                                                {assigneeId === "unassigned"
                                                  ? "Unassigned Tasks"
                                                  : assignee?.fullName ||
                                                    assignee?.email ||
                                                    "Unknown"}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                {taskCount} submitted{" "}
                                                {taskCount === 1
                                                  ? "task"
                                                  : "tasks"}
                                              </div>
                                            </div>
                                          </div>
                                          <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-2"
                                          >
                                            {(() => {
                                              // Count how many selected tasks are from this user's section
                                              const userTaskIds = userTasks.map(
                                                (t: any) => t.id,
                                              );
                                              const selectedUserCount =
                                                selectedTasks.filter((id) =>
                                                  userTaskIds.includes(id),
                                                ).length;

                                              return selectedUserCount > 0 ? (
                                                <>
                                                  <Button
                                                    onClick={() => {
                                                      setIsBulkAssignReviewer(
                                                        true,
                                                      );
                                                      setIsAssignReviewerDialogOpen(
                                                        true,
                                                      );
                                                    }}
                                                    size="sm"
                                                    className="gap-2"
                                                  >
                                                    <Users className="h-4 w-4" />
                                                    Assign {selectedUserCount}{" "}
                                                    Task
                                                    {selectedUserCount > 1
                                                      ? "s"
                                                      : ""}
                                                  </Button>
                                                  <Button
                                                    onClick={() =>
                                                      setIsDeleteDialogOpen(
                                                        true,
                                                      )
                                                    }
                                                    size="sm"
                                                    variant="destructive"
                                                    className="gap-2"
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete {selectedUserCount}{" "}
                                                    Task
                                                    {selectedUserCount > 1
                                                      ? "s"
                                                      : ""}
                                                  </Button>
                                                </>
                                              ) : null;
                                            })()}
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                >
                                                  <MoreVertical className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                  onClick={() => {
                                                    // Navigate to review all submitted tasks for this user
                                                    toast.info(
                                                      "Review feature coming soon",
                                                    );
                                                  }}
                                                >
                                                  <Eye className="mr-2 h-4 w-4" />
                                                  Review All Submitted Tasks
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>

                                    {/* Expanded Tasks */}
                                    {isExpanded &&
                                      getPaginatedUserTasks(
                                        userTasks,
                                        assigneeId,
                                      ).map((task: any) => {
                                        const assignment =
                                          getLatestAnnotatorAssignment(task);
                                        return (
                                          <TableRow
                                            key={`submitted-task-${task.id}`}
                                            className="hover:bg-purple-50/50"
                                          >
                                            <TableCell>
                                              <Checkbox
                                                checked={selectedTasks.includes(
                                                  task.id,
                                                )}
                                                onCheckedChange={(checked) =>
                                                  handleSelectTask(
                                                    task.id,
                                                    !!checked,
                                                  )
                                                }
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              />
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex items-center gap-3 pl-12">
                                                <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 border flex-shrink-0">
                                                  <img
                                                    src={task.image?.storageUrl}
                                                    alt={
                                                      task.image
                                                        ?.originalFilename ||
                                                      "Task"
                                                    }
                                                    className="w-full h-full object-cover"
                                                  />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <div className="font-medium text-sm truncate">
                                                    {task.image
                                                      ?.originalFilename ||
                                                      "Untitled"}
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    ID: {task.id.slice(0, 8)}...
                                                  </div>
                                                  <div className="flex gap-2 mt-1">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                      Submitted
                                                    </span>
                                                    {(() => {
                                                      const reviewerAssignment =
                                                        task.assignments?.find(
                                                          (a: any) =>
                                                            a.reviewerId,
                                                        );
                                                      if (
                                                        reviewerAssignment?.reviewer
                                                      ) {
                                                        return (
                                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                            <Users className="h-3 w-3" />
                                                            {reviewerAssignment
                                                              .reviewer
                                                              .fullName ||
                                                              reviewerAssignment
                                                                .reviewer.email}
                                                          </span>
                                                        );
                                                      } else {
                                                        return (
                                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                            <AlertCircle className="h-3 w-3" />
                                                            No Reviewer
                                                          </span>
                                                        );
                                                      }
                                                    })()}
                                                  </div>
                                                </div>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                  >
                                                    <MoreVertical className="h-4 w-4" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                  <DropdownMenuItem
                                                    onClick={() => {
                                                      setTaskToAssignReviewer(
                                                        task,
                                                      );
                                                      const reviewerAssignment =
                                                        task.assignments?.find(
                                                          (a: any) =>
                                                            a.reviewerId,
                                                        );
                                                      setSelectedReviewerId(
                                                        reviewerAssignment?.reviewerId ||
                                                          "",
                                                      );
                                                      setIsAssignReviewerDialogOpen(
                                                        true,
                                                      );
                                                    }}
                                                  >
                                                    <Users className="mr-2 h-4 w-4" />
                                                    {(() => {
                                                      const reviewerAssignment =
                                                        task.assignments?.find(
                                                          (a: any) =>
                                                            a.reviewerId,
                                                        );
                                                      return reviewerAssignment
                                                        ? "Reassign Reviewer"
                                                        : "Assign Reviewer";
                                                    })()}
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                    onClick={() => {
                                                      const assignmentId =
                                                        assignment?.id;
                                                      if (assignmentId) {
                                                        navigate(
                                                          `/workspace/${assignmentId}?mode=review`,
                                                        );
                                                      }
                                                    }}
                                                  >
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Review Task
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                    onClick={() =>
                                                      handleViewHistory(task)
                                                    }
                                                  >
                                                    <History className="mr-2 h-4 w-4" />
                                                    View History
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                    onClick={() => {
                                                      setSelectedTasks([
                                                        task.id,
                                                      ]);
                                                      setIsDeleteDialogOpen(
                                                        true,
                                                      );
                                                    }}
                                                    className="text-red-600"
                                                  >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete Task
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}

                                    {/* Pagination for submitted tasks */}
                                    {isExpanded &&
                                      getUserTotalPages(userTasks) > 1 && (
                                        <TableRow className="bg-gray-50">
                                          <TableCell colSpan={3}>
                                            <div className="flex items-center justify-center gap-2 py-2">
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setUserPage(assigneeId, 1);
                                                }}
                                                disabled={
                                                  getUserPage(assigneeId) === 1
                                                }
                                              >
                                                <ChevronsLeft className="w-4 h-4" />
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setUserPage(
                                                    assigneeId,
                                                    Math.max(
                                                      1,
                                                      getUserPage(assigneeId) -
                                                        1,
                                                    ),
                                                  );
                                                }}
                                                disabled={
                                                  getUserPage(assigneeId) === 1
                                                }
                                              >
                                                <ChevronLeft className="w-4 h-4" />
                                              </Button>
                                              <span className="text-sm text-muted-foreground px-2">
                                                Page {getUserPage(assigneeId)}{" "}
                                                of{" "}
                                                {getUserTotalPages(userTasks)}
                                              </span>
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setUserPage(
                                                    assigneeId,
                                                    Math.min(
                                                      getUserTotalPages(
                                                        userTasks,
                                                      ),
                                                      getUserPage(assigneeId) +
                                                        1,
                                                    ),
                                                  );
                                                }}
                                                disabled={
                                                  getUserPage(assigneeId) ===
                                                  getUserTotalPages(userTasks)
                                                }
                                              >
                                                <ChevronRight className="w-4 h-4" />
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setUserPage(
                                                    assigneeId,
                                                    getUserTotalPages(
                                                      userTasks,
                                                    ),
                                                  );
                                                }}
                                                disabled={
                                                  getUserPage(assigneeId) ===
                                                  getUserTotalPages(userTasks)
                                                }
                                              >
                                                <ChevronsRight className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      )}
                                  </React.Fragment>
                                );
                              },
                            )}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>

              {/* Rejected Tasks Tab */}
              <TabsContent value="rejected" className="space-y-6">
                {/* Search & Filter for Rejected Tasks */}
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
                      value={taskFilterAssignee}
                      onValueChange={setTaskFilterAssignee}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assignees</SelectItem>
                        {annotators
                          .filter((a: any) => a.projectRole === "ANNOTATOR")
                          .map((a: any) => (
                            <SelectItem key={a.userId} value={a.userId}>
                              {a.user?.fullName || a.user?.email || "Unknown"}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold">Rejected Tasks</h3>
                      <p className="text-sm text-muted-foreground">
                        Showing {rejectedTasks.length} rejected tasks
                      </p>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-[50px]">
                            <Checkbox
                              checked={
                                rejectedTasks.length > 0 &&
                                rejectedTasks.every((t) =>
                                  selectedTasks.includes(t.id),
                                )
                              }
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTasks(
                                    rejectedTasks.map((t) => t.id),
                                  );
                                } else {
                                  setSelectedTasks([]);
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>User / Task</TableHead>
                          <TableHead className="w-[120px] text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isTasksLoading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                              <p className="text-sm text-muted-foreground mt-2">
                                Loading tasks...
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : rejectedTasks.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center py-8 text-muted-foreground"
                            >
                              No rejected tasks found
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {Object.entries(groupedRejectedTasks).map(
                              ([assigneeId, userTasks]) => {
                                const firstTask = userTasks[0];
                                const annotatorAssignment =
                                  firstTask._specificAssignment;
                                const assignee = annotatorAssignment?.annotator;
                                const isExpanded =
                                  expandedUsers.has(assigneeId);
                                const taskCount = userTasks.length;

                                return (
                                  <React.Fragment
                                    key={`rejected-group-${assigneeId}`}
                                  >
                                    <TableRow
                                      className="bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 cursor-pointer border-b-2 border-red-300"
                                      onClick={() =>
                                        toggleUserExpansion(assigneeId)
                                      }
                                    >
                                      <TableCell className="py-4">
                                        <Checkbox
                                          checked={userTasks.every((t: any) =>
                                            selectedTasks.includes(t.id),
                                          )}
                                          onCheckedChange={(checked) => {
                                            userTasks.forEach((t: any) =>
                                              handleSelectTask(t.id, !!checked),
                                            );
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </TableCell>
                                      <TableCell colSpan={2}>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            {isExpanded ? (
                                              <ChevronDown className="h-5 w-5 text-gray-700 flex-shrink-0" />
                                            ) : (
                                              <ChevronRight className="h-5 w-5 text-gray-700 flex-shrink-0" />
                                            )}
                                            <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                                              <AvatarImage
                                                src={
                                                  assignee?.avatarUrl ||
                                                  undefined
                                                }
                                                alt={
                                                  assignee?.fullName || "User"
                                                }
                                                className="object-cover"
                                              />
                                              <AvatarFallback className="bg-red-500 text-white text-sm font-semibold">
                                                {assigneeId === "unassigned"
                                                  ? "?"
                                                  : assignee?.fullName
                                                      ?.charAt(0)
                                                      .toUpperCase() || "A"}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                              <div className="font-medium text-gray-900">
                                                {assigneeId === "unassigned"
                                                  ? "Unassigned Tasks"
                                                  : assignee?.fullName ||
                                                    assignee?.email ||
                                                    "Unknown"}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                {taskCount} rejected{" "}
                                                {taskCount === 1
                                                  ? "task"
                                                  : "tasks"}
                                              </div>
                                            </div>
                                          </div>
                                          <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-2"
                                          >
                                            {(() => {
                                              const unskippedTasks =
                                                userTasks.filter(
                                                  (t: any) =>
                                                    !t._isHistoricalSkip,
                                                );
                                              const userTaskIds =
                                                unskippedTasks.map(
                                                  (t: any) => t.id,
                                                );
                                              const selectedUserCount =
                                                selectedTasks.filter((id) =>
                                                  userTaskIds.includes(id),
                                                ).length;

                                              return selectedUserCount > 0 ? (
                                                <Button
                                                  onClick={() => {
                                                    setIsBulkAssign(true);
                                                    setIsAssignDialogOpen(true);
                                                  }}
                                                  size="sm"
                                                  className="gap-2"
                                                >
                                                  <Users className="h-4 w-4" />
                                                  Reassign {
                                                    selectedUserCount
                                                  }{" "}
                                                  Task
                                                  {selectedUserCount > 1
                                                    ? "s"
                                                    : ""}
                                                </Button>
                                              ) : null;
                                            })()}
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>

                                    {isExpanded &&
                                      getPaginatedUserTasks(
                                        userTasks,
                                        assigneeId,
                                      ).map((task: any) => {
                                        const annotatorAssignment =
                                          task._specificAssignment ||
                                          getLatestAnnotatorAssignment(task);
                                        return (
                                          <TableRow
                                            key={`rejected-task-${task.id}`}
                                            className="hover:bg-red-50/50"
                                          >
                                            <TableCell>
                                              <Checkbox
                                                checked={selectedTasks.includes(
                                                  task.id,
                                                )}
                                                onCheckedChange={(checked) =>
                                                  handleSelectTask(
                                                    task.id,
                                                    !!checked,
                                                  )
                                                }
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              />
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex items-center gap-3 pl-12">
                                                <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 border flex-shrink-0">
                                                  <img
                                                    src={task.image?.storageUrl}
                                                    alt={
                                                      task.image
                                                        ?.originalFilename ||
                                                      "Task"
                                                    }
                                                    className="w-full h-full object-cover"
                                                  />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <div className="font-medium text-sm truncate">
                                                    {task.image
                                                      ?.originalFilename ||
                                                      "Untitled"}
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    ID: {task.id.slice(0, 8)}...
                                                  </div>
                                                  <div className="mt-1 flex gap-2">
                                                    {(() => {
                                                      const label = "Rejected";
                                                      const colorClass =
                                                        "bg-red-100 text-red-700";
                                                      return (
                                                        <span
                                                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
                                                        >
                                                          {label}
                                                        </span>
                                                      );
                                                    })()}
                                                    {annotatorAssignment && (
                                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                                        <AlertCircle className="h-3 w-3" />
                                                        {annotatorAssignment.rejectionCount ||
                                                          0}{" "}
                                                        Rejection
                                                        {annotatorAssignment.rejectionCount !==
                                                        1
                                                          ? "s"
                                                          : ""}
                                                      </span>
                                                    )}
                                                    {annotatorAssignment &&
                                                      project &&
                                                      annotatorAssignment.rejectionCount >=
                                                        (project.assignmentRule
                                                          ?.maxRejectionsBeforeReassign ||
                                                          3) && (
                                                        <Badge
                                                          variant="destructive"
                                                          className="animate-pulse bg-red-600 hover:bg-red-700 flex items-center gap-1 text-[10px] py-0 px-2 h-5 border-none"
                                                        >
                                                          <AlertTriangle className="h-3 w-3" />
                                                          Needs Reassign
                                                        </Badge>
                                                      )}
                                                  </div>
                                                </div>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <div className="flex items-center justify-end gap-2">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() =>
                                                    handleViewHistory(task)
                                                  }
                                                  title="View Task History"
                                                >
                                                  <History className="h-4 w-4" />
                                                </Button>
                                                {
                                                  /* Reassign Button: Allow reassign only if max rejections reached and not currently handled */
                                                  annotatorAssignment &&
                                                    annotatorAssignment.rejectionCount >=
                                                      (project?.assignmentRule
                                                        ?.maxRejectionsBeforeReassign ||
                                                        3) &&
                                                    !(
                                                      [
                                                        "IN_PROGRESS",
                                                        "SUBMITTED",
                                                        "APPROVED",
                                                      ].includes(
                                                        task.status?.toUpperCase(),
                                                      ) ||
                                                      task.assignments?.some(
                                                        (a: any) =>
                                                          [
                                                            "ASSIGNED",
                                                            "IN_PROGRESS",
                                                            "SUBMITTED",
                                                            "APPROVED",
                                                          ].includes(
                                                            a.status?.toUpperCase(),
                                                          ),
                                                      )
                                                    ) && (
                                                      <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                          setTaskToAssign(task);
                                                          setSelectedAnnotatorId(
                                                            assigneeId !==
                                                              "unassigned"
                                                              ? assigneeId
                                                              : "",
                                                          );
                                                          setIsAssignDialogOpen(
                                                            true,
                                                          );
                                                        }}
                                                      >
                                                        Reassign
                                                      </Button>
                                                    )
                                                }
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                  </React.Fragment>
                                );
                              },
                            )}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>

              {/* Completed Tasks Tab */}
              <TabsContent value="completed" className="space-y-6">
                {/* Search & Filter for Completed Tasks */}
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
                      value={taskFilterAssignee}
                      onValueChange={setTaskFilterAssignee}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Assignees</SelectItem>
                        {annotators
                          .filter((a: any) => a.projectRole === "ANNOTATOR")
                          .map((a: any) => (
                            <SelectItem key={a.userId} value={a.userId}>
                              {a.user?.fullName || a.user?.email || "Unknown"}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold">Completed Tasks</h3>
                      <p className="text-sm text-muted-foreground">
                        Showing {completedTasks.length} completed tasks
                      </p>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>User / Task</TableHead>
                          <TableHead className="w-[100px] text-right">
                            Status
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isTasksLoading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                              <p className="text-sm text-muted-foreground mt-2">
                                Loading tasks...
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : completedTasks.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center py-8 text-muted-foreground"
                            >
                              No completed tasks yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {Object.entries(groupedCompletedTasks).map(
                              ([assigneeId, userTasks]) => {
                                const firstTask = userTasks[0];
                                const annotatorAssignment =
                                  getLatestAnnotatorAssignment(firstTask);
                                const assignee = annotatorAssignment?.annotator;
                                const isExpanded =
                                  expandedUsers.has(assigneeId);
                                const taskCount = userTasks.length;

                                return (
                                  <React.Fragment
                                    key={`completed-group-${assigneeId}`}
                                  >
                                    {/* User Group Row */}
                                    <TableRow
                                      className="bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 cursor-pointer border-b-2 border-green-300"
                                      onClick={() =>
                                        toggleUserExpansion(assigneeId)
                                      }
                                    >
                                      <TableCell className="py-4"></TableCell>
                                      <TableCell colSpan={2}>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            {isExpanded ? (
                                              <ChevronDown className="h-5 w-5 text-gray-700 flex-shrink-0" />
                                            ) : (
                                              <ChevronRight className="h-5 w-5 text-gray-700 flex-shrink-0" />
                                            )}
                                            <Avatar className="h-10 w-10 ring-2 ring-white shadow-sm">
                                              <AvatarImage
                                                src={
                                                  assignee?.avatarUrl || undefined
                                                }
                                                alt={assignee?.fullName || "User"}
                                                className="object-cover"
                                              />
                                              <AvatarFallback className="bg-green-500 text-white text-sm font-semibold">
                                                {assigneeId === "unassigned"
                                                  ? "?"
                                                  : assignee?.fullName
                                                      ?.charAt(0)
                                                      .toUpperCase() || "A"}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                              <div className="font-medium text-gray-900">
                                                {assigneeId === "unassigned"
                                                  ? "Unassigned Tasks"
                                                  : assignee?.fullName ||
                                                    assignee?.email ||
                                                    "Unknown"}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                {taskCount} completed{" "}
                                                {taskCount === 1
                                                  ? "task"
                                                  : "tasks"}
                                              </div>
                                            </div>
                                          </div>
                                        
                                        </div>
                                      </TableCell>
                                    </TableRow>

                                    {/* Expanded Tasks */}
                                    {isExpanded &&
                                      getPaginatedUserTasks(
                                        userTasks,
                                        assigneeId,
                                      ).map((task: any) => {
                                        return (
                                          <TableRow
                                            key={`completed-task-${task.id}`}
                                            className="hover:bg-green-50/50"
                                          >
                                            <TableCell></TableCell>
                                            <TableCell>
                                              <div className="flex items-center gap-3 pl-12">
                                                <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 border flex-shrink-0">
                                                  <img
                                                    src={task.image?.storageUrl}
                                                    alt={
                                                      task.image
                                                        ?.originalFilename ||
                                                      "Task"
                                                    }
                                                    className="w-full h-full object-cover"
                                                  />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <div className="font-medium text-sm truncate">
                                                    {task.image
                                                      ?.originalFilename ||
                                                      "Untitled"}
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    ID: {task.id.slice(0, 8)}...
                                                  </div>
                                                </div>
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Approved
                                              </span>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}

                                    {/* Pagination for completed tasks */}
                                    {isExpanded &&
                                      getUserTotalPages(userTasks) > 1 && (
                                        <TableRow className="bg-gray-50">
                                          <TableCell colSpan={3}>
                                            <div className="flex items-center justify-center gap-2 py-2">
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setUserPage(assigneeId, 1);
                                                }}
                                                disabled={
                                                  getUserPage(assigneeId) === 1
                                                }
                                              >
                                                <ChevronsLeft className="w-4 h-4" />
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setUserPage(
                                                    assigneeId,
                                                    Math.max(
                                                      1,
                                                      getUserPage(assigneeId) -
                                                        1,
                                                    ),
                                                  );
                                                }}
                                                disabled={
                                                  getUserPage(assigneeId) === 1
                                                }
                                              >
                                                <ChevronLeft className="w-4 h-4" />
                                              </Button>
                                              <span className="text-sm text-muted-foreground px-2">
                                                Page {getUserPage(assigneeId)}{" "}
                                                of{" "}
                                                {getUserTotalPages(userTasks)}
                                              </span>
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setUserPage(
                                                    assigneeId,
                                                    Math.min(
                                                      getUserTotalPages(
                                                        userTasks,
                                                      ),
                                                      getUserPage(assigneeId) +
                                                        1,
                                                    ),
                                                  );
                                                }}
                                                disabled={
                                                  getUserPage(assigneeId) ===
                                                  getUserTotalPages(userTasks)
                                                }
                                              >
                                                <ChevronRight className="w-4 h-4" />
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setUserPage(
                                                    assigneeId,
                                                    getUserTotalPages(
                                                      userTasks,
                                                    ),
                                                  );
                                                }}
                                                disabled={
                                                  getUserPage(assigneeId) ===
                                                  getUserTotalPages(userTasks)
                                                }
                                              >
                                                <ChevronsRight className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      )}
                                  </React.Fragment>
                                );
                              },
                            )}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <Tabs defaultValue="datasets" className="space-y-4">
              <TabsList className="inline-flex h-auto gap-2 bg-transparent border-b w-full justify-start rounded-none p-0 pb-3">
                <TabsTrigger
                  value="datasets"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-700 data-[state=active]:shadow-none rounded-md border-2 border-transparent px-4 py-1.5 text-sm font-medium transition-all hover:bg-gray-50"
                >
                  Datasets
                </TabsTrigger>
                <TabsTrigger
                  value="labels"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-700 data-[state=active]:shadow-none rounded-md border-2 border-transparent px-4 py-1.5 text-sm font-medium transition-all hover:bg-gray-50"
                >
                  Labels
                </TabsTrigger>
                <TabsTrigger
                  value="requests"
                  className="relative data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-700 data-[state=active]:shadow-none rounded-md border-2 border-transparent px-4 py-1.5 text-sm font-medium transition-all hover:bg-gray-50"
                >
                  Label Requests
                  {pendingLabelRequests > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                      {pendingLabelRequests}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="datasets">
                <DatasetList
                  projectId={project.id}
                  onDatasetDeleted={fetchTasks}
                />
              </TabsContent>

              <TabsContent value="labels" className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Label Management
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select the labels that annotators can use in this project.
                  </p>
                  <LabelSelector
                    projectId={project.id}
                    selectedLabelIds={selectedLabelIds}
                    onSelectionChange={setSelectedLabelIds}
                    allowCreateLabel={false}
                  />
                </Card>

                {/* Save Button */}
                <div className="flex justify-end gap-3 sticky bottom-6 z-10">
                  <div className="bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-gray-100 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("tasks")}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveLabels}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Save Labels
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="requests" className="space-y-6">
                <LabelRequestManager
                  projectId={project.id}
                  onUpdatePendingCount={setPendingLabelRequests}
                  onLabelApproved={(labelId) => {
                    setSelectedLabelIds((prev) => {
                      if (!prev.includes(labelId)) {
                        return [...prev, labelId];
                      }
                      return prev;
                    });
                  }}
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <Tabs defaultValue="members" className="space-y-4">
              <TabsList className="inline-flex h-auto gap-2 bg-transparent border-b w-full justify-start rounded-none p-0 pb-3">
                <TabsTrigger
                  value="members"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-700 data-[state=active]:shadow-none rounded-md border-2 border-transparent px-4 py-1.5 text-sm font-medium transition-all hover:bg-gray-50"
                >
                  Members
                </TabsTrigger>
                <TabsTrigger
                  value="chat"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-700 data-[state=active]:shadow-none rounded-md border-2 border-transparent px-4 py-1.5 text-sm font-medium transition-all hover:bg-gray-50"
                >
                  Chat
                </TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">
                      Team Members
                    </h3>
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
                    title: "Reviewers",
                    color: "text-blue-600",
                    bgColor: "bg-blue-100",
                    role: "REVIEWER",
                    description: "Can review and approve annotations.",
                  },
                  {
                    title: "Annotators",
                    color: "text-emerald-600",
                    bgColor: "bg-emerald-100",
                    role: "ANNOTATOR",
                    description: "Can label tasks assigned to them.",
                  },
                ].map((group) => {
                  const groupMembers = projectMembers.filter(
                    (m: any) => m.projectRole === group.role,
                  );
                  return (
                    <Card key={group.role} className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div>
                          <h4 className="text-lg font-semibold flex items-center gap-2">
                            {group.title}
                            <Badge
                              variant="secondary"
                              className="ml-2 font-normal"
                            >
                              {groupMembers.length}
                            </Badge>
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {group.description}
                          </p>
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
                              <TableHead className="text-right">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupMembers.map((member: any) => (
                              <TableRow key={member.id}>
                                <TableCell className="flex items-center gap-3">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={member.user?.avatarUrl} />
                                    <AvatarFallback>
                                      {member.user?.fullName?.[0] ||
                                        member.user?.email?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">
                                      {member.user?.fullName || "Unknown"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {member.user?.email}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {format(
                                    new Date(member.joinedAt),
                                    "MMM dd, yyyy",
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() =>
                                        confirmRemoveMember(member)
                                      }
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

              <TabsContent value="chat" className="space-y-6">
                <ChatPanel
                  projectId={project.id}
                  projectName={project.name}
                  isManager={
                    project.members?.find((m) => m.user?.id === user?.id)
                      ?.projectRole === "MANAGER"
                  }
                />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Navigation for Settings (Optional simple vertical layout now) */}

              {/* Main Settings Area */}
              <div className="md:col-span-3 space-y-6">
                {/* 1. General Settings */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-blue-600" />
                    General Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Project Name</Label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={editStatus}
                          onValueChange={(val: ProjectStatus) =>
                            setEditStatus(val)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(ProjectStatus).map((s) => {
                              const isCompleted = s === ProjectStatus.COMPLETED;
                              const isDisabled =
                                isCompleted && projectProgress < 100;

                              return (
                                <SelectItem
                                  key={s}
                                  value={s}
                                  disabled={isDisabled}
                                  title={
                                    isDisabled
                                      ? "Project progress must be 100% to complete"
                                      : undefined
                                  }
                                >
                                  {s}
                                  {isDisabled && " (100% required)"}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Description</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAiRefactorDescription}
                          disabled={isAiRefactoring || !editDescription}
                          className="h-8 gap-2"
                        >
                          {isAiRefactoring ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Refactoring...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" />
                              AI Generate
                            </>
                          )}
                        </Button>
                      </div>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={editCategoryId}
                          onValueChange={setEditCategoryId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Deadline</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {editDeadline
                                ? format(editDeadline, "PPP")
                                : "Pick a date"}
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

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="space-y-0.5">
                        <Label className="text-base">AI Assistance</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow annotators to use AI models for pre-labeling.
                        </p>
                      </div>
                      <Switch
                        checked={editEnableAi}
                        onCheckedChange={setEditEnableAi}
                      />
                    </div>
                  </div>
                </Card>

                {/* 2. Assignment Rules */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" />
                    Assignment Rules
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Configure how tasks are distributed and reviewed.
                  </p>

                  <div className="space-y-8">
                    {/* 1a. Auto-Assign Tasks */}
                    <div className="rounded-lg border border-gray-200 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm text-gray-900">Auto-Assign Tasks</h4>
                          <Popover>
                            <PopoverTrigger>
                              <AlertCircle className="w-4 h-4 text-gray-400 cursor-help" />
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <p className="text-sm">
                                Automatically distribute new image uploads to
                                available annotators based on the selected strategy.
                              </p>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <Switch
                          checked={editAssignmentRule.isAutoAssignEnabled}
                          onCheckedChange={(c) =>
                            setEditAssignmentRule((p) => ({
                              ...p,
                              isAutoAssignEnabled: c,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-600">Assignment Strategy</Label>
                        <Select
                          value={editAssignmentRule.assignmentStrategy}
                          onValueChange={(v) =>
                            setEditAssignmentRule((p) => ({
                              ...p,
                              assignmentStrategy: v,
                            }))
                          }
                          disabled={!editAssignmentRule.isAutoAssignEnabled}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ROUND_ROBIN">Round Robin</SelectItem>
                            <SelectItem value="LEAST_BUSY">Least Busy</SelectItem>
                            <SelectItem value="RANDOM">Random</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* 1b. Auto-Assign Reviewer */}
                    <div className="rounded-lg border border-gray-200 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm text-gray-900">Auto-Assign Reviewer</h4>
                          <Popover>
                            <PopoverTrigger>
                              <AlertCircle className="w-4 h-4 text-gray-400 cursor-help" />
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <p className="text-sm">
                                Automatically assign a reviewer when an annotator
                                submits a task. Works independently of Auto-Assign
                                Tasks.
                              </p>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <Switch
                          checked={editAssignmentRule.autoAssignReviewer}
                          onCheckedChange={(c) =>
                            setEditAssignmentRule((p) => ({
                              ...p,
                              autoAssignReviewer: c,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-600">Assignment Strategy</Label>
                        <Select
                          value={editAssignmentRule.reviewerAssignmentStrategy}
                          onValueChange={(v) =>
                            setEditAssignmentRule((p) => ({
                              ...p,
                              reviewerAssignmentStrategy: v,
                            }))
                          }
                          disabled={!editAssignmentRule.autoAssignReviewer}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ROUND_ROBIN">Round Robin</SelectItem>
                            <SelectItem value="LEAST_BUSY">Least Busy</SelectItem>
                            <SelectItem value="RANDOM">Random</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-600">Assignment Delay (hours)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={editAssignmentRule.reviewerDelayHours}
                          onChange={(e) =>
                            setEditAssignmentRule((p) => ({
                              ...p,
                              reviewerDelayHours: parseInt(e.target.value) || 0,
                            }))
                          }
                          disabled={!editAssignmentRule.autoAssignReviewer}
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional delay before assigning reviewer (0 = immediate)
                        </p>
                      </div>
                    </div>

                    {/* 2. Workload & Capacity Limits */}
                    <div>
                      <h4 className="font-medium text-sm text-gray-900 border-b pb-2 mb-4">
                        Workload & Capacity Limits
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Max Tasks per Annotator</Label>
                          <Input
                            type="number"
                            min="1"
                            value={editAssignmentRule.maxTasksPerAnnotator}
                            onChange={(e) =>
                              setEditAssignmentRule((p) => ({
                                ...p,
                                maxTasksPerAnnotator:
                                  parseInt(e.target.value) || 1,
                              }))
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Maximum concurrent tasks per annotator
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Max Tasks per Reviewer</Label>
                          <Input
                            type="number"
                            min="1"
                            value={editAssignmentRule.maxTasksPerReviewer}
                            onChange={(e) =>
                              setEditAssignmentRule((p) => ({
                                ...p,
                                maxTasksPerReviewer:
                                  parseInt(e.target.value) || 1,
                              }))
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Maximum review queue size per reviewer
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 3. Quality Requirements */}
                    <div>
                      <h4 className="font-medium text-sm text-gray-900 border-b pb-2 mb-4">
                        Quality Requirements
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Min Annotator Reputation (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={editAssignmentRule.minAnnotatorReputation}
                            onChange={(e) =>
                              setEditAssignmentRule((p) => ({
                                ...p,
                                minAnnotatorReputation:
                                  parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Minimum reputation score required for annotators
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Min Reviewer Reputation (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={editAssignmentRule.minReviewerReputation}
                            onChange={(e) =>
                              setEditAssignmentRule((p) => ({
                                ...p,
                                minReviewerReputation:
                                  parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Minimum reputation score required for reviewers
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 4. Quality Control */}
                    <div>
                      <h4 className="font-medium text-sm text-gray-900 border-b pb-2 mb-4">
                        Quality Control
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Max Rejections Before Reassign</Label>
                          <Input
                            type="number"
                            min="1"
                            value={
                              editAssignmentRule.maxRejectionsBeforeReassign
                            }
                            onChange={(e) =>
                              setEditAssignmentRule((p) => ({
                                ...p,
                                maxRejectionsBeforeReassign:
                                  parseInt(e.target.value) || 1,
                              }))
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Reassign task to another annotator after this many
                            rejections
                          </p>
                        </div>

                        {/* <div className="flex items-center justify-between pt-6">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Label>Auto-Reassign on Skip</Label>
                              <Popover>
                                <PopoverTrigger>
                                  <AlertCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <p className="text-sm">
                                    If an annotator skips a task, it will be
                                    automatically reassigned to another
                                    annotator.
                                  </p>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Automatically reassign skipped tasks
                            </p>
                          </div>
                          <Switch
                            checked={editAssignmentRule.autoReassignOnSkip}
                            onCheckedChange={(c) =>
                              setEditAssignmentRule((p) => ({
                                ...p,
                                autoReassignOnSkip: c,
                              }))
                            }
                          />
                        </div> */}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end gap-3 sticky bottom-6 z-10">
                  <div className="bg-white/80 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-gray-100 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("tasks")}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleEditProject}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Save All Settings
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <ActivityTab projectId={project.id} />
          </TabsContent>
        </Tabs>

        {/* Remove Member Alert Dialog */}
        <AlertDialog
          open={isRemoveMemberOpen}
          onOpenChange={setIsRemoveMemberOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove {memberToRemove?.user?.fullName} from the
                project. They will no longer have access to tasks and data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={handleRemoveMember}
              >
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
        <Dialog
          open={isAddMemberOpen}
          onOpenChange={(open) => {
            setIsAddMemberOpen(open);
            if (open) {
              handleSearchUsers("");
            } else {
              // Reset state on close
              setMemberSearchQuery("");
              setPotentialMembers([]);
              setSelectedMembers([]);
              setMemberRoleFilter("all");
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Members to Project</DialogTitle>
              <DialogDescription>
                Search and select multiple users to invite.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Search & Filter</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by name or email..."
                    value={memberSearchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    className="flex-1"
                  />
                  <Select
                    value={memberRoleFilter}
                    onValueChange={setMemberRoleFilter}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="ANNOTATOR">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          Annotator
                        </div>
                      </SelectItem>
                      <SelectItem value="REVIEWER">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          Reviewer
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Members Summary */}
                {selectedMembers.length > 0 && (
                  <div className="space-y-2">
                    {(() => {
                      const reviewerCount = selectedMembers.filter(
                        (u) => u.role === "REVIEWER",
                      ).length;
                      const annotatorCount = selectedMembers.filter(
                        (u) => u.role === "ANNOTATOR",
                      ).length;
                      const parts = [];
                      if (reviewerCount > 0) {
                        parts.push(
                          `${reviewerCount} Reviewer${reviewerCount > 1 ? "s" : ""}`,
                        );
                      }
                      if (annotatorCount > 0) {
                        parts.push(
                          `${annotatorCount} Annotator${annotatorCount > 1 ? "s" : ""}`,
                        );
                      }
                      return parts.length > 0 ? (
                        <p className="text-xs text-gray-600 font-medium">
                          You are choosing {parts.join(" and ")}
                        </p>
                      ) : null;
                    })()}
                    <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-md border border-gray-200 max-h-[100px] overflow-y-auto">
                      {selectedMembers.map((user) => (
                        <Badge
                          key={user.id}
                          variant="secondary"
                          className={`${
                            user.role === "ANNOTATOR"
                              ? "bg-emerald-50 hover:bg-emerald-50 text-emerald-700 border-emerald-200"
                              : user.role === "REVIEWER"
                                ? "bg-blue-50 hover:bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-white hover:bg-white text-gray-700 border-gray-200"
                          } pl-2 pr-1 py-1 flex items-center gap-1`}
                        >
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
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="w-3 h-3"
                            >
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Potential Members List */}
                <Card className="h-[400px] overflow-auto mt-2 border-gray-200 shadow-sm">
                  <ScrollArea className="h-full">
                    <div className="p-1 space-y-1">
                      {isSearchingMembers && (
                        <div className="p-2 text-center text-xs text-muted-foreground">
                          Searching...
                        </div>
                      )}

                      {!isSearchingMembers && potentialMembers.length === 0 && (
                        <div className="p-2 text-center text-xs text-muted-foreground">
                          {memberSearchQuery.trim() === ""
                            ? "No other users available to add."
                            : "No users found matching your search."}
                        </div>
                      )}

                      {potentialMembers
                        .filter((user) => {
                          // Filter by role
                          if (memberRoleFilter === "all") return true;
                          return user.role === memberRoleFilter;
                        })
                        .map((user) => {
                          const isSelected = selectedMembers.some(
                            (m) => m.id === user.id,
                          );
                          return (
                            <div
                              key={user.id}
                              className={`
                                                                        flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors
                                                                        ${isSelected ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-100"}
                                                                    `}
                              onClick={() => handleToggleMemberSelection(user)}
                            >
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}
                              >
                                {isSelected && (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-3 h-3 text-white"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={user.avatarUrl} />
                                <AvatarFallback>
                                  {user.fullName?.[0] || user.email?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 overflow-hidden">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">
                                    {user.fullName || "Unknown User"}
                                  </p>
                                  {user.role === "ANNOTATOR" && (
                                    <>
                                      <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                                        <Sparkles className="w-3 h-3" />
                                        <span>
                                          {Math.max(
                                            0,
                                            user.reputationScore || 0,
                                          )}{" "}
                                          pts
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Award className="w-3.5 h-3.5 text-orange-500" />
                                        <span>
                                          Lv.
                                          {calculateLevelLinear(
                                            Math.max(
                                              0,
                                              user.reputationScore || 0,
                                            ),
                                            10,
                                          )}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {user.email}
                                </p>
                              </div>
                              {user.role && (
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] h-5 px-1 ${
                                    user.role === "ANNOTATOR"
                                      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                                      : user.role === "REVIEWER"
                                        ? "bg-blue-100 text-blue-700 border-blue-300"
                                        : "bg-gray-100 text-gray-600 border-gray-200"
                                  }`}
                                >
                                  {user.role}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </ScrollArea>
                </Card>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsAddMemberOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddMembers}
                disabled={selectedMembers.length === 0 || isAddingMembers}
              >
                {isAddingMembers ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    Add{" "}
                    {selectedMembers.length > 0
                      ? `${selectedMembers.length} Members`
                      : "Members"}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        {/* Dialogs */}
        <DatasetCreateDialog
          projectId={project.id}
          open={false}
          onOpenChange={() => {}}
          onSuccess={() => {}}
        />

        <UploadImageDialog
          projectId={project.id}
          open={isAddImagesOpen}
          onOpenChange={setIsAddImagesOpen}
          onSuccess={() => {
            // Maybe refresh project stats or dataset list?
            // For now, simple toast
            toast.success("Project updated");
          }}
        />

        {/* Task Assignment Dialog */}
        <Dialog
          open={isAssignDialogOpen}
          onOpenChange={(open) => {
            setIsAssignDialogOpen(open);
            if (!open) {
              setIsBulkAssign(false);
              setTaskToAssign(null);
              setSelectedAnnotatorId("");
              setSelectedDeadline(undefined);
              setReassignmentReason("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isBulkAssign
                  ? `Assign ${selectedTasks.length} Tasks`
                  : (() => {
                      const hasCurrentAssignment =
                        taskToAssign?.assignments?.find(
                          (a: any) => a.annotatorId,
                        );
                      return hasCurrentAssignment
                        ? "Reassign Task"
                        : "Assign Task";
                    })()}
              </DialogTitle>
              <DialogDescription>
                {isBulkAssign
                  ? `Assign ${selectedTasks.length} selected tasks to an annotator.`
                  : (() => {
                      const hasCurrentAssignment =
                        taskToAssign?.assignments?.find(
                          (a: any) => a.annotatorId,
                        );
                      return hasCurrentAssignment
                        ? "Reassign this task to a different annotator."
                        : "Assign this task to an annotator in the project.";
                    })()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Task Preview - Show for single assign or bulk summary */}
              {isBulkAssign ? (
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-center w-16 h-16 rounded bg-blue-100 text-blue-700 font-semibold text-xl">
                    {selectedTasks.length}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-blue-900">
                      {selectedTasks.length} Tasks Selected
                    </div>
                    <div className="text-xs text-blue-700">
                      All selected tasks will be assigned to the chosen
                      annotator
                    </div>
                  </div>
                </div>
              ) : (
                taskToAssign && (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 border">
                      <img
                        src={taskToAssign.image?.storageUrl}
                        alt={taskToAssign.image?.originalFilename || "Task"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {taskToAssign.image?.originalFilename || "Untitled"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: {taskToAssign.id.slice(0, 8)}...
                      </div>
                      <Badge
                        variant={
                          taskToAssign.difficultyLevel === "EASY"
                            ? "default"
                            : taskToAssign.difficultyLevel === "NORMAL"
                              ? "secondary"
                              : taskToAssign.difficultyLevel === "HARD"
                                ? "destructive"
                                : "outline"
                        }
                        className="mt-1"
                      >
                        {taskToAssign.difficultyLevel || "NORMAL"}
                      </Badge>
                    </div>
                  </div>
                )
              )}

              {/* Annotator Selection */}
              <div className="space-y-2">
                <Label>Select Annotator</Label>
                {!isBulkAssign &&
                  taskToAssign &&
                  (() => {
                    const currentAssignment = taskToAssign.assignments?.find(
                      (a: any) => a.annotatorId,
                    );
                    if (currentAssignment) {
                      const currentAnnotator = annotators.find(
                        (a: any) => a.userId === currentAssignment.annotatorId,
                      );
                      return (
                        <p className="text-xs text-muted-foreground mb-1">
                          Currently assigned to:{" "}
                          <span className="font-semibold">
                            {currentAnnotator?.user?.fullName ||
                              currentAnnotator?.user?.email}
                          </span>
                        </p>
                      );
                    }
                    return null;
                  })()}
                <Select
                  value={selectedAnnotatorId}
                  onValueChange={setSelectedAnnotatorId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an annotator..." />
                  </SelectTrigger>
                  <SelectContent>
                    {annotators
                      .filter((a: any) => a.projectRole === "ANNOTATOR")
                      .map((annotator: any) => {
                        const taskCount = workloadMap[annotator.userId] || 0;
                        // NEW: Disable logic for reassignment after max rejections reached
                        const currentAssignment =
                          taskToAssign?.assignments?.find(
                            (a: any) => a.annotatorId,
                          );
                        const isPreviousAnnotator =
                          currentAssignment &&
                          annotator.userId === currentAssignment.annotatorId;
                        const reachRejectionLimit =
                          currentAssignment &&
                          currentAssignment.rejectionCount >=
                            (project?.assignmentRule
                              ?.maxRejectionsBeforeReassign || 3);
                        const isDisabled =
                          isPreviousAnnotator && reachRejectionLimit;

                        return (
                          <SelectItem
                            key={annotator.userId}
                            value={annotator.userId}
                            disabled={isDisabled}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span
                                className={
                                  isDisabled
                                    ? "text-muted-foreground line-through"
                                    : ""
                                }
                              >
                                {annotator.user?.fullName ||
                                  annotator.user?.email}
                                {isDisabled && " (Max rejections reached)"}
                              </span>
                              <Badge
                                variant="secondary"
                                className="ml-2 text-xs"
                              >
                                {taskCount} tasks
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              {/* Deadline Selection */}
              <div className="space-y-2">
                <Label>Deadline (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDeadline ? (
                        format(selectedDeadline, "PPP")
                      ) : (
                        <span className="text-muted-foreground">
                          Select a deadline
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDeadline}
                      onSelect={setSelectedDeadline}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  If not set, deadline will be auto-calculated based on task
                  difficulty
                </p>
              </div>

              {/* Reassignment Reason - Only show for reassignments */}
              {!isBulkAssign &&
                taskToAssign &&
                (() => {
                  const currentAssignment =
                    getLatestAnnotatorAssignment(taskToAssign);
                  const isReassignment =
                    currentAssignment &&
                    selectedAnnotatorId &&
                    currentAssignment.annotatorId !== selectedAnnotatorId;

                  if (!isReassignment) return null;

                  const rejectionLimit =
                    project?.assignmentRule?.maxRejectionsBeforeReassign || 3;
                  const isLimitReached =
                    (currentAssignment?.rejectionCount || 0) >= rejectionLimit;
                  const currentAnnotator = annotators.find(
                    (a: any) => a.userId === currentAssignment.annotatorId,
                  );

                  return (
                    <div className="space-y-4">
                      {/* Warning if task already has reached rejections limit */}
                      {isLimitReached && (
                        <div className="space-y-2 p-4 bg-red-50 border border-red-200 rounded-lg animate-pulse">
                          <div className="flex items-center gap-2 text-red-900">
                            <AlertTriangle className="h-5 w-5" />
                            <Label className="text-sm font-bold uppercase">
                              Critical: Project Rules Notice
                            </Label>
                          </div>
                          <p className="text-xs text-red-700 leading-relaxed">
                            This task has already been rejected{" "}
                            {currentAssignment?.rejectionCount ||
                              rejectionLimit}{" "}
                            times. Team policy requires assigning this to a
                            different annotator to ensure quality standards. The
                            previous annotator is currently disabled in the
                            selection list.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 text-amber-900">
                          <AlertCircle className="h-4 w-4" />
                          <Label className="text-sm font-semibold">
                            Reassignment Reason (Required)
                          </Label>
                        </div>
                        <p className="text-xs text-amber-700">
                          Current assignee:{" "}
                          {currentAnnotator?.user?.fullName ||
                            currentAnnotator?.user?.email ||
                            "Unknown"}
                          . Please provide a reason for picking a new annotator.
                        </p>
                        <Textarea
                          placeholder="Why is a new annotator being assigned?"
                          value={reassignmentReason}
                          onChange={(e) =>
                            setReassignmentReason(e.target.value)
                          }
                          rows={3}
                          className="bg-white border-amber-200 focus-visible:ring-amber-500"
                        />
                      </div>
                    </div>
                  );
                })()}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAssignDialogOpen(false);
                  setIsBulkAssign(false);
                  setTaskToAssign(null);
                  setSelectedAnnotatorId("");
                  setSelectedDeadline(undefined);
                  setReassignmentReason("");
                }}
                disabled={isAssigning}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignTask}
                disabled={!selectedAnnotatorId || isAssigning}
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {(() => {
                      const hasCurrentAssignment =
                        taskToAssign?.assignments?.find(
                          (a: any) => a.annotatorId,
                        );
                      return hasCurrentAssignment
                        ? "Reassigning..."
                        : "Assigning...";
                    })()}
                  </>
                ) : isBulkAssign ? (
                  `Assign ${selectedTasks.length} Tasks`
                ) : (
                  (() => {
                    const hasCurrentAssignment =
                      taskToAssign?.assignments?.find(
                        (a: any) => a.annotatorId,
                      );
                    return hasCurrentAssignment
                      ? "Reassign Task"
                      : "Assign Task";
                  })()
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reviewer Assignment Dialog */}
        <Dialog
          open={isAssignReviewerDialogOpen}
          onOpenChange={(open) => {
            setIsAssignReviewerDialogOpen(open);
            if (!open) {
              setTaskToAssignReviewer(null);
              setSelectedReviewerId("");
              setSelectedReviewerDeadline(undefined);
              setReviewerReassignmentReason("");
              setIsBulkAssignReviewer(false);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isBulkAssignReviewer
                  ? "Assign Reviewer to Multiple Tasks"
                  : (() => {
                      const hasCurrentReviewer =
                        taskToAssignReviewer?.assignments?.find(
                          (a: any) => a.reviewerId,
                        );
                      return hasCurrentReviewer
                        ? "Reassign Reviewer"
                        : "Assign Reviewer";
                    })()}
              </DialogTitle>
              <DialogDescription>
                {isBulkAssignReviewer
                  ? `Assign a reviewer to ${selectedTasks.length} selected tasks.`
                  : (() => {
                      const hasCurrentReviewer =
                        taskToAssignReviewer?.assignments?.find(
                          (a: any) => a.reviewerId,
                        );
                      return hasCurrentReviewer
                        ? "Reassign this task to a different reviewer."
                        : "Assign this task to a reviewer in the project.";
                    })()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Task Preview */}
              {isBulkAssignReviewer ? (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {selectedTasks.length} tasks selected
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Assign a reviewer to all selected tasks at once
                    </div>
                  </div>
                </div>
              ) : (
                taskToAssignReviewer && (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 border">
                      <img
                        src={taskToAssignReviewer.image?.storageUrl}
                        alt={
                          taskToAssignReviewer.image?.originalFilename || "Task"
                        }
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {taskToAssignReviewer.image?.originalFilename ||
                          "Untitled"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: {taskToAssignReviewer.id.slice(0, 8)}...
                      </div>
                      <Badge variant="secondary" className="mt-1">
                        Submitted
                      </Badge>
                    </div>
                  </div>
                )
              )}

              {/* Reviewer Selection */}
              <div className="space-y-2">
                <Label>Select Reviewer</Label>
                {!isBulkAssignReviewer &&
                  taskToAssignReviewer &&
                  (() => {
                    const currentReviewerAssignment =
                      taskToAssignReviewer.assignments?.find(
                        (a: any) => a.reviewerId,
                      );
                    if (currentReviewerAssignment) {
                      const currentReviewer = annotators.find(
                        (a: any) =>
                          a.userId === currentReviewerAssignment.reviewerId,
                      );
                      return (
                        <p className="text-xs text-muted-foreground mb-1">
                          Currently assigned to:{" "}
                          <span className="font-semibold">
                            {currentReviewer?.user?.fullName ||
                              currentReviewer?.user?.email}
                          </span>
                        </p>
                      );
                    }
                    return null;
                  })()}
                <Select
                  value={selectedReviewerId}
                  onValueChange={setSelectedReviewerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a reviewer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {annotators
                      .filter((a: any) => a.projectRole === "REVIEWER")
                      .map((reviewer: any) => {
                        const taskCount = workloadMap[reviewer.userId] || 0;
                        return (
                          <SelectItem
                            key={reviewer.userId}
                            value={reviewer.userId}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>
                                {reviewer.user?.fullName ||
                                  reviewer.user?.email}
                              </span>
                              <Badge
                                variant="secondary"
                                className="ml-2 text-xs"
                              >
                                {taskCount} tasks
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              {/* Deadline Selection */}
              <div className="space-y-2">
                <Label>
                  Deadline <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedReviewerDeadline && "border-red-300 focus:border-red-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedReviewerDeadline ? (
                        format(selectedReviewerDeadline, "PPP")
                      ) : (
                        <span className="text-muted-foreground">
                          Select a deadline
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedReviewerDeadline}
                      onSelect={setSelectedReviewerDeadline}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
                {!selectedReviewerDeadline && (
                  <p className="text-xs text-red-500">
                    Deadline is required to assign a reviewer.
                  </p>
                )}
              </div>

              {/* Reassignment Reason - Only show for single task reassignments */}
              {!isBulkAssignReviewer &&
                taskToAssignReviewer &&
                (() => {
                  const currentReviewerAssignment =
                    taskToAssignReviewer.assignments?.find(
                      (a: any) => a.reviewerId,
                    );
                  const isReassignment =
                    currentReviewerAssignment &&
                    selectedReviewerId &&
                    currentReviewerAssignment.reviewerId !== selectedReviewerId;

                  if (!isReassignment) return null;

                  const currentReviewer = annotators.find(
                    (a: any) =>
                      a.userId === currentReviewerAssignment.reviewerId,
                  );

                  return (
                    <div className="space-y-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-900">
                        <AlertCircle className="h-4 w-4" />
                        <Label className="text-sm font-semibold">
                          Reassignment Reason (Required)
                        </Label>
                      </div>
                      <p className="text-xs text-amber-700">
                        This task is currently assigned to reviewer{" "}
                        {currentReviewer?.user?.fullName ||
                          currentReviewer?.user?.email}
                        . Please provide a reason for reassigning.
                      </p>
                      <Textarea
                        placeholder="Explain why this task needs to be reassigned..."
                        value={reviewerReassignmentReason}
                        onChange={(e) =>
                          setReviewerReassignmentReason(e.target.value)
                        }
                        rows={3}
                        className="bg-white"
                      />
                    </div>
                  );
                })()}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAssignReviewerDialogOpen(false);
                  setTaskToAssignReviewer(null);
                  setSelectedReviewerId("");
                  setSelectedReviewerDeadline(undefined);
                  setReviewerReassignmentReason("");
                  setIsBulkAssignReviewer(false);
                }}
                disabled={isAssigningReviewer}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignReviewer}
                disabled={!selectedReviewerId || !selectedReviewerDeadline || isAssigningReviewer}
              >
                {isAssigningReviewer ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isBulkAssignReviewer
                      ? "Assigning..."
                      : (() => {
                          const hasCurrentReviewer =
                            taskToAssignReviewer?.assignments?.find(
                              (a: any) => a.reviewerId,
                            );
                          return hasCurrentReviewer
                            ? "Reassigning..."
                            : "Assigning...";
                        })()}
                  </>
                ) : isBulkAssignReviewer ? (
                  `Assign ${selectedTasks.length} Tasks`
                ) : (
                  (() => {
                    const hasCurrentReviewer =
                      taskToAssignReviewer?.assignments?.find(
                        (a: any) => a.reviewerId,
                      );
                    return hasCurrentReviewer
                      ? "Reassign Reviewer"
                      : "Assign Reviewer";
                  })()
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Task Unassign Confirmation Dialog */}
        <AlertDialog
          open={isUnassignDialogOpen}
          onOpenChange={setIsUnassignDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unassign Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to unassign this task? The annotator will
                lose access to this task.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {taskToUnassign && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 border">
                  <img
                    src={taskToUnassign.image?.storageUrl}
                    alt={taskToUnassign.image?.originalFilename || "Task"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {taskToUnassign.image?.originalFilename || "Untitled"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {taskToUnassign.id.slice(0, 8)}...
                  </div>
                </div>
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setIsUnassignDialogOpen(false);
                  setTaskToUnassign(null);
                }}
                disabled={isUnassigning}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUnassignTask}
                disabled={isUnassigning}
                className="bg-red-600 hover:bg-red-700"
              >
                {isUnassigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Unassigning...
                  </>
                ) : (
                  "Unassign Task"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Tasks Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Tasks</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedTasks.length} task
                {selectedTasks.length > 1 ? "s" : ""}? This will remove the
                image{selectedTasks.length > 1 ? "s" : ""} from the project and
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex items-center gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-center w-16 h-16 rounded bg-red-100 text-red-700">
                <Trash2 className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-red-900">
                  {selectedTasks.length} Task
                  {selectedTasks.length > 1 ? "s" : ""} will be deleted
                </div>
                <div className="text-xs text-red-700">
                  Images will be permanently removed from the project
                </div>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                }}
                disabled={isDeleting}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTasks}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete {selectedTasks.length} Task
                    {selectedTasks.length > 1 ? "s" : ""}
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Unassign Tasks Confirmation Dialog */}
        <AlertDialog
          open={isBulkUnassignDialogOpen}
          onOpenChange={setIsBulkUnassignDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unassign Tasks</AlertDialogTitle>
              <AlertDialogDescription>
                {bulkUnassignUserId &&
                  groupedTasks[bulkUnassignUserId] &&
                  (() => {
                    const userTasks = groupedTasks[bulkUnassignUserId];
                    const userTaskIds = userTasks.map((t: any) => t.id);
                    const tasksToUnassign = selectedTasks.filter((id) =>
                      userTaskIds.includes(id),
                    );
                    return `Are you sure you want to unassign ${tasksToUnassign.length} task${tasksToUnassign.length > 1 ? "s" : ""} from this user?`;
                  })()}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {bulkUnassignUserId &&
              groupedTasks[bulkUnassignUserId] &&
              (() => {
                const userTasks = groupedTasks[bulkUnassignUserId];
                const userTaskIds = userTasks.map((t: any) => t.id);
                const tasksToUnassign = selectedTasks.filter((id) =>
                  userTaskIds.includes(id),
                );
                const firstTask = groupedTasks[bulkUnassignUserId][0];
                const annotatorAssignment =
                  getLatestAnnotatorAssignment(firstTask);
                const assignee = annotatorAssignment?.annotator;

                return (
                  <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-center w-16 h-16 rounded bg-orange-100 text-orange-700">
                      <UserMinus className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-orange-900 flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={assignee?.avatarUrl}
                            alt={assignee?.fullName}
                          />
                          <AvatarFallback className="text-xs bg-orange-200">
                            {assignee?.fullName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {assignee?.fullName || assignee?.email}
                      </div>
                      <div className="text-xs text-orange-700 mt-1">
                        {tasksToUnassign.length} Task
                        {tasksToUnassign.length > 1 ? "s" : ""} will be
                        unassigned
                      </div>
                    </div>
                  </div>
                );
              })()}

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setIsBulkUnassignDialogOpen(false);
                  setBulkUnassignUserId(null);
                }}
                disabled={isBulkUnassigning}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkUnassignTasks}
                disabled={isBulkUnassigning}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isBulkUnassigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Unassigning...
                  </>
                ) : (
                  <>
                    <UserMinus className="mr-2 h-4 w-4" />
                    {bulkUnassignUserId &&
                      groupedTasks[bulkUnassignUserId] &&
                      (() => {
                        const userTasks = groupedTasks[bulkUnassignUserId];
                        const userTaskIds = userTasks.map((t: any) => t.id);
                        const tasksToUnassign = selectedTasks.filter((id) =>
                          userTaskIds.includes(id),
                        );
                        return `Unassign ${tasksToUnassign.length} Task${tasksToUnassign.length > 1 ? "s" : ""}`;
                      })()}
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Deadline Dialog */}
        <Dialog
          open={isBulkDeadlineDialogOpen}
          onOpenChange={setIsBulkDeadlineDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Deadline for All Tasks</DialogTitle>
              <DialogDescription>
                Set a deadline for all tasks assigned to this user.
              </DialogDescription>
            </DialogHeader>

            {bulkDeadlineUserId && groupedTasks[bulkDeadlineUserId] && (
              <div className="space-y-4">
                {/* User Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  {(() => {
                    const firstTask = groupedTasks[bulkDeadlineUserId][0];
                    const annotatorAssignment =
                      getLatestAnnotatorAssignment(firstTask);
                    const assignee = annotatorAssignment?.annotator;
                    const taskCount = groupedTasks[bulkDeadlineUserId].length;

                    return (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={assignee?.avatarUrl}
                            alt={assignee?.fullName}
                          />
                          <AvatarFallback className="text-sm">
                            {assignee?.fullName?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">
                            {assignee?.fullName || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {assignee?.email || ""}
                          </div>
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {taskCount} {taskCount === 1 ? "task" : "tasks"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Deadline Picker */}
                <div className="space-y-2">
                  <Label>Select Deadline</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bulkDeadline ? (
                          format(bulkDeadline, "PPP")
                        ) : (
                          <span className="text-muted-foreground">
                            Pick a deadline
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={bulkDeadline}
                        onSelect={setBulkDeadline}
                        initialFocus
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsBulkDeadlineDialogOpen(false);
                  setBulkDeadlineUserId(null);
                  setBulkDeadline(undefined);
                }}
                disabled={isBulkUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkDeadlineUpdate}
                disabled={!bulkDeadline || isBulkUpdating}
              >
                {isBulkUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Set Deadline"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Force Assign Dialog */}
      <Dialog
        open={isForceAssignDialogOpen}
        onOpenChange={(open) => {
          setIsForceAssignDialogOpen(open);
          if (!open) {
            setForceAssignData(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Workload Limit Exceeded
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 pt-4">
                {forceAssignData?.mode === "bulk" ? (
                  <p>
                    This annotator currently has{" "}
                    <span className="font-bold">
                      {forceAssignData.currentTasks}
                    </span>{" "}
                    active tasks (Limit: {forceAssignData.maxTasks}). You are
                    trying to assign{" "}
                    <span className="font-bold">
                      {forceAssignData.requestedTasks}
                    </span>{" "}
                    more tasks, but they only have space for{" "}
                    <span className="font-bold">
                      {forceAssignData.remainingSlots}
                    </span>
                    .
                  </p>
                ) : (
                  <p>
                    This annotator has reached their maximum active task limit (
                    <span className="font-bold">
                      {forceAssignData?.currentTasks}/
                      {forceAssignData?.maxTasks}
                    </span>
                    ).
                  </p>
                )}
                <p>
                  Do you still want to force assign{" "}
                  {forceAssignData?.mode === "bulk"
                    ? "these tasks"
                    : "this task"}{" "}
                  to them?
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsForceAssignDialogOpen(false)}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceAssign}
              disabled={isAssigning}
            >
              {isAssigning ? "Assigning..." : "Force Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <History className="h-5 w-5 text-purple-600" />
              Task History
            </DialogTitle>
            <DialogDescription>
              View past assignments and rejections for this task.
            </DialogDescription>
          </DialogHeader>

          {selectedTaskForHistory && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border">
                <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 border flex-shrink-0">
                  {selectedTaskForHistory.image?.storageUrl ? (
                    <img
                      src={selectedTaskForHistory.image.storageUrl}
                      alt="Task"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <Eye className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-sm">
                    {selectedTaskForHistory.image?.originalFilename ||
                      "Untitled Task"}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    ID: {selectedTaskForHistory.id}
                  </div>
                </div>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4 py-2">
                  {(() => {
                    let rawHistory: any[] = [];
                    if (
                      selectedTaskForHistory.assignments &&
                      Array.isArray(selectedTaskForHistory.assignments)
                    ) {
                      selectedTaskForHistory.assignments.forEach(
                        (assignment: any) => {
                          if (
                            assignment.submissionHistory &&
                            Array.isArray(assignment.submissionHistory)
                          ) {
                            assignment.submissionHistory.forEach((sh: any) => {
                              rawHistory.push({
                                id: sh.id,
                                status: sh.status,
                                createdAt: sh.reviewedAt || sh.createdAt,
                                reviewComment: sh.reviewComment,
                                annotator: assignment.annotator,
                                reviewer: assignment.reviewer,
                              });
                            });
                          }

                          // avoid duplicating the final state if it's already in submissionHistory
                          if (
                            !assignment.submissionHistory ||
                            assignment.submissionHistory.length === 0 ||
                            ["ASSIGNED", "IN_PROGRESS"].includes(
                              assignment.status,
                            )
                          ) {
                            rawHistory.push({
                              id: assignment.id,
                              status: assignment.status,
                              createdAt:
                                assignment.updatedAt || assignment.createdAt,
                              reviewComment: assignment.reviewComment,
                              annotator: assignment.annotator,
                              reviewer: assignment.reviewer,
                            });
                          }
                        },
                      );
                    } else if (selectedTaskForHistory.history) {
                      rawHistory = selectedTaskForHistory.history;
                    }

                    const displayHistory = [...rawHistory].sort(
                      (a: any, b: any) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime(),
                    );

                    if (displayHistory.length === 0) {
                      return (
                        <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                            <History className="w-8 h-8 opacity-20" />
                          </div>
                          <div>
                            <p className="font-medium">No historical records</p>
                            <p className="text-xs">
                              No previous assignments found for this task.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return displayHistory.map((item: any, index: number) => (
                      <div
                        key={item.id || index}
                        className="relative pl-8 pb-6 last:pb-0"
                      >
                        {/* Timeline line */}
                        {index < displayHistory.length - 1 && (
                          <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-100" />
                        )}
                        {/* Dot */}
                        <div className="absolute left-0 top-1.5 w-[30px] h-[30px] rounded-full bg-white border-2 border-purple-100 flex items-center justify-center shadow-sm z-10">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${item.status === "REJECTED" ? "bg-red-500" : "bg-green-500"}`}
                          />
                        </div>

                        <div className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-[10px] bg-purple-50 text-purple-600">
                                  {item.annotator?.fullName
                                    ?.charAt(0)
                                    .toUpperCase() || "A"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm text-gray-900">
                                  {item.annotator?.fullName || "Annotator"}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {item.annotator?.email}
                                </div>
                              </div>
                            </div>
                            <Badge
                              className={`${
                                item.status === "REJECTED"
                                  ? "bg-red-50 text-red-600 border-red-100"
                                  : item.status === "SKIPPED"
                                    ? "bg-amber-50 text-amber-600 border-amber-100"
                                    : "bg-purple-50 text-purple-600 border-purple-100"
                              } text-[10px] px-2 py-0.5 border`}
                            >
                              {item.status}
                            </Badge>
                          </div>

                          {item.reviewComment && (
                            <div className="mt-2 p-3 bg-red-50/50 border border-red-100 rounded-lg text-xs text-red-700 relative italic">
                              <span className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-medium text-red-400 non-italic">
                                Reviewer Comment
                              </span>
                              "{item.reviewComment}"
                            </div>
                          )}

                          <div className="mt-3 text-[10px] text-muted-foreground flex items-center gap-1.5 pt-2 border-t border-gray-50">
                            <Clock className="w-3.5 h-3.5" />
                            {format(new Date(item.createdAt), "PPP p")}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter className="bg-gray-50 -mx-6 -mb-6 p-4 rounded-b-lg">
            <Button
              variant="secondary"
              onClick={() => setIsHistoryDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Close History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExportDialog
        open={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={exportProjectCOCO}
        isExporting={isExporting}
      />
    </div>
  );
}
