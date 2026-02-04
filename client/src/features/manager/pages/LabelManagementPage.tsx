import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { socketService } from "../../../services/socket.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label as UILabel } from "../../../components/ui/label";
import { Badge } from "../../../components/ui/badge";
import { Textarea } from "../../../components/ui/textarea";
import { Card } from "../../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Checkbox } from "../../../components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group";
import {
  Plus,
  Trash2,
  Tag,
  Edit2,
  FolderOpen,
  FolderKanban,
  Loader2,
  Globe,
  Lock,
  AlertTriangle,
  Search,
  MoreHorizontal,
  ChevronRight,
  Upload,
  FileDown,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  GripVertical,
  Copy,
  Sparkles,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import {
  labelApi,
  labelCategoryApi,
  type Label,
  type LabelCategory,
  type LabelImportResult,
} from "../../../services/label.api";
import apiClient from "../../../api/axiosClient";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { useAuth } from "../../../context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "../../../components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../components/ui/collapsible";
import { HexColorPicker } from "react-colorful";
import { AIGenerateLabelsDialog } from "../components/AIGenerateLabelsDialog";

const DEFAULT_COLORS = [
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

// Draggable Label Item Component
interface DraggableLabelProps {
  label: Label;
  isSelected: boolean;
  categories: LabelCategory[];
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onOpenMoveCategory: () => void;
  onOpenAssignProjects: () => void;
}

function DraggableLabelItem({
  label,
  isSelected,
  categories,
  onToggleSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onOpenMoveCategory,
  onOpenAssignProjects,
}: DraggableLabelProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: label.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Filter out current category from move options
  const moveOptions = [
    { id: null, name: "Uncategorized" },
    ...categories.filter((c) => c.id !== label.categoryId),
  ].filter((opt) => !(opt.id === null && label.categoryId === null));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 p-3 rounded-lg border transition-all ${
        isSelected
          ? "bg-blue-50 border-blue-200"
          : "bg-white border-gray-200 hover:border-gray-300"
      } ${isDragging ? "shadow-lg z-50" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-gray-400 hover:text-gray-600 touch-none"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        className="data-[state=checked]:bg-blue-600"
      />
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: label.color }}
      />
      <span className="flex-1 truncate">{label.name}</span>
      {label.isGlobal ? (
        <span title="Global">
          <Globe className="w-3.5 h-3.5 text-blue-500" />
        </span>
      ) : (
        <span title="Local">
          <Lock className="w-3.5 h-3.5 text-gray-400" />
        </span>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={onEdit}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicate
          </DropdownMenuItem>

          {/* Move to Category Dialog */}
          {moveOptions.length > 0 && (
            <>
              <div className="h-px bg-gray-200 my-1" />
              <DropdownMenuItem onClick={onOpenMoveCategory}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Move to Category
              </DropdownMenuItem>
            </>
          )}

          {/* Assign to Projects Dialog */}
          <DropdownMenuItem onClick={onOpenAssignProjects}>
            <FolderKanban className="w-4 h-4 mr-2" />
            Assign to Projects
          </DropdownMenuItem>

          <div className="h-px bg-gray-200 my-1" />
          <DropdownMenuItem
            onClick={onDelete}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Label preview for drag overlay
function LabelDragOverlay({ label }: { label: Label }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border bg-white border-blue-400 shadow-xl">
      <GripVertical className="w-4 h-4 text-gray-400" />
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: label.color }}
      />
      <span className="truncate">{label.name}</span>
    </div>
  );
}

export function LabelManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = useState<"labels" | "categories">("labels");
  const [isLoading, setIsLoading] = useState(false);

  // Data state
  const [labels, setLabels] = useState<Label[]>([]);
  const [categories, setCategories] = useState<LabelCategory[]>([]);

  // Label form state
  const [isAddLabelOpen, setIsAddLabelOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState(DEFAULT_COLORS[0]);
  const [labelCategory, setLabelCategory] = useState("");
  const [isGlobal, setIsGlobal] = useState(true);
  const [isCategoryLocked, setIsCategoryLocked] = useState(false);

  // Category form state
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LabelCategory | null>(
    null,
  );
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryColor, setCategoryColor] = useState("#3B82F6"); // Default blue

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGlobal, setFilterGlobal] = useState<string>("global"); // Default to global only to avoid clutter

  // Expand/Collapse state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Multi-select state
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  // Import dialog state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<"csv" | "excel">("csv");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<LabelImportResult | null>(
    null,
  );
  const [isExporting, setIsExporting] = useState(false);

  // Projects dialog state
  const [isProjectsDialogOpen, setIsProjectsDialogOpen] = useState(false);
  const [projects, setProjects] = useState<
    Array<{ id: string; name: string; description?: string }>
  >([]);
  const [projectLabels, setProjectLabels] = useState<Record<string, string[]>>(
    {},
  );
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(),
  );
  const [assigningProject, setAssigningProject] = useState<string | null>(null);
  const [selectedLabelsPerProject, setSelectedLabelsPerProject] = useState<
    Record<string, string[]>
  >({});
  const [isAIGenerateOpen, setIsAIGenerateOpen] = useState(false);

  // Label context menu dialogs
  const [moveCategoryDialogOpen, setMoveCategoryDialogOpen] = useState(false);
  const [assignProjectsDialogOpen, setAssignProjectsDialogOpen] =
    useState(false);
  const [contextLabel, setContextLabel] = useState<Label | null>(null);
  const [selectedCategoryForMove, setSelectedCategoryForMove] = useState<
    string | null
  >(null);
  const [selectedProjectsForAssign, setSelectedProjectsForAssign] = useState<
    string[]
  >([]);
  const [initialProjectAssignments, setInitialProjectAssignments] = useState<
    string[]
  >([]);
  const [unassignConfirmOpen, setUnassignConfirmOpen] = useState(false);
  const [projectsToUnassign, setProjectsToUnassign] = useState<
    Array<{ id: string; name: string }>
  >([]);

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [labelsData, categoriesData] = await Promise.all([
        labelApi.getAll(),
        labelCategoryApi.getAll(),
      ]);
      setLabels(labelsData);
      setCategories(categoriesData);
      // Expand all categories by default
      const allCategoryIds = new Set(categoriesData.map((c) => c.id));
      allCategoryIds.add("uncategorized");
      setExpandedCategories(allCategoryIds);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load projects on mount for label assignment
  useEffect(() => {
    fetchProjectsWithLabels();
  }, []);

  // Listen for label events from socket (create/update/delete)
  useEffect(() => {
    interface SystemEvent {
      triggeredBy: string;
      type: string;
      data: unknown;
    }
    const handleSystemEvent = (event: SystemEvent) => {
      // Check if this event was triggered by current user
      const isMyAction = event.triggeredBy === user?.id;

      // Type guard for event.data
      const eventData = event.data as { source?: string; count?: number };

      // Handle label events and auto-refresh
      switch (event.type) {
        case "label:created": {
          console.log(
            "[LabelManagement] Labels created, refreshing...",
            event.data,
          );

          // Show toast logic:
          // 1. If MY action from AI → show toast (because UI doesn't have feedback)
          // 2. If MY action from manual UI → DON'T show (UI already has toast)
          // 3. If OTHER user's action → silent refresh (no toast spam)
          const isFromAI = eventData?.source === "ai";

          if (isMyAction && isFromAI && (eventData?.count || 0) > 0) {
            // My AI action - show toast
            toast.success(
              `Created ${eventData?.count} label${(eventData?.count || 0) > 1 ? "s" : ""} successfully!`,
            );
          }
          // All other cases: silent refresh only

          // Always refresh data
          fetchData();
          break;
        }

        case "label:updated":
        case "label:deleted":
          console.log(
            "[LabelManagement] Label modified, refreshing...",
            event.data,
          );
          // Silent refresh - user already got feedback from UI action
          fetchData();
          break;

        default:
          // Ignore other event types
          break;
      }
    };

    socketService.on("system:event", handleSystemEvent);

    return () => {
      socketService.off("system:event", handleSystemEvent);
    };
  }, [fetchData, user?.id]);

  // Group labels by category
  const labelsByCategory = useMemo(() => {
    const grouped: Record<string, Label[]> = {};

    // Initialize with all categories
    categories.forEach((cat) => {
      grouped[cat.id] = [];
    });
    grouped["uncategorized"] = [];

    // Filter and group labels
    labels.forEach((label) => {
      const matchesSearch = label.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesGlobal =
        filterGlobal === "all" ||
        (filterGlobal === "global" && label.isGlobal) ||
        (filterGlobal === "local" && !label.isGlobal);

      if (matchesSearch && matchesGlobal) {
        const categoryId = label.categoryId || "uncategorized";
        if (!grouped[categoryId]) {
          grouped[categoryId] = [];
        }
        grouped[categoryId].push(label);
      }
    });

    return grouped;
  }, [labels, categories, searchQuery, filterGlobal]);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Select all labels in a category
  const selectAllInCategory = (categoryId: string) => {
    const categoryLabels = labelsByCategory[categoryId] || [];
    const categoryLabelIds = categoryLabels.map((l) => l.id);
    const allSelected = categoryLabelIds.every((id) =>
      selectedLabelIds.includes(id),
    );

    if (allSelected) {
      setSelectedLabelIds((prev) =>
        prev.filter((id) => !categoryLabelIds.includes(id)),
      );
    } else {
      setSelectedLabelIds((prev) => [
        ...new Set([...prev, ...categoryLabelIds]),
      ]);
    }
  };

  // Check if all labels in category are selected
  const isAllSelectedInCategory = (categoryId: string) => {
    const categoryLabels = labelsByCategory[categoryId] || [];
    if (categoryLabels.length === 0) return false;
    return categoryLabels.every((l) => selectedLabelIds.includes(l.id));
  };

  // Create/Update Label
  const handleSaveLabel = async () => {
    if (!labelName.trim()) {
      toast.error("Label name is required");
      return;
    }

    setIsLoading(true);
    try {
      if (editingLabel) {
        await labelApi.update(editingLabel.id, {
          name: labelName,
          color: labelColor,
          categoryId: labelCategory || null,
          isGlobal,
        });
        toast.success("Label updated successfully");
      } else {
        await labelApi.create({
          name: labelName,
          color: labelColor,
          categoryId: labelCategory || undefined,
          isGlobal,
        });
        toast.success("Label created successfully");
      }
      await fetchData();
      resetLabelForm();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to save label");
    } finally {
      setIsLoading(false);
    }
  };

  const resetLabelForm = () => {
    setLabelName("");
    setLabelColor(
      DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
    );
    setLabelCategory("");
    setIsGlobal(true);
    setEditingLabel(null);
    setIsAddLabelOpen(false);
    setIsCategoryLocked(false);
  };

  const openEditLabel = (label: Label) => {
    setEditingLabel(label);
    setLabelName(label.name);
    setLabelColor(label.color);
    setLabelCategory(label.categoryId || "");
    setIsGlobal(label.isGlobal);
    setIsCategoryLocked(false);
    setIsAddLabelOpen(true);
  };

  const openCreateLabelInCategory = (categoryId: string) => {
    resetLabelForm();
    if (categoryId !== "uncategorized") {
      setLabelCategory(categoryId);
      setIsCategoryLocked(true);
    }
    setIsAddLabelOpen(true);
  };

  const handleDeleteLabel = async (labelId: string) => {
    const label = labels.find((l) => l.id === labelId);
    setConfirmDialog({
      open: true,
      title: "Delete Label",
      message: `Are you sure you want to delete "${label?.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        setIsLoading(true);
        try {
          await labelApi.delete(labelId);
          toast.success("Label deleted");
          await fetchData();
        } catch (error: unknown) {
          const err = error as { response?: { data?: { error?: string } } };
          toast.error(err.response?.data?.error || "Failed to delete label");
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Create/Update Category
  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.error("Category name is required");
      return;
    }

    setIsLoading(true);
    try {
      if (editingCategory) {
        await labelCategoryApi.update(editingCategory.id, {
          name: categoryName,
          description: categoryDescription || undefined,
          color: categoryColor,
        });
        toast.success("Category updated successfully");
      } else {
        await labelCategoryApi.create({
          name: categoryName,
          description: categoryDescription || undefined,
          color: categoryColor,
        });
        toast.success("Category created successfully");
      }
      await fetchData();
      resetCategoryForm();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to save category");
    } finally {
      setIsLoading(false);
    }
  };

  const resetCategoryForm = () => {
    setCategoryName("");
    setCategoryDescription("");
    setCategoryColor("#3B82F6");
    setEditingCategory(null);
    setIsAddCategoryOpen(false);
  };

  const openEditCategory = (category: LabelCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || "");
    setCategoryColor(category.color || "#3B82F6");
    setIsAddCategoryOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    const labelsInCategory = labels.filter((l) => l.categoryId === categoryId);

    if (labelsInCategory.length > 0) {
      toast.error(
        `Cannot delete category with ${labelsInCategory.length} label(s). Delete labels first.`,
      );
      return;
    }

    setConfirmDialog({
      open: true,
      title: "Delete Category",
      message: `Are you sure you want to delete "${category?.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        setIsLoading(true);
        try {
          await labelCategoryApi.delete(categoryId);
          toast.success("Category deleted");
          await fetchData();
        } catch (error: unknown) {
          const err = error as { response?: { data?: { error?: string } } };
          toast.error(err.response?.data?.error || "Failed to delete category");
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Multi-select functions
  const toggleLabelSelection = (labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId],
    );
  };

  const handleBulkDelete = async () => {
    if (selectedLabelIds.length === 0) return;

    setConfirmDialog({
      open: true,
      title: "Delete Selected Labels",
      message: `Are you sure you want to delete ${selectedLabelIds.length} label(s)? This action cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
        setIsDeleting(true);
        let successCount = 0;
        let failCount = 0;

        for (const labelId of selectedLabelIds) {
          try {
            await labelApi.delete(labelId);
            successCount++;
          } catch (error: unknown) {
            failCount++;
            console.error("Bulk delete failed for", labelId, error);
          }
        }

        if (successCount > 0) {
          toast.success(`${successCount} label(s) deleted successfully`);
        }
        if (failCount > 0) {
          toast.error(
            `${failCount} label(s) could not be deleted (may be in use)`,
          );
        }

        setSelectedLabelIds([]);
        await fetchData();
        setIsDeleting(false);
      },
    });
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedLabelIds([]);
  }, [filterGlobal, searchQuery]);

  // Import/Export handlers
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const csvData = await labelApi.exportCSV();
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `labels_export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Labels exported as CSV");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to export labels");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const blob = await labelApi.exportExcel();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `labels_export_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Labels exported as Excel");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to export labels");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadCSVTemplate = async () => {
    try {
      const templateData = await labelApi.getTemplate();
      const blob = new Blob([templateData], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "labels_import_template.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV template downloaded");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to download template");
    }
  };

  const handleDownloadExcelTemplate = async () => {
    try {
      const blob = await labelApi.getExcelTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "labels_import_template.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Excel template downloaded");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to download template");
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportResult(null);
    try {
      let result: LabelImportResult;

      if (importFormat === "excel") {
        if (!importFile) {
          toast.error("Please select an Excel file");
          setIsImporting(false);
          return;
        }
        result = await labelApi.importExcel(importFile);
      } else {
        if (!importCsvText.trim() && !importFile) {
          toast.error("Please enter CSV data or upload a file");
          setIsImporting(false);
          return;
        }
        // If we have a file selected and it's CSV, read it
        if (importFile && !importCsvText.trim()) {
          const text = await importFile.text();
          result = await labelApi.importCSV(text);
        } else {
          result = await labelApi.importCSV(importCsvText);
        }
      }

      setImportResult(result);
      if (result.success) {
        toast.success(
          `Import completed: ${result.labelsCreated} labels created`,
        );
        await fetchData();
      }
    } catch (error: unknown) {
      // Check if the error response contains import result data
      const err = error as {
        response?: {
          data?: LabelImportResult & { error?: string; labelsSkipped?: number };
        };
      };
      const errorData = err.response?.data;
      if (errorData && typeof errorData.labelsSkipped === "number") {
        // This is an import result with errors
        setImportResult(errorData as LabelImportResult);
      } else {
        toast.error(errorData?.error || "Failed to import labels");
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      // Detect format from file extension
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "xlsx" || ext === "xls") {
        setImportFormat("excel");
      } else {
        setImportFormat("csv");
        // Read CSV file content for preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setImportCsvText(text);
        };
        reader.readAsText(file);
      }
    }
  };

  const resetImportDialog = () => {
    setImportCsvText("");
    setImportFile(null);
    setImportFormat("csv");
    setImportResult(null);
    setIsImportDialogOpen(false);
  };

  // Projects Dialog Functions
  const openProjectsDialog = async () => {
    await fetchProjectsWithLabels();
    setIsProjectsDialogOpen(true);
  };

  const fetchProjectsWithLabels = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await apiClient.get("/projects");
      const projectsData = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      setProjects(projectsData);

      const labelsMap: Record<string, string[]> = {};
      await Promise.all(
        projectsData.map(async (project: { id: string }) => {
          try {
            const labelsResponse = await apiClient.get(
              `/projects/${project.id}/labels`,
            );
            const labelsData = Array.isArray(labelsResponse.data?.data)
              ? labelsResponse.data.data
              : Array.isArray(labelsResponse.data)
                ? labelsResponse.data
                : [];

            labelsMap[project.id] = labelsData.map(
              (l: { labelId: string }) => l.labelId,
            );
          } catch (error) {
            labelsMap[project.id] = [];
          }
        }),
      );
      setProjectLabels(labelsMap);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to load projects");
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
      const currentAssignments = projectLabels[projectId] || [];
      setSelectedLabelsPerProject((prev) => ({
        ...prev,
        [projectId]: currentAssignments,
      }));
    }
    setExpandedProjects(newExpanded);
  };

  const handleToggleLabelSelection = (projectId: string, labelId: string) => {
    setSelectedLabelsPerProject((prev) => {
      const currentSelected = prev[projectId] || [];
      const isSelected = currentSelected.includes(labelId);
      if (isSelected) {
        return {
          ...prev,
          [projectId]: currentSelected.filter((id) => id !== labelId),
        };
      } else {
        return {
          ...prev,
          [projectId]: [...currentSelected, labelId],
        };
      }
    });
  };

  const handleAssignLabelsToProject = async (projectId: string) => {
    const selectedLabels = selectedLabelsPerProject[projectId] || [];
    const currentLabels = projectLabels[projectId] || [];
    const labelsToAdd = selectedLabels.filter(
      (id) => !currentLabels.includes(id),
    );
    const labelsToRemove = currentLabels.filter(
      (id) => !selectedLabels.includes(id),
    );

    if (labelsToAdd.length === 0 && labelsToRemove.length === 0) {
      toast.info("No changes to save");
      return;
    }

    setAssigningProject(projectId);
    try {
      for (const labelId of labelsToRemove) {
        await apiClient.delete(`/projects/${projectId}/labels/${labelId}`);
      }
      for (const labelId of labelsToAdd) {
        await apiClient.post(`/projects/${projectId}/labels`, { labelId });
      }
      const newLabels = selectedLabels;
      setProjectLabels((prev) => ({ ...prev, [projectId]: newLabels }));
      setSelectedLabelsPerProject((prev) => ({
        ...prev,
        [projectId]: newLabels,
      }));
      toast.success(
        `Updated ${labelsToAdd.length + labelsToRemove.length} label assignment(s)`,
      );
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(
        err.response?.data?.error || "Failed to update label assignments",
      );
      await fetchProjectsWithLabels();
    } finally {
      setAssigningProject(null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const labelId = active.id as string;
    const overId = over.id as string;

    // Find the label being dragged
    const label = labels.find((l) => l.id === labelId);
    if (!label) return;

    // Determine target category:
    // - If overId is 'uncategorized', target is uncategorized
    // - If overId matches a category ID, use that category
    // - If overId matches another label ID, find that label's category
    let targetCategoryId: string | null = null;

    if (overId === "uncategorized") {
      targetCategoryId = null;
    } else if (categories.some((c) => c.id === overId)) {
      // Dropped on a category
      targetCategoryId = overId;
    } else {
      // Dropped on another label - find its category
      const targetLabel = labels.find((l) => l.id === overId);
      if (targetLabel) {
        targetCategoryId = targetLabel.categoryId;
      } else {
        // Unknown target, ignore
        return;
      }
    }

    // Get the current category id
    const currentCategoryId = label.categoryId;

    // If dropped on the same category, do nothing
    if (currentCategoryId === targetCategoryId) return;

    try {
      await labelApi.update(labelId, { categoryId: targetCategoryId });
      const targetName =
        targetCategoryId === null
          ? "Uncategorized"
          : categories.find((c) => c.id === targetCategoryId)?.name;
      toast.success(`Moved "${label.name}" to ${targetName}`);
      await fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to move label");
    }
  };

  // Duplicate label
  const handleDuplicateLabel = (label: Label) => {
    setEditingLabel(null);
    setLabelName(`${label.name} (copy)`);
    setLabelColor(label.color);
    setLabelCategory(label.categoryId || "");
    setIsGlobal(label.isGlobal);
    setIsCategoryLocked(false);
    setIsAddLabelOpen(true);
  };

  // Get active label for drag overlay
  const activeLabel = activeId ? labels.find((l) => l.id === activeId) : null;

  // Open move to category dialog
  const handleOpenMoveCategory = (label: Label) => {
    setContextLabel(label);
    setSelectedCategoryForMove(label.categoryId);
    setMoveCategoryDialogOpen(true);
  };

  // Confirm move to category
  const handleConfirmMoveCategory = async () => {
    if (!contextLabel) return;

    try {
      await labelApi.update(contextLabel.id, {
        categoryId: selectedCategoryForMove,
      });
      const targetName =
        selectedCategoryForMove === null
          ? "Uncategorized"
          : categories.find((c) => c.id === selectedCategoryForMove)?.name;
      toast.success(`Moved "${contextLabel.name}" to ${targetName}`);
      await fetchData();
      setMoveCategoryDialogOpen(false);
      setContextLabel(null);
      setSelectedCategoryForMove(null);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to move label");
    }
  };

  // Open assign to projects dialog
  const handleOpenAssignProjects = (label: Label) => {
    setContextLabel(label);
    // Get currently assigned projects for this label
    const assignedProjects = Object.entries(projectLabels)
      .filter(([_, labelIds]) => labelIds.includes(label.id))
      .map(([projectId]) => projectId);
    setSelectedProjectsForAssign(assignedProjects);
    setInitialProjectAssignments(assignedProjects); // Save initial state
    setAssignProjectsDialogOpen(true);
  };

  // Toggle project selection
  const handleToggleProjectSelection = (projectId: string) => {
    setSelectedProjectsForAssign((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
  };

  // Select all projects
  const handleSelectAllProjects = () => {
    if (selectedProjectsForAssign.length === projects.length) {
      setSelectedProjectsForAssign([]);
    } else {
      setSelectedProjectsForAssign(projects.map((p) => p.id));
    }
  };

  // Confirm assign to projects
  const handleConfirmAssignProjects = async () => {
    if (!contextLabel) return;

    const toAdd = selectedProjectsForAssign.filter(
      (id) => !initialProjectAssignments.includes(id),
    );
    const toRemove = initialProjectAssignments.filter(
      (id) => !selectedProjectsForAssign.includes(id),
    );

    if (toAdd.length === 0 && toRemove.length === 0) {
      toast.info("No changes to save");
      setAssignProjectsDialogOpen(false);
      return;
    }

    // If there are projects being removed, show confirmation
    if (toRemove.length > 0) {
      const projectsToRemove = toRemove
        .map((id) => {
          const project = projects.find((p) => p.id === id);
          return project ? { id, name: project.name } : null;
        })
        .filter((p) => p !== null) as Array<{ id: string; name: string }>;

      setProjectsToUnassign(projectsToRemove);
      setUnassignConfirmOpen(true);
      return; // Wait for confirmation
    }

    // If only adding, proceed directly
    await performAssignmentUpdate(toAdd, toRemove);
  };

  // Perform the actual assignment update
  const performAssignmentUpdate = async (
    toAdd: string[],
    toRemove: string[],
  ) => {
    if (!contextLabel) return;

    try {
      for (const projectId of toRemove) {
        await apiClient.delete(
          `/projects/${projectId}/labels/${contextLabel.id}`,
        );
      }
      for (const projectId of toAdd) {
        await apiClient.post(`/projects/${projectId}/labels`, {
          labelId: contextLabel.id,
        });
      }

      // Update local state
      const newProjectLabels = { ...projectLabels };
      for (const projectId of toRemove) {
        newProjectLabels[projectId] =
          newProjectLabels[projectId]?.filter((id) => id !== contextLabel.id) ||
          [];
      }
      for (const projectId of toAdd) {
        newProjectLabels[projectId] = [
          ...(newProjectLabels[projectId] || []),
          contextLabel.id,
        ];
      }
      setProjectLabels(newProjectLabels);

      toast.success(`Updated project assignments for "${contextLabel.name}"`);
      setAssignProjectsDialogOpen(false);
      setUnassignConfirmOpen(false);
      setContextLabel(null);
      setSelectedProjectsForAssign([]);
      setInitialProjectAssignments([]);
      setProjectsToUnassign([]);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(
        err.response?.data?.error || "Failed to update project assignments",
      );
      await fetchProjectsWithLabels();
    }
  };

  // Handle confirmed unassignment
  const handleConfirmUnassign = async () => {
    if (!contextLabel) return;

    const toAdd = selectedProjectsForAssign.filter(
      (id) => !initialProjectAssignments.includes(id),
    );
    const toRemove = initialProjectAssignments.filter(
      (id) => !selectedProjectsForAssign.includes(id),
    );

    await performAssignmentUpdate(toAdd, toRemove);
  };

  // Get total filtered labels count
  const totalFilteredLabels = useMemo(() => {
    return Object.values(labelsByCategory).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
  }, [labelsByCategory]);

  return (
    <div className="min-h-screen bg-gray-50 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Page Header with Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2 text-muted-foreground"
            onClick={() => navigate("/manager/projects")}
          ></Button>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-semibold mb-2">Label Management</h2>
              <p className="text-muted-foreground">
                Create and manage label categories and labels for your
                annotation projects
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={view === "labels" ? "default" : "outline"}
            onClick={() => setView("labels")}
            className={view === "labels" ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            <Tag className="w-4 h-4 mr-2" />
            Labels ({totalFilteredLabels})
          </Button>
          <Button
            variant={view === "categories" ? "default" : "outline"}
            onClick={() => setView("categories")}
            className={
              view === "categories" ? "bg-blue-600 hover:bg-blue-700" : ""
            }
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Categories ({categories.length})
          </Button>
        </div>

        {/* Content */}
        {isLoading && !labels.length && !categories.length ? (
          <Card className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </Card>
        ) : (
          <>
            {/* Labels View */}
            {view === "labels" && (
              <div className="space-y-6">
                {/* Toolbar */}
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search labels..."
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSearchQuery(e.target.value)
                        }
                        className="pl-9"
                      />
                    </div>
                    <Select
                      value={filterGlobal}
                      onValueChange={setFilterGlobal}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="global">Global</SelectItem>
                        <SelectItem value="local">Local</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex-1" />
                    {/* Management group removed from here, moved to the right group */}
                    {selectedLabelIds.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Delete ({selectedLabelIds.length})
                      </Button>
                    )}
                    {/* Grouping utility actions */}
                    <div className="flex items-center bg-gray-50/80 p-1 rounded-lg border border-gray-100 gap-1 mr-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={openProjectsDialog}
                        className="h-8 text-xs hover:bg-white hover:shadow-sm transition-all"
                      >
                        <FolderKanban className="w-3.5 h-3.5 mr-1.5" />
                        Projects
                      </Button>
                      <div className="w-px h-4 bg-gray-200 mx-1" />

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isExporting || isImporting}
                            className="h-8 text-xs hover:bg-white hover:shadow-sm transition-all"
                          >
                            {isExporting || isImporting ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Data Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Import Data
                          </div>
                          <DropdownMenuItem
                            onClick={() => setIsImportDialogOpen(true)}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Import Labels
                          </DropdownMenuItem>

                          <div className="h-px bg-gray-100 my-1" />

                          {/* Export Data Submenu */}
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <FileDown className="w-4 h-4 mr-2" />
                              Export Data
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={handleExportCSV}>
                                <FileText className="w-4 h-4 mr-2" />
                                Export as CSV
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={handleExportExcel}>
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Export as Excel
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>

                          {/* Templates Submenu */}
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <FileText className="w-4 h-4 mr-2" />
                              Templates
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem
                                onClick={handleDownloadCSVTemplate}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                CSV Template
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={handleDownloadExcelTemplate}
                              >
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                Excel Template
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <Button
                      onClick={() => setIsAddCategoryOpen(true)}
                      variant="outline"
                      className="hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Category
                    </Button>

                    <Button
                      onClick={() => setIsAIGenerateOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200 border-0 gap-2 px-4"
                    >
                      <Sparkles className="w-4 h-4" />
                      AI Generate
                    </Button>
                  </div>
                </Card>

                {/* Labels by Category */}
                {totalFilteredLabels === 0 && !isLoading ? (
                  <Card className="p-12">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Tag className="w-16 h-16 mb-4 opacity-30" />
                      <p className="font-medium text-lg">No labels found</p>
                      <p className="text-sm mt-1">
                        Create a category first, then add labels
                      </p>
                      <Button
                        className="mt-4"
                        onClick={() => setIsAddCategoryOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Category
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="space-y-4">
                      {/* Render categories with labels */}
                      {categories.map((category) => {
                        const categoryLabels =
                          labelsByCategory[category.id] || [];
                        const isExpanded = expandedCategories.has(category.id);
                        const allSelected = isAllSelectedInCategory(
                          category.id,
                        );

                        return (
                          <Collapsible
                            key={category.id}
                            open={isExpanded}
                            onOpenChange={() => toggleCategory(category.id)}
                          >
                            <Card className="overflow-hidden" id={category.id}>
                              {/* Category Header */}
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors">
                                  <div className="flex items-center gap-2">
                                    <ChevronRight
                                      className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                                    />
                                    <span className="font-medium">
                                      {category.name}
                                    </span>
                                    <Badge variant="secondary" className="ml-1">
                                      {categoryLabels.length}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {categoryLabels.length > 0 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-sm text-blue-600 hover:text-blue-700 h-auto py-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          selectAllInCategory(category.id);
                                        }}
                                      >
                                        {allSelected
                                          ? "Deselect All"
                                          : "Select All"}
                                      </Button>
                                    )}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger
                                        asChild
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                        >
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() =>
                                            openEditCategory(category)
                                          }
                                        >
                                          <Edit2 className="w-4 h-4 mr-2" />
                                          Edit Category
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleDeleteCategory(category.id)
                                          }
                                          className="text-red-600 focus:text-red-600"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Delete Category
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </CollapsibleTrigger>

                              {/* Labels Grid */}
                              <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden">
                                <div
                                  className="p-4"
                                  data-category-id={category.id}
                                >
                                  <SortableContext
                                    items={categoryLabels.map((l) => l.id)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    <div className="grid grid-cols-2 gap-3">
                                      {categoryLabels.map((label) => (
                                        <DraggableLabelItem
                                          key={label.id}
                                          label={label}
                                          isSelected={selectedLabelIds.includes(
                                            label.id,
                                          )}
                                          categories={categories}
                                          onToggleSelect={() =>
                                            toggleLabelSelection(label.id)
                                          }
                                          onEdit={() => openEditLabel(label)}
                                          onDelete={() =>
                                            handleDeleteLabel(label.id)
                                          }
                                          onDuplicate={() =>
                                            handleDuplicateLabel(label)
                                          }
                                          onOpenMoveCategory={() =>
                                            handleOpenMoveCategory(label)
                                          }
                                          onOpenAssignProjects={() =>
                                            handleOpenAssignProjects(label)
                                          }
                                        />
                                      ))}

                                      {/* Add Label Button */}
                                      <button
                                        onClick={() =>
                                          openCreateLabelInCategory(category.id)
                                        }
                                        className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                      >
                                        <Plus className="w-4 h-4" />
                                        <span>Add Label</span>
                                      </button>
                                    </div>
                                  </SortableContext>
                                </div>
                              </CollapsibleContent>
                            </Card>
                          </Collapsible>
                        );
                      })}

                      {/* Uncategorized Labels */}
                      {(labelsByCategory["uncategorized"]?.length > 0 ||
                        categories.length === 0) && (
                        <Collapsible
                          open={expandedCategories.has("uncategorized")}
                          onOpenChange={() => toggleCategory("uncategorized")}
                        >
                          <Card className="overflow-hidden" id="uncategorized">
                            {/* Uncategorized Header */}
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-2">
                                  <ChevronRight
                                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expandedCategories.has("uncategorized") ? "rotate-90" : ""}`}
                                  />
                                  <span className="font-medium text-gray-600">
                                    Uncategorized
                                  </span>
                                  <Badge variant="secondary" className="ml-1">
                                    {labelsByCategory["uncategorized"]
                                      ?.length || 0}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  {(labelsByCategory["uncategorized"]?.length ||
                                    0) > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-sm text-blue-600 hover:text-blue-700 h-auto py-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        selectAllInCategory("uncategorized");
                                      }}
                                    >
                                      {isAllSelectedInCategory("uncategorized")
                                        ? "Deselect All"
                                        : "Select All"}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CollapsibleTrigger>

                            {/* Uncategorized Labels Grid */}
                            <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up overflow-hidden">
                              <div
                                className="p-4"
                                data-category-id="uncategorized"
                              >
                                <SortableContext
                                  items={(
                                    labelsByCategory["uncategorized"] || []
                                  ).map((l) => l.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div className="grid grid-cols-2 gap-3">
                                    {(
                                      labelsByCategory["uncategorized"] || []
                                    ).map((label) => (
                                      <DraggableLabelItem
                                        key={label.id}
                                        label={label}
                                        isSelected={selectedLabelIds.includes(
                                          label.id,
                                        )}
                                        categories={categories}
                                        onToggleSelect={() =>
                                          toggleLabelSelection(label.id)
                                        }
                                        onEdit={() => openEditLabel(label)}
                                        onDelete={() =>
                                          handleDeleteLabel(label.id)
                                        }
                                        onDuplicate={() =>
                                          handleDuplicateLabel(label)
                                        }
                                        onOpenMoveCategory={() =>
                                          handleOpenMoveCategory(label)
                                        }
                                        onOpenAssignProjects={() =>
                                          handleOpenAssignProjects(label)
                                        }
                                      />
                                    ))}

                                    {/* Add Label Button */}
                                    <button
                                      onClick={() =>
                                        openCreateLabelInCategory(
                                          "uncategorized",
                                        )
                                      }
                                      className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    >
                                      <Plus className="w-4 h-4" />
                                      <span>Add Label</span>
                                    </button>
                                  </div>
                                </SortableContext>
                              </div>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      )}
                    </div>

                    {/* Drag Overlay */}
                    <DragOverlay>
                      {activeLabel ? (
                        <LabelDragOverlay label={activeLabel} />
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                )}
              </div>
            )}

            {/* Categories View */}
            {view === "categories" && (
              <Card className="overflow-hidden">
                {/* Toolbar */}
                <div className="px-6 py-4 border-b bg-gray-50/50 flex justify-between items-center">
                  <p className="text-gray-600">
                    Organize your labels into categories for better management
                  </p>
                  <Button
                    onClick={() => setIsAddCategoryOpen(true)}
                    disabled={isLoading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Category
                  </Button>
                </div>

                {/* Categories List */}
                <div className="p-6">
                  {categories.length > 0 ? (
                    <div className="space-y-3">
                      {categories.map((category) => {
                        const labelCount = (labelsByCategory[category.id] || [])
                          .length;

                        return (
                          <div
                            key={category.id}
                            className="flex items-center gap-4 p-5 rounded-lg border bg-white border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm"
                          >
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                              <FolderOpen className="w-6 h-6 text-gray-500" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 text-lg">
                                  {category.name}
                                </span>
                                <Badge variant="secondary">
                                  {labelCount} label
                                  {labelCount !== 1 ? "s" : ""}
                                </Badge>
                              </div>
                              {category.description && (
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                  {category.description}
                                </p>
                              )}
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditCategory(category)}
                                >
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDeleteCategory(category.id)
                                  }
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <FolderOpen className="w-16 h-16 mb-4 opacity-30" />
                      <p className="font-medium text-lg">No categories yet</p>
                      <p className="text-sm mt-1">
                        Create a category to organize your labels
                      </p>
                      <Button
                        className="mt-4"
                        onClick={() => setIsAddCategoryOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Category
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Label Dialog */}
      <Dialog
        open={isAddLabelOpen}
        onOpenChange={(open) => !open && resetLabelForm()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLabel ? "Edit Label" : "Create New Label"}
            </DialogTitle>
            <DialogDescription>
              {editingLabel
                ? "Update label information"
                : "Add a new label for annotation"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <UILabel>Label Name *</UILabel>
              <Input
                placeholder="e.g. Person, Car, Dog"
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <UILabel>Category {isCategoryLocked ? "" : "(Optional)"}</UILabel>
              {isCategoryLocked ? (
                <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-md">
                  <FolderOpen className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    {categories.find((c) => c.id === labelCategory)?.name ||
                      "No Category"}
                  </span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Locked
                  </Badge>
                </div>
              ) : (
                <Select
                  value={labelCategory || "__none__"}
                  onValueChange={(v) =>
                    setLabelCategory(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <UILabel>Color *</UILabel>
              <div className="flex items-start gap-4">
                <HexColorPicker
                  color={labelColor}
                  onChange={setLabelColor}
                  style={{ width: "160px", height: "160px" }}
                />
                <div className="space-y-3">
                  {/* Color Preview */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 shadow-sm"
                      style={{ backgroundColor: labelColor }}
                    />
                    <div>
                      <p className="text-xs text-gray-500">Selected</p>
                      <p className="font-mono text-sm font-medium uppercase">
                        {labelColor}
                      </p>
                    </div>
                  </div>
                  {/* Hex Input */}
                  <div>
                    <Input
                      value={labelColor}
                      onChange={(e) => {
                        let value = e.target.value;
                        if (!value.startsWith("#")) value = "#" + value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                          setLabelColor(value);
                        }
                      }}
                      placeholder="#000000"
                      className="font-mono text-sm w-28"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
              <Checkbox
                id="isGlobal"
                checked={isGlobal}
                onCheckedChange={(checked) => setIsGlobal(!!checked)}
                className="mt-0.5"
              />
              <div>
                <UILabel
                  htmlFor="isGlobal"
                  className="cursor-pointer font-medium"
                >
                  Global Label
                </UILabel>
                <p className="text-xs text-gray-500 mt-0.5">
                  Global labels can be assigned to any project
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={resetLabelForm}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveLabel} disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingLabel ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Category Dialog */}
      <Dialog
        open={isAddCategoryOpen}
        onOpenChange={(open) => !open && resetCategoryForm()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Create New Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update category information"
                : "Add a new category to organize labels"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <UILabel>Category Name *</UILabel>
              <Input
                placeholder="e.g. Medical, Animals, Vehicles"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <UILabel>Description (Optional)</UILabel>
              <Textarea
                placeholder="What types of labels belong to this category?"
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <UILabel>Category Color</UILabel>
              <div className="flex items-start gap-4">
                <HexColorPicker
                  color={categoryColor}
                  onChange={setCategoryColor}
                  style={{ width: "160px", height: "160px" }}
                />
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 shadow-sm"
                      style={{ backgroundColor: categoryColor }}
                    />
                    <div>
                      <p className="text-xs text-gray-500">Selected</p>
                      <p className="font-mono text-sm font-medium uppercase">
                        {categoryColor}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Input
                      value={categoryColor}
                      onChange={(e) => {
                        let value = e.target.value;
                        if (!value.startsWith("#")) value = "#" + value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                          setCategoryColor(value);
                        }
                      }}
                      placeholder="#000000"
                      className="font-mono text-sm w-28"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={resetCategoryForm}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCategory} disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCategory ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          !open && setConfirmDialog((prev) => ({ ...prev, open: false }))
        }
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <DialogTitle>{confirmDialog.title}</DialogTitle>
              </div>
            </div>
            <DialogDescription className="pt-3">
              {confirmDialog.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDialog.onConfirm}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={isImportDialogOpen}
        onOpenChange={(open) => !open && resetImportDialog()}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Labels
            </DialogTitle>
            <DialogDescription>
              Import labels with their categories from a CSV or Excel file.
              Categories will be created automatically if they don't exist.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* File Upload */}
            <div className="space-y-2">
              <UILabel>Upload File (CSV or Excel)</UILabel>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="flex-1"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <FileDown className="w-4 h-4 mr-2" />
                      Template
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDownloadCSVTemplate}>
                      <FileText className="w-4 h-4 mr-2" />
                      CSV Template
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadExcelTemplate}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Excel Template
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {importFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {importFormat === "excel" ? (
                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-600" />
                  )}
                  <span>{importFile.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {importFormat.toUpperCase()}
                  </Badge>
                </div>
              )}
            </div>

            {/* Only show CSV paste option when not using Excel */}
            {importFormat === "csv" && (
              <>
                {/* Or paste CSV */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or paste CSV data
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <UILabel>CSV Data</UILabel>
                  <Textarea
                    placeholder={`category_name,category_description,label_name,label_color,is_global
Vehicles,,Car,#3B82F6,true
Vehicles,,Truck,#10B981,true
Animals,Living creatures,Dog,#F59E0B,false`}
                    value={importCsvText}
                    onChange={(e) => setImportCsvText(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: category_name, category_description, label_name,
                    label_color, is_global
                  </p>
                </div>
              </>
            )}

            {importFormat === "excel" && !importFile && (
              <Alert>
                <FileSpreadsheet className="w-4 h-4" />
                <AlertDescription>
                  Please select an Excel file (.xlsx or .xls) to import labels.
                </AlertDescription>
              </Alert>
            )}

            {/* Import Result */}
            {importResult && (
              <div className="space-y-3">
                {/* Success/Failure Summary */}
                {importResult.success ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-green-800">
                          Import completed successfully!
                        </p>
                        <ul className="text-sm text-green-700 space-y-0.5">
                          {importResult.categoriesCreated > 0 && (
                            <li>
                              • Categories created:{" "}
                              {importResult.categoriesCreated}
                            </li>
                          )}
                          <li>
                            • Labels created: {importResult.labelsCreated}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <XCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-red-800">
                          Import failed
                        </p>
                        <p className="text-sm text-red-700">
                          No labels were imported. Please check the errors
                          below.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warnings for skipped items */}
                {importResult.labelsSkipped > 0 && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium text-yellow-800">
                          {importResult.labelsSkipped} label(s) skipped
                        </p>
                        {importResult.errors.length > 0 && (
                          <ul className="text-sm text-yellow-700 space-y-1 max-h-40 overflow-y-auto">
                            {importResult.errors.map((err, i) => (
                              <li key={i}>• {err}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={resetImportDialog}
              disabled={isImporting}
            >
              {importResult?.success ? "Close" : "Cancel"}
            </Button>
            {!importResult?.success && (
              <Button
                onClick={handleImport}
                disabled={
                  isImporting ||
                  (importFormat === "excel"
                    ? !importFile
                    : !importCsvText.trim() && !importFile)
                }
              >
                {isImporting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Import Labels
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Projects Dialog */}
      <Dialog
        open={isProjectsDialogOpen}
        onOpenChange={(open) => {
          setIsProjectsDialogOpen(open);
          if (!open) {
            setExpandedProjects(new Set());
            setSelectedLabelsPerProject({});
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Labels to Projects</DialogTitle>
            <DialogDescription>
              Select which labels are available for each project
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {isLoadingProjects ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderKanban className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No projects found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => {
                  const isExpanded = expandedProjects.has(project.id);
                  const assignedLabelIds = projectLabels[project.id] || [];
                  const selectedLabels =
                    selectedLabelsPerProject[project.id] || assignedLabelIds;
                  // const hasChanges =
                  //   JSON.stringify(selectedLabels.sort()) !==
                  //   JSON.stringify(assignedLabelIds.sort());
                  // const isAssigning = assigningProject === project.id;

                  return (
                    <Card key={project.id} className="overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleProject(project.id)}
                      >
                        <div className="flex items-center gap-3">
                          <ChevronRight
                            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          />
                          <FolderKanban className="w-5 h-5 text-blue-600" />
                          <div>
                            <div className="font-semibold">{project.name}</div>
                            {project.description && (
                              <div className="text-sm text-muted-foreground">
                                {project.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {assignedLabelIds.length} labels
                        </Badge>
                      </div>

                      {isExpanded && (
                        <div className="border-t p-4 bg-gray-50">
                          <div className="space-y-4">
                            {categories.map((category) => {
                              const categoryLabels =
                                labelsByCategory[category.id] || [];
                              if (categoryLabels.length === 0) return null;

                              return (
                                <div key={category.id}>
                                  <h4 className="font-medium text-sm mb-2">
                                    {category.name}
                                  </h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    {categoryLabels.map((label) => {
                                      const isAssigned =
                                        assignedLabelIds.includes(label.id);
                                      const isSelected =
                                        selectedLabels.includes(label.id);

                                      return (
                                        <div
                                          key={label.id}
                                          className={`flex items-center gap-2 p-2 rounded transition-all ${
                                            isAssigned
                                              ? "bg-green-50 border-2 border-green-300 cursor-default"
                                              : "hover:bg-gray-50 border-2 border-transparent"
                                          }`}
                                          title={
                                            isAssigned
                                              ? "Already assigned to this project"
                                              : "Click to select"
                                          }
                                        >
                                          {isAssigned ? (
                                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                          ) : (
                                            <Checkbox
                                              checked={isSelected}
                                              onCheckedChange={() =>
                                                handleToggleLabelSelection(
                                                  project.id,
                                                  label.id,
                                                )
                                              }
                                            />
                                          )}
                                          <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{
                                              backgroundColor: label.color,
                                            }}
                                          />
                                          <span
                                            className={`text-sm truncate flex-1 font-medium ${
                                              isAssigned
                                                ? "text-green-700"
                                                : "text-gray-700"
                                            }`}
                                          >
                                            {label.name}
                                          </span>
                                          {isAssigned && (
                                            <span className="text-xs text-green-600 font-medium">
                                              Assigned
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}

                            {labelsByCategory["uncategorized"]?.length > 0 && (
                              <div>
                                <h4 className="font-medium text-sm mb-2">
                                  Uncategorized
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {labelsByCategory["uncategorized"].map(
                                    (label) => {
                                      const isAssigned =
                                        assignedLabelIds.includes(label.id);
                                      const isSelected =
                                        selectedLabels.includes(label.id);

                                      return (
                                        <div
                                          key={label.id}
                                          className={`flex items-center gap-2 p-2 rounded transition-all ${
                                            isAssigned
                                              ? "bg-green-50 border-2 border-green-300 cursor-default"
                                              : "hover:bg-gray-50 border-2 border-transparent"
                                          }`}
                                          title={
                                            isAssigned
                                              ? "Already assigned to this project"
                                              : "Click to select"
                                          }
                                        >
                                          {isAssigned ? (
                                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                          ) : (
                                            <Checkbox
                                              checked={isSelected}
                                              onCheckedChange={() =>
                                                handleToggleLabelSelection(
                                                  project.id,
                                                  label.id,
                                                )
                                              }
                                            />
                                          )}
                                          <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{
                                              backgroundColor: label.color,
                                            }}
                                          />
                                          <span
                                            className={`text-sm truncate flex-1 font-medium ${
                                              isAssigned
                                                ? "text-green-700"
                                                : "text-gray-700"
                                            }`}
                                          >
                                            {label.name}
                                          </span>
                                          {isAssigned && (
                                            <span className="text-xs text-green-600 font-medium">
                                              Assigned
                                            </span>
                                          )}
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center">
              {(() => {
                const hasChanges = projects.some((project) => {
                  const selectedLabels =
                    selectedLabelsPerProject[project.id] ||
                    projectLabels[project.id] ||
                    [];
                  const currentLabels = projectLabels[project.id] || [];
                  return (
                    JSON.stringify(selectedLabels.sort()) !==
                    JSON.stringify(currentLabels.sort())
                  );
                });

                if (hasChanges) {
                  const changedCount = projects.filter((project) => {
                    const selectedLabels =
                      selectedLabelsPerProject[project.id] ||
                      projectLabels[project.id] ||
                      [];
                    const currentLabels = projectLabels[project.id] || [];
                    return (
                      JSON.stringify(selectedLabels.sort()) !==
                      JSON.stringify(currentLabels.sort())
                    );
                  }).length;

                  return (
                    <>
                      <div className="text-sm text-muted-foreground">
                        {changedCount} project(s) with unsaved changes
                      </div>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            // Reset all selections to current state
                            const resetSelections: Record<string, string[]> =
                              {};
                            projects.forEach((project) => {
                              resetSelections[project.id] =
                                projectLabels[project.id] || [];
                            });
                            setSelectedLabelsPerProject(resetSelections);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={async () => {
                            const projectsWithChanges = projects.filter(
                              (project) => {
                                const selectedLabels =
                                  selectedLabelsPerProject[project.id] ||
                                  projectLabels[project.id] ||
                                  [];
                                const currentLabels =
                                  projectLabels[project.id] || [];
                                return (
                                  JSON.stringify(selectedLabels.sort()) !==
                                  JSON.stringify(currentLabels.sort())
                                );
                              },
                            );

                            if (projectsWithChanges.length === 0) {
                              toast.info("No changes to save");
                              return;
                            }

                            setAssigningProject("bulk");
                            let successCount = 0;
                            let failCount = 0;

                            for (const project of projectsWithChanges) {
                              try {
                                await handleAssignLabelsToProject(project.id);
                                successCount++;
                              } catch (error) {
                                failCount++;
                                console.error(
                                  "Failed to assign labels to project",
                                  project.id,
                                  error,
                                );
                              }
                            }

                            setAssigningProject(null);

                            if (successCount > 0 && failCount === 0) {
                              toast.success(
                                `Updated ${successCount} project(s) successfully`,
                              );
                            } else if (successCount > 0 && failCount > 0) {
                              toast.warning(
                                `Updated ${successCount} project(s), ${failCount} failed`,
                              );
                            } else {
                              toast.error("Failed to update projects");
                            }
                          }}
                          disabled={assigningProject !== null}
                        >
                          {assigningProject === "bulk" ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Assigning...
                            </>
                          ) : (
                            "Assign"
                          )}
                        </Button>
                      </div>
                    </>
                  );
                } else {
                  return (
                    <>
                      <div className="text-sm text-muted-foreground">
                        Select labels for projects to assign
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsProjectsDialogOpen(false);
                          setExpandedProjects(new Set());
                          setSelectedLabelsPerProject({});
                        }}
                      >
                        Close
                      </Button>
                    </>
                  );
                }
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AIGenerateLabelsDialog
        isOpen={isAIGenerateOpen}
        onClose={() => setIsAIGenerateOpen(false)}
        categories={categories}
        onSuccess={fetchData}
      />

      {/* Move to Category Dialog */}
      <Dialog
        open={moveCategoryDialogOpen}
        onOpenChange={setMoveCategoryDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move Label to Category</DialogTitle>
            <DialogDescription>
              Select a category for "{contextLabel?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <RadioGroup
              value={selectedCategoryForMove || "uncategorized"}
              onValueChange={(value) =>
                setSelectedCategoryForMove(
                  value === "uncategorized" ? null : value,
                )
              }
            >
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <RadioGroupItem
                    value="uncategorized"
                    id="cat-uncategorized"
                  />
                  <UILabel
                    htmlFor="cat-uncategorized"
                    className="flex-1 cursor-pointer font-normal"
                  >
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-gray-400" />
                      <span>Uncategorized</span>
                    </div>
                  </UILabel>
                </div>

                {categories
                  .filter((c) => c.id !== contextLabel?.categoryId)
                  .map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <RadioGroupItem
                        value={category.id}
                        id={`cat-${category.id}`}
                      />
                      <UILabel
                        htmlFor={`cat-${category.id}`}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-gray-500" />
                          <span>{category.name}</span>
                        </div>
                      </UILabel>
                    </div>
                  ))}
              </div>
            </RadioGroup>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setMoveCategoryDialogOpen(false);
                setContextLabel(null);
                setSelectedCategoryForMove(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmMoveCategory}>Move</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign to Projects Dialog */}
      <Dialog
        open={assignProjectsDialogOpen}
        onOpenChange={setAssignProjectsDialogOpen}
      >
        <DialogContent className="max-w-md max-h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign to Projects</DialogTitle>
            <DialogDescription>
              Select projects for "{contextLabel?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {projects.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No projects available
              </div>
            ) : (
              <div className="space-y-2">
                {/* Select All Option */}
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <Checkbox
                    id="select-all-projects"
                    checked={
                      selectedProjectsForAssign.length === projects.length
                    }
                    onCheckedChange={handleSelectAllProjects}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <UILabel
                    htmlFor="select-all-projects"
                    className="flex-1 cursor-pointer font-medium"
                  >
                    Select All ({projects.length})
                  </UILabel>
                </div>

                <div className="h-px bg-gray-200 my-2" />

                {/* Project List */}
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`project-${project.id}`}
                        checked={selectedProjectsForAssign.includes(project.id)}
                        onCheckedChange={() =>
                          handleToggleProjectSelection(project.id)
                        }
                        className="data-[state=checked]:bg-blue-600"
                      />
                      <UILabel
                        htmlFor={`project-${project.id}`}
                        className="font-semibold text-sm text-gray-900 cursor-pointer"
                      >
                        {project.name}
                      </UILabel>
                    </div>
                    {project.description && (
                      <p className="text-xs text-gray-500 mt-1 ml-8 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-sm text-gray-500">
              {selectedProjectsForAssign.length} of {projects.length} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAssignProjectsDialogOpen(false);
                  setContextLabel(null);
                  setSelectedProjectsForAssign([]);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmAssignProjects}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unassign Confirmation Dialog */}
      <Dialog open={unassignConfirmOpen} onOpenChange={setUnassignConfirmOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirm Un-assignment
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to un-assign label "{contextLabel?.name}"
              from the following project(s)?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {projectsToUnassign.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-2 p-2 rounded bg-amber-50 border border-amber-200"
                >
                  <XCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900">
                    {project.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setUnassignConfirmOpen(false);
                setProjectsToUnassign([]);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmUnassign}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Confirm Un-assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
