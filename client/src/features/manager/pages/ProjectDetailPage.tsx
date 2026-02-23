import { useState, useEffect } from "react";
import { DatasetList } from "../components/DatasetList";
import { UploadImageDialog } from "../components/UploadImageDialog";
import { DatasetCreateDialog } from "../components/DatasetCreateDialog";
import { LabelRequestManager } from "../components/LabelRequestManager";
import { useParams, useNavigate } from "react-router-dom";
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
  FileText,
  FileUp,
  Search,
  Loader2,
  Pen,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { useAuth } from "../../../context/AuthContext";
import { ChatPanel } from "../../../components/chat/ChatPanel";
import { projectApi } from "../../../services/project.api";
import { ProjectHealthDashboard } from "../components/ProjectHealthDashboard";
import {
  projectLabelApi,
  labelApi,
  labelRequestApi,
  type Label as ApiLabel,
} from "../../../services/label.api";
import {
  projectCategoryApi,
  type ProjectCategory,
} from "../../../services/project-category.api";
import { LabelSelector } from "../../../components/LabelSelector";
import type { Project, AssignmentRule } from "../../../types/project.types";
import { ProjectStatus } from "../../../types/project.types";
import { Switch } from "../../../components/ui/switch";
import { Checkbox } from "../../../components/ui/checkbox";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
} from "lucide-react";
import { useDebounce } from "../../../hooks/useDebounce";

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
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

  // Assignment Rule State
  const [editAssignmentRule, setEditAssignmentRule] = useState<
    Partial<AssignmentRule>
  >({
    isAutoAssignEnabled: false,
    assignmentStrategy: "ROUND_ROBIN",
    autoAssignReviewer: true,
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
  const [selectedRole, setSelectedRole] = useState("ANNOTATOR");
  const [isRoleOverride, setIsRoleOverride] = useState(false);
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
        // If override is checked, use the selected dropdown role
        // If not, use the user's system role (or fallback to selectedRole if missing)
        const roleToAdd = isRoleOverride
          ? selectedRole
          : user.role || selectedRole;

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

  // Edit Role State
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<any>(null);
  const [roleToUpdate, setRoleToUpdate] = useState("");

  // Remove Member State
  const [isRemoveMemberOpen, setIsRemoveMemberOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<any>(null);

  // Task Assignment State
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [taskToAssign, setTaskToAssign] = useState<any>(null);
  const [selectedAnnotatorId, setSelectedAnnotatorId] = useState<string>("");
  const [selectedDeadline, setSelectedDeadline] = useState<Date | undefined>();
  const [isAssigning, setIsAssigning] = useState(false);

  // Task Unassign State
  const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false);
  const [taskToUnassign, setTaskToUnassign] = useState<any>(null);
  const [isUnassigning, setIsUnassigning] = useState(false);

  // Bulk Deadline State
  const [isBulkDeadlineDialogOpen, setIsBulkDeadlineDialogOpen] = useState(false);
  const [bulkDeadlineUserId, setBulkDeadlineUserId] = useState<string | null>(null);
  const [bulkDeadline, setBulkDeadline] = useState<Date | undefined>();
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Fetch tasks function
  const fetchTasks = async () => {
    if (!projectId) return;

    setIsTasksLoading(true);
    try {
      const params: any = {
        page: 1,
        limit: 1000 // Fetch all tasks
      };

      if (taskFilterStatus && taskFilterStatus !== 'all') {
        params.status = taskFilterStatus.toUpperCase();
      }

      if (taskFilterAssignee && taskFilterAssignee !== 'all') {
        params.assigneeId = taskFilterAssignee;
      }

      const response = await projectApi.getTasks(projectId, params);
      setTasks(response.data || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setIsTasksLoading(false);
    }
  };

  // Fetch workloads function
  const fetchWorkloads = async () => {
    if (!projectId) return;

    try {
      const workloadsList = await projectApi.getWorkloads(projectId);
      const workloadsMap = workloadsList.reduce((acc: Record<string, any>, workload: any) => {
        acc[workload.userId] = workload;
        return acc;
      }, {});
      setWorkloads(workloadsMap);
    } catch (error) {
      console.error('Failed to fetch workloads:', error);
    }
  };

  // Handle task assignment
  const handleAssignTask = async () => {
    if (!projectId || !taskToAssign || !selectedAnnotatorId) return;

    setIsAssigning(true);
    try {
      await projectApi.assignTask(projectId, taskToAssign.id, selectedAnnotatorId, selectedDeadline);
      toast.success('Task assigned successfully');
      setIsAssignDialogOpen(false);
      setTaskToAssign(null);
      setSelectedAnnotatorId("");
      setSelectedDeadline(undefined);
      fetchTasks(); // Refresh tasks
      fetchWorkloads(); // Refresh workloads
    } catch (error: any) {
      console.error('Failed to assign task:', error);
      toast.error(error.response?.data?.error || 'Failed to assign task');
    } finally {
      setIsAssigning(false);
    }
  };

  // Handle task unassignment
  const handleUnassignTask = async () => {
    if (!projectId || !taskToUnassign) return;

    setIsUnassigning(true);
    try {
      await projectApi.unassignTask(projectId, taskToUnassign.id);
      toast.success('Task unassigned successfully');
      setIsUnassignDialogOpen(false);
      setTaskToUnassign(null);
      fetchTasks(); // Refresh tasks
      fetchWorkloads(); // Refresh workloads
    } catch (error: any) {
      console.error('Failed to unassign task:', error);
      toast.error(error.response?.data?.error || 'Failed to unassign task');
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
            bulkDeadline
          );
        })
      );

      toast.success(`Deadline updated for ${userTasks.length} task${userTasks.length > 1 ? 's' : ''}`);
      setIsBulkDeadlineDialogOpen(false);
      setBulkDeadlineUserId(null);
      setBulkDeadline(undefined);
      fetchTasks(); // Refresh tasks
      fetchWorkloads(); // Refresh workloads
    } catch (error: any) {
      console.error('Failed to update deadlines:', error);
      toast.error(error.response?.data?.error || 'Failed to update deadlines');
    } finally {
      setIsBulkUpdating(false);
    }
  };

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
      labelRequestApi.getPendingCount(projectId)
        .then(count => setPendingLabelRequests(count))
        .catch(err => console.error("Failed to load pending requests count", err));
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
  }, [project, activeTab]);

  // Fetch tasks when filters change
  useEffect(() => {
    if (projectId && activeTab === 'tasks') {
      fetchTasks();
      fetchWorkloads();
    }
  }, [taskFilterStatus, taskFilterAssignee, debouncedSearchQuery]);


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
  }, [isAddMemberOpen]);

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
    (m: any) => m.projectRole === "ANNOTATOR" || m.projectRole === "REVIEWER"
  );

  // Client-side filtering is removed/minimized as we use server-side search
  // We strictly show what the API returns.
  // Status/Assignee filters are currently visual-only or disabled effectively until backend supports them.
  const filteredTasks = tasks;

  // Group tasks by assignee
  const groupedTasks = tasks.reduce((acc: Record<string, any[]>, task: any) => {
    const annotatorAssignment = task.assignments?.find((a: any) => a.annotatorId);
    const assigneeId = annotatorAssignment?.annotatorId || 'unassigned';
    if (!acc[assigneeId]) {
      acc[assigneeId] = [];
    }
    acc[assigneeId].push(task);
    return acc;
  }, {});

  // Get workload from cached workloads (total active tasks)
  const workloadMap: Record<string, number> = Object.keys(workloads).reduce((acc: Record<string, number>, userId: string) => {
    const workload = workloads[userId];
    acc[userId] = (workload.assignedTasks || 0) + (workload.inProgressTasks || 0);
    return acc;
  }, {});

  // Toggle user expansion
  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
      // Initialize page 1 for this user if not set
      if (!userPages[userId]) {
        setUserPages(prev => ({ ...prev, [userId]: 1 }));
      }
    }
    setExpandedUsers(newExpanded);
  };

  // Per-user pagination helpers
  const getUserPage = (userId: string) => userPages[userId] || 1;

  const setUserPage = (userId: string, page: number) => {
    setUserPages(prev => ({ ...prev, [userId]: page }));
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
    const assignment = t.assignments?.find((a: any) => a.annotatorId);
    return assignment?.status === 'APPROVED';
  }).length;
  const totalTasksCount = project._count?.tasks || 0;
  const projectProgress = totalTasksCount > 0
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

  const handleEditProject = async () => {
    if (!project || !editName || !editDeadline) return;

    try {
      await projectApi.update(project.id, {
        name: editName,
        description: editDescription,
        deadline: editDeadline.toISOString(),
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

  const getDaysRemaining = (deadline?: string) => {
    if (!deadline) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDeadlineColor = (daysRemaining: number | null) => {
    if (daysRemaining === null)
      return "border-blue-200 bg-blue-50 text-blue-700";
    if (daysRemaining < 0) return "border-red-200 bg-red-50 text-red-700";
    if (daysRemaining <= 2) return "border-red-200 bg-red-50 text-red-700";
    if (daysRemaining <= 6)
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    return "border-green-200 bg-green-50 text-green-700";
  };

  const getDeadlineText = (deadline?: string) => {
    if (!deadline) return "No Deadline";
    const daysRemaining = getDaysRemaining(deadline);
    if (daysRemaining === null) return "No Deadline";
    if (daysRemaining < 0) {
      const overdueDays = Math.abs(daysRemaining);
      return overdueDays === 1
        ? "Overdue 1 day"
        : `Overdue ${overdueDays} days`;
    } else if (daysRemaining === 0) {
      return "Due Today";
    } else if (daysRemaining === 1) {
      return "1 day left";
    } else {
      return `${daysRemaining} days left`;
    }
  };

  const getAnnotationTypeLabel = (project: Project) => {
    const meta = project.labelConfig?.find((l: any) => l.type === "meta");
    const type = meta?.annotationType || "bounding-box";
    const labels = {
      "bounding-box": "Bounding Box",
      polygon: "Polygon",
      segmentation: "Segmentation",
    };
    return labels[type as keyof typeof labels] || type;
  };

  // Analytics Mock Data (Until we have real stats)
  // const statusData = [ ... ]; // removed unused
  // const annotatorData: any[] = [];
  // const progressData: any[] = [];

  const exportProjectCSV = () => {
    toast.success("CSV export coming soon");
  };

  const exportProjectJSON = () => {
    toast.success("JSON export coming soon");
  };

  // Member Management Handlers

  const handleUpdateRole = async () => {
    if (!memberToEdit || !project) return;

    try {
      await projectApi.updateMemberRole(
        project.id,
        memberToEdit.userId,
        roleToUpdate,
      );
      toast.success("Member role updated successfully");

      // Update local state
      setProject((prev) => {
        if (!prev) return null;
        const updatedMembers = (prev.members || []).map((m: any) =>
          m.userId === memberToEdit.userId
            ? { ...m, projectRole: roleToUpdate }
            : m,
        );
        return { ...prev, members: updatedMembers };
      });

      setIsEditRoleOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update member role");
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
      const errorMessage = error?.response?.data?.error || "Failed to remove member";
      toast.error(errorMessage);
    }
  };

  const openEditRoleDialog = (member: any) => {
    setMemberToEdit(member);
    setRoleToUpdate(member.projectRole || "ANNOTATOR");
    setIsEditRoleOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(filteredTasks.map((t) => t.id));
    } else {
      setSelectedTasks([]);
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (checked) {
      setSelectedTasks((prev) => [...prev, taskId]);
    } else {
      setSelectedTasks((prev) => prev.filter((id) => id !== taskId));
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="max-w-7xl mx-auto px-8 py-8">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={project.status !== ProjectStatus.COMPLETED}
                  title={
                    project.status !== ProjectStatus.COMPLETED
                      ? "Project must be COMPLETED to export"
                      : "Export Project Data"
                  }
                >
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
        <Card className="p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <FolderOpen className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-semibold">{project.name}</h2>
                <Badge variant="outline">
                  {getAnnotationTypeLabel(project)}
                </Badge>
                <Badge
                  className={
                    project.status === ProjectStatus.ACTIVE
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100"
                  }
                >
                  {project.status}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-4">
                {project.description}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Overall Progress
                  </span>
                  <span className="font-semibold">
                    {Math.round(projectProgress)}%
                  </span>
                </div>
                <Progress value={projectProgress} className="h-2" />
              </div>
            </div>

            <div className="flex items-center gap-2 ml-6">
              <Badge
                variant="outline"
                className="border-blue-200 bg-blue-50 text-blue-700"
              >
                <CalendarIcon className="w-3 h-3 mr-1" />
                Deadline:{" "}
                {project.deadline
                  ? format(new Date(project.deadline), "MMM dd, yyyy")
                  : "No Deadline"}
              </Badge>
              {project.deadline && (
                <Badge
                  variant="outline"
                  className={getDeadlineColor(
                    getDaysRemaining(project.deadline),
                  )}
                >
                  {getDeadlineText(project.deadline)}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total images</p>
                <p className="text-xl font-semibold">
                  {project._count?.images || 0}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Members</p>
                <p className="text-xl font-semibold">
                  {project._count?.members || 0}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <div className="w-10 h-10 bg-yellow-200 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tasks</p>
                <p className="text-xl font-semibold">
                  {project._count?.tasks || 0}
                </p>
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

            {pendingLabelRequests > 0 && (
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors" onClick={() => setActiveTab("requests")}>
                <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
                  <Pen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Label Requests</p>
                  <p className="text-xl font-semibold text-purple-700">
                    {pendingLabelRequests} Pending
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Tabs: Tasks & Analytics */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList>
            <TabsTrigger value="health" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
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
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="health">
            <ProjectHealthDashboard projectId={project.id} />
          </TabsContent>

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
                    <SelectItem value="submitted">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        Submitted
                      </div>
                    </SelectItem>
                    <SelectItem value="approved">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Approved
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
                      .filter((a: any) => a.projectRole === 'ANNOTATOR')
                      .map((a: any) => (
                        <SelectItem key={a.userId} value={a.userId}>
                          {a.user?.fullName || a.user?.email || 'Unknown'}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>

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
                          <TableHead className="w-[50px]">
                            <Checkbox
                              checked={
                                filteredTasks.length > 0 &&
                                selectedTasks.length === filteredTasks.length
                              }
                              onCheckedChange={(checked) =>
                                handleSelectAll(!!checked)
                              }
                            />
                          </TableHead>
                          <TableHead>User / Task</TableHead>
                          <TableHead className="w-[100px] text-right">Actions</TableHead>
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
                        ) : filteredTasks.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="text-center py-8 text-muted-foreground"
                            >
                              No tasks found
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {Object.entries(groupedTasks).map(([assigneeId, userTasks]) => {
                              const firstTask = userTasks[0];
                              const annotatorAssignment = firstTask.assignments?.find((a: any) => a.annotatorId);
                              const assignee = annotatorAssignment?.annotator;
                              const isExpanded = expandedUsers.has(assigneeId);
                              const taskCount = userTasks.length;

                              return (
                                <>
                                  {/* User Group Row */}
                                  <TableRow
                                    key={`user-${assigneeId}`}
                                    className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 cursor-pointer border-b-2 border-gray-300"
                                    onClick={() => toggleUserExpansion(assigneeId)}
                                  >
                                    <TableCell className="py-4">
                                      <Checkbox
                                        checked={userTasks.every((t: any) => selectedTasks.includes(t.id))}
                                        onCheckedChange={(checked) => {
                                          userTasks.forEach((t: any) => handleSelectTask(t.id, !!checked));
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
                                                <AvatarImage src={assignee.avatarUrl} alt={assignee.fullName} />
                                                <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                                                  {assignee.fullName?.charAt(0).toUpperCase() || 'U'}
                                                </AvatarFallback>
                                              </Avatar>
                                              <div>
                                                <div className="text-base font-semibold text-gray-900">{assignee.fullName}</div>
                                                <div className="text-xs text-gray-600">{assignee.email}</div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-3">
                                              <div className="h-10 w-10 rounded-full bg-gray-400 flex items-center justify-center ring-2 ring-white shadow-sm">
                                                <Users className="h-5 w-5 text-white" />
                                              </div>
                                              <span className="text-base font-semibold text-gray-800">Unassigned Tasks</span>
                                            </div>
                                          )}
                                          <Badge variant="secondary" className="ml-2 text-sm font-semibold px-3 py-1">
                                            {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                                          </Badge>
                                        </div>
                                        <div onClick={(e) => e.stopPropagation()}>
                                          {assignee && (
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                  <MoreVertical className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                  onClick={() => {
                                                    setBulkDeadlineUserId(assigneeId);
                                                    setIsBulkDeadlineDialogOpen(true);
                                                  }}
                                                >
                                                  <Clock className="mr-2 h-4 w-4" />
                                                  Set Deadline for All Tasks
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          )}
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>

                                  {/* Expanded Task Rows */}
                                  {isExpanded && getPaginatedUserTasks(userTasks, assigneeId).map((task: any, i: number) => {
                                    const taskAssignment = task.assignments?.find((a: any) => a.annotatorId);
                                    const status = taskAssignment?.status || 'UNASSIGNED';

                                    return (
                                      <TableRow key={task.id || i} className="bg-white hover:bg-gray-50 border-b border-gray-100">
                                        <TableCell className="py-3">
                                          <Checkbox
                                            checked={selectedTasks.includes(task.id)}
                                            onCheckedChange={(checked) =>
                                              handleSelectTask(task.id, !!checked)
                                            }
                                          />
                                        </TableCell>
                                        <TableCell className="py-3">
                                          <div className="flex items-center gap-3 pl-8">
                                            <div className="w-14 h-14 rounded overflow-hidden bg-gray-100 border flex-shrink-0">
                                              <img
                                                src={task.image?.storageUrl}
                                                alt={task.image?.originalFilename || 'Task image'}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                              />
                                            </div>
                                            <div className="min-w-0 flex-1 space-y-1.5">
                                              <div className="font-medium text-sm truncate">
                                                {task.image?.originalFilename || 'Untitled'}
                                              </div>
                                              <div className="text-xs text-muted-foreground font-mono">
                                                ID: {task.id.slice(0, 8)}...
                                              </div>
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <Badge
                                                  variant={
                                                    status === 'REJECTED' ? 'destructive' : 'outline'
                                                  }
                                                  className={`font-normal capitalize text-xs ${
                                                    status === 'APPROVED' ? 'bg-green-100 text-green-800 border-green-300' :
                                                    status === 'SUBMITTED' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                                                    status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                                    status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                                    status === 'UNASSIGNED' ? 'bg-gray-100 text-gray-600 border-gray-300' :
                                                    ''
                                                  }`}
                                                >
                                                  {status.toLowerCase().replace('_', ' ')}
                                                </Badge>
                                                {taskAssignment?.deadline && (
                                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    <span>
                                                      {new Date(taskAssignment.deadline).toLocaleDateString()} {new Date(taskAssignment.deadline).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                      })}
                                                    </span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell className="py-3 text-right">
                                          {assignee ? (
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                  <MoreVertical className="h-4 w-4" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                  onClick={() => {
                                                    setTaskToAssign(task);
                                                    setSelectedAnnotatorId(taskAssignment?.annotatorId || "");
                                                    setIsAssignDialogOpen(true);
                                                  }}
                                                >
                                                  <Edit className="mr-2 h-4 w-4" />
                                                  Reassign
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                  onClick={() => {
                                                    setTaskToUnassign(task);
                                                    setIsUnassignDialogOpen(true);
                                                  }}
                                                  className="text-red-600"
                                                >
                                                  <Trash2 className="mr-2 h-4 w-4" />
                                                  Unassign
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
                                  {isExpanded && getUserTotalPages(userTasks) > 1 && (
                                    <TableRow className="bg-gray-50">
                                      <TableCell colSpan={3} className="py-3">
                                        <div className="flex items-center justify-between px-8">
                                          <div className="text-sm text-muted-foreground">
                                            Page {getUserPage(assigneeId)} of {getUserTotalPages(userTasks)}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setUserPage(assigneeId, 1);
                                              }}
                                              disabled={getUserPage(assigneeId) === 1}
                                            >
                                              <ChevronsLeft className="w-4 h-4" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setUserPage(assigneeId, Math.max(1, getUserPage(assigneeId) - 1));
                                              }}
                                              disabled={getUserPage(assigneeId) === 1}
                                            >
                                              <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setUserPage(assigneeId, Math.min(getUserTotalPages(userTasks), getUserPage(assigneeId) + 1));
                                              }}
                                              disabled={getUserPage(assigneeId) === getUserTotalPages(userTasks)}
                                            >
                                              <ChevronRight className="w-4 h-4" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setUserPage(assigneeId, getUserTotalPages(userTasks));
                                              }}
                                              disabled={getUserPage(assigneeId) === getUserTotalPages(userTasks)}
                                            >
                                              <ChevronsRight className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </>
                              );
                            })}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
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
                <DatasetList projectId={project.id} />
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
                    allowCreateLabel={true}
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
                            <Badge variant="secondary" className="ml-2 font-normal">
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
                              <TableHead className="text-right">Actions</TableHead>
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
                              const isDisabled = isCompleted && projectProgress < 100;

                              return (
                                <SelectItem
                                  key={s}
                                  value={s}
                                  disabled={isDisabled}
                                  title={isDisabled ? "Project progress must be 100% to complete" : undefined}
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
                      <Label>Description</Label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
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
                    {/* 1. Auto-Assignment Settings */}
                    <div>
                      <h4 className="font-medium text-sm text-gray-900 border-b pb-2 mb-4">
                        Auto-Assignment Settings
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label>Auto-Assign Tasks</Label>
                              <Popover>
                                <PopoverTrigger>
                                  <AlertCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <p className="text-sm">
                                    Automatically distribute new image uploads to available annotators based on the selected strategy.
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
                            <Label>Assignment Strategy</Label>
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
                                <SelectItem value="ROUND_ROBIN">
                                  Round Robin
                                </SelectItem>
                                <SelectItem value="LEAST_BUSY">
                                  Least Busy
                                </SelectItem>
                                <SelectItem value="RANDOM">Random</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <Label>Auto-Assign Reviewer</Label>
                                <Popover>
                                  <PopoverTrigger>
                                    <AlertCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80">
                                    <p className="text-sm">
                                      Automatically assign a reviewer when an annotator submits a task (prevents conflict of interest).
                                    </p>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              {/* <p className="text-xs text-muted-foreground">
                                Assign reviewer when task is submitted
                              </p> */}
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
                            <Label>Reviewer Assignment Delay (hours)</Label>
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
                                maxTasksPerAnnotator: parseInt(e.target.value) || 1,
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
                                maxTasksPerReviewer: parseInt(e.target.value) || 1,
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
                                minAnnotatorReputation: parseInt(e.target.value) || 0,
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
                                minReviewerReputation: parseInt(e.target.value) || 0,
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
                            value={editAssignmentRule.maxRejectionsBeforeReassign}
                            onChange={(e) =>
                              setEditAssignmentRule((p) => ({
                                ...p,
                                maxRejectionsBeforeReassign: parseInt(e.target.value) || 1,
                              }))
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Reassign task to another annotator after this many rejections
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-6">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Label>Auto-Reassign on Skip</Label>
                              <Popover>
                                <PopoverTrigger>
                                  <AlertCircle className="w-4 h-4 text-gray-400 cursor-help" />
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                  <p className="text-sm">
                                    If an annotator skips a task, it will be automatically reassigned to another annotator.
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
                        </div>
                      </div>
                    </div>

                  </div>
                </Card>

                {/* 3. Analytics */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    Analytics
                  </h3>
                  <div className="p-12 text-center text-muted-foreground bg-gray-50 rounded-lg">
                    Analytics will be available once tasks are populated.
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
              <Button
                variant="outline"
                onClick={() => setIsEditRoleOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateRole}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                <Label>Search User</Label>
                <Input
                  placeholder="Search by name or email..."
                  value={memberSearchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                />

                {/* Selected Members Summary */}
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 p-2 bg-blue-50 rounded-md border border-blue-100 max-h-[100px] overflow-y-auto">
                    {selectedMembers.map((user) => (
                      <Badge
                        key={user.id}
                        variant="secondary"
                        className="bg-white hover:bg-white text-blue-700 border-blue-200 pl-2 pr-1 py-1 flex items-center gap-1"
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
                )}

                {/* Potential Members List */}
                <Card className="max-h-[200px] overflow-auto mt-2 border-gray-200 shadow-sm">
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

                      {potentialMembers.map((user) => {
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
                              <p className="text-sm font-medium truncate">
                                {user.fullName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </p>
                            </div>
                            {user.role && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] h-5 px-1 bg-gray-100 text-gray-600 border-gray-200"
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

              <div className="space-y-3 pt-2 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="role-override"
                    checked={isRoleOverride}
                    onCheckedChange={(c) => setIsRoleOverride(c as boolean)}
                  />
                  <Label
                    htmlFor="role-override"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Override default role?
                  </Label>
                </div>

                {isRoleOverride ? (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label className="text-xs text-muted-foreground">
                      Assign this role to all selected:
                    </Label>
                    <Select
                      value={selectedRole}
                      onValueChange={setSelectedRole}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ANNOTATOR">Annotator</SelectItem>
                        <SelectItem value="REVIEWER">Reviewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pl-6">
                    Selected members will be added with their{" "}
                    <strong className="font-medium text-gray-700">
                      system role
                    </strong>
                    .
                  </p>
                )}
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
          onOpenChange={() => { }}
          onSuccess={() => { }}
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
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Task</DialogTitle>
              <DialogDescription>
                Assign this task to an annotator in the project.
              </DialogDescription>
            </DialogHeader>

            {taskToAssign && (
              <div className="space-y-4">
                {/* Task Preview */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 border">
                    <img
                      src={taskToAssign.image?.storageUrl}
                      alt={taskToAssign.image?.originalFilename || 'Task'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {taskToAssign.image?.originalFilename || 'Untitled'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {taskToAssign.id.slice(0, 8)}...
                    </div>
                    <Badge
                      variant={
                        taskToAssign.difficultyLevel === 'EASY' ? 'default' :
                        taskToAssign.difficultyLevel === 'NORMAL' ? 'secondary' :
                        taskToAssign.difficultyLevel === 'HARD' ? 'destructive' :
                        'outline'
                      }
                      className="mt-1"
                    >
                      {taskToAssign.difficultyLevel || 'NORMAL'}
                    </Badge>
                  </div>
                </div>

                {/* Annotator Selection */}
                <div className="space-y-2">
                  <Label>Select Annotator</Label>
                  <Select
                    value={selectedAnnotatorId}
                    onValueChange={setSelectedAnnotatorId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an annotator..." />
                    </SelectTrigger>
                    <SelectContent>
                      {annotators
                        .filter((a: any) => a.projectRole === 'ANNOTATOR')
                        .map((annotator: any) => {
                          const taskCount = workloadMap[annotator.userId] || 0;
                          return (
                            <SelectItem key={annotator.userId} value={annotator.userId}>
                              <div className="flex items-center justify-between w-full">
                                <span>{annotator.user?.fullName || annotator.user?.email}</span>
                                <Badge variant="secondary" className="ml-2 text-xs">
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
                    If not set, deadline will be auto-calculated based on task difficulty
                  </p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAssignDialogOpen(false);
                  setTaskToAssign(null);
                  setSelectedAnnotatorId("");
                  setSelectedDeadline(undefined);
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
                    Assigning...
                  </>
                ) : (
                  'Assign Task'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Task Unassign Confirmation Dialog */}
        <AlertDialog open={isUnassignDialogOpen} onOpenChange={setIsUnassignDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unassign Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to unassign this task? The annotator will lose access to this task.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {taskToUnassign && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 border">
                  <img
                    src={taskToUnassign.image?.storageUrl}
                    alt={taskToUnassign.image?.originalFilename || 'Task'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {taskToUnassign.image?.originalFilename || 'Untitled'}
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
                  'Unassign Task'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk Deadline Dialog */}
        <Dialog open={isBulkDeadlineDialogOpen} onOpenChange={setIsBulkDeadlineDialogOpen}>
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
                    const annotatorAssignment = firstTask.assignments?.find((a: any) => a.annotatorId);
                    const assignee = annotatorAssignment?.annotator;
                    const taskCount = groupedTasks[bulkDeadlineUserId].length;

                    return (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={assignee?.avatarUrl} alt={assignee?.fullName} />
                          <AvatarFallback className="text-sm">
                            {assignee?.fullName?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{assignee?.fullName || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{assignee?.email || ''}</div>
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
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
                  'Set Deadline'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
