import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label as UILabel } from "./ui/label";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import {
  Plus,
  Trash2,
  Tag,
  Edit2,
  FolderOpen,
  Loader2,
  Globe,
  Lock,
  AlertTriangle,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  labelApi,
  labelCategoryApi,
  type Label,
  type LabelCategory,
} from "../services/label.api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface LabelManagementProps {
  open: boolean;
  onClose: () => void;
}

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

export function LabelManagement({ open, onClose }: LabelManagementProps) {
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

  // Category form state
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LabelCategory | null>(
    null,
  );
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  // Filter state
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGlobal, setFilterGlobal] = useState<string>("all");

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

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!open) return;
    setIsLoading(true);
    try {
      const [labelsData, categoriesData] = await Promise.all([
        labelApi.getAll(),
        labelCategoryApi.getAll(),
      ]);
      setLabels(labelsData);
      setCategories(categoriesData);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [open]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter labels
  const filteredLabels = labels.filter((label) => {
    const matchesSearch = label.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "all" ||
      label.categoryId === filterCategory ||
      (filterCategory === "none" && !label.categoryId);
    const matchesGlobal =
      filterGlobal === "all" ||
      (filterGlobal === "global" && label.isGlobal) ||
      (filterGlobal === "local" && !label.isGlobal);
    return matchesSearch && matchesCategory && matchesGlobal;
  });

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
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save label");
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
  };

  const openEditLabel = (label: Label) => {
    setEditingLabel(label);
    setLabelName(label.name);
    setLabelColor(label.color);
    setLabelCategory(label.categoryId || "");
    setIsGlobal(label.isGlobal);
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
        } catch (error: any) {
          toast.error(error.response?.data?.error || "Failed to delete label");
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
        });
        toast.success("Category updated successfully");
      } else {
        await labelCategoryApi.create({
          name: categoryName,
          description: categoryDescription || undefined,
        });
        toast.success("Category created successfully");
      }
      await fetchData();
      resetCategoryForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save category");
    } finally {
      setIsLoading(false);
    }
  };

  const resetCategoryForm = () => {
    setCategoryName("");
    setCategoryDescription("");
    setEditingCategory(null);
    setIsAddCategoryOpen(false);
  };

  const openEditCategory = (category: LabelCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || "");
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
        } catch (error: any) {
          toast.error(
            error.response?.data?.error || "Failed to delete category",
          );
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const getCategoryById = (categoryId: string | null) => {
    if (!categoryId) return null;
    return categories.find((c) => c.id === categoryId);
  };

  const getLabelCountByCategory = (categoryId: string) => {
    return labels.filter((l) => l.categoryId === categoryId).length;
  };

  // Multi-select functions
  const toggleLabelSelection = (labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedLabelIds.length === filteredLabels.length) {
      setSelectedLabelIds([]);
    } else {
      setSelectedLabelIds(filteredLabels.map((l) => l.id));
    }
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
          } catch (error: any) {
            failCount++;
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
  }, [filterCategory, filterGlobal, searchQuery]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-xl">Label Management</DialogTitle>
            <DialogDescription>
              Create and manage label categories and labels for your annotation
              projects
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 px-6 pt-4 bg-gray-50/50">
            <button
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                view === "labels"
                  ? "bg-white text-blue-600 border border-b-white -mb-px relative z-10"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setView("labels")}
            >
              <Tag className="w-4 h-4 inline mr-2" />
              Labels ({labels.length})
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                view === "categories"
                  ? "bg-white text-blue-600 border border-b-white -mb-px relative z-10"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setView("categories")}
            >
              <FolderOpen className="w-4 h-4 inline mr-2" />
              Categories ({categories.length})
            </button>
          </div>

          <div className="flex-1 overflow-hidden bg-white border-t -mt-px">
            {isLoading && !labels.length && !categories.length ? (
              <div className="flex-1 flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Labels View */}
                {view === "labels" && (
                  <div className="h-full flex flex-col">
                    {/* Toolbar */}
                    <div className="px-6 py-4 border-b bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1 max-w-xs">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Search labels..."
                            value={searchQuery}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9"
                          />
                        </div>
                        <Select
                          value={filterCategory}
                          onValueChange={setFilterCategory}
                        >
                          <SelectTrigger className="w-[150px] h-9">
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="none">Uncategorized</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={filterGlobal}
                          onValueChange={setFilterGlobal}
                        >
                          <SelectTrigger className="w-[130px] h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="global">Global</SelectItem>
                            <SelectItem value="local">Local</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex-1" />
                        <Button
                          size="sm"
                          onClick={() => setIsAddLabelOpen(true)}
                          disabled={isLoading}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          New Label
                        </Button>
                      </div>

                      {/* Selection bar */}
                      {filteredLabels.length > 0 && (
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                          <Checkbox
                            checked={
                              selectedLabelIds.length ===
                                filteredLabels.length &&
                              filteredLabels.length > 0
                            }
                            onCheckedChange={toggleSelectAll}
                            className="data-[state=checked]:bg-blue-600"
                          />
                          <span className="text-sm text-gray-600">
                            {selectedLabelIds.length > 0
                              ? `${selectedLabelIds.length} selected`
                              : `Select all`}
                          </span>
                          {selectedLabelIds.length > 0 && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleBulkDelete}
                              disabled={isDeleting}
                              className="ml-auto h-8"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3 mr-1" />
                              )}
                              Delete ({selectedLabelIds.length})
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Labels List */}
                    <div className="flex-1 overflow-auto px-6 py-4">
                      {filteredLabels.length > 0 ? (
                        <div className="space-y-2">
                          {filteredLabels.map((label) => {
                            const category = getCategoryById(label.categoryId);
                            const isSelected = selectedLabelIds.includes(
                              label.id,
                            );

                            return (
                              <div
                                key={label.id}
                                className={`flex items-center gap-4 p-3 rounded-lg border transition-all hover:shadow-sm ${
                                  isSelected
                                    ? "bg-blue-50 border-blue-200"
                                    : "bg-white border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    toggleLabelSelection(label.id)
                                  }
                                  className="data-[state=checked]:bg-blue-600"
                                />

                                {/* Color dot */}
                                <div
                                  className="w-5 h-5 rounded-full flex-shrink-0 ring-2 ring-white shadow"
                                  style={{ backgroundColor: label.color }}
                                />

                                {/* Label info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">
                                      {label.name}
                                    </span>
                                    {label.isGlobal ? (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100"
                                      >
                                        <Globe className="w-3 h-3 mr-1" />
                                        Global
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-100"
                                      >
                                        <Lock className="w-3 h-3 mr-1" />
                                        Local
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                    {category && (
                                      <>
                                        <span className="flex items-center gap-1">
                                          <FolderOpen className="w-3 h-3" />
                                          {category.name}
                                        </span>
                                        <span>•</span>
                                      </>
                                    )}
                                    {label.creator && (
                                      <span>
                                        by{" "}
                                        {label.creator.fullName ||
                                          label.creator.email}
                                      </span>
                                    )}
                                    {label._count?.projectLabels !==
                                      undefined &&
                                      label._count.projectLabels > 0 && (
                                        <>
                                          <span>•</span>
                                          <span>
                                            {label._count.projectLabels} project
                                            {label._count.projectLabels !== 1
                                              ? "s"
                                              : ""}
                                          </span>
                                        </>
                                      )}
                                  </div>
                                </div>

                                {/* Actions */}
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
                                      onClick={() => openEditLabel(label)}
                                    >
                                      <Edit2 className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleDeleteLabel(label.id)
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
                          <Tag className="w-12 h-12 mb-4 opacity-30" />
                          <p className="font-medium">No labels found</p>
                          <p className="text-sm mt-1">
                            Create a new label to get started
                          </p>
                          <Button
                            className="mt-4"
                            size="sm"
                            onClick={() => setIsAddLabelOpen(true)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Create Label
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Categories View */}
                {view === "categories" && (
                  <div className="h-full flex flex-col">
                    {/* Toolbar */}
                    <div className="px-6 py-4 border-b bg-gray-50/50 flex justify-between items-center">
                      <p className="text-sm text-gray-600">
                        Organize your labels into categories for better
                        management
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setIsAddCategoryOpen(true)}
                        disabled={isLoading}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        New Category
                      </Button>
                    </div>

                    {/* Categories List */}
                    <div className="flex-1 overflow-auto px-6 py-4">
                      {categories.length > 0 ? (
                        <div className="space-y-2">
                          {categories.map((category) => {
                            const labelCount = getLabelCountByCategory(
                              category.id,
                            );

                            return (
                              <div
                                key={category.id}
                                className="flex items-center gap-4 p-4 rounded-lg border bg-white border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm"
                              >
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                  <FolderOpen className="w-5 h-5 text-gray-500" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">
                                      {category.name}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {labelCount} label
                                      {labelCount !== 1 ? "s" : ""}
                                    </Badge>
                                  </div>
                                  {category.description && (
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                                      {category.description}
                                    </p>
                                  )}
                                  {category.creator?.fullName && (
                                    <p className="text-sm text-gray-500 mt-1">
                                      Created by: {category.creator.fullName}
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
                          <FolderOpen className="w-12 h-12 mb-4 opacity-30" />
                          <p className="font-medium">No categories yet</p>
                          <p className="text-sm mt-1">
                            Create a category to organize your labels
                          </p>
                          <Button
                            className="mt-4"
                            size="sm"
                            onClick={() => setIsAddCategoryOpen(true)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Create Category
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50/50 flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <UILabel>Category (Optional)</UILabel>
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
            </div>

            <div className="space-y-2">
              <UILabel>Color *</UILabel>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      labelColor === color
                        ? "border-gray-900 scale-110 ring-2 ring-gray-900/20"
                        : "border-white shadow"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setLabelColor(color)}
                  />
                ))}
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
    </>
  );
}
