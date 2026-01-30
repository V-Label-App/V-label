import { useState, useEffect } from "react";
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
  DialogTrigger,
  DialogDescription,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { motion } from "framer-motion";
import { projectCategoryApi } from "../../../services/project-category.api";
import type { ProjectCategory } from "../../../services/project-category.api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export function AdminProjectCategoriesPage() {
  const [categories, setCategories] = useState<ProjectCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ProjectCategory | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await projectCategoryApi.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Failed to fetch categories", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      await projectCategoryApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Category created successfully");
      setIsAddDialogOpen(false);
      setName("");
      setDescription("");
      fetchCategories();
    } catch (error: unknown) {
      console.error("Failed to create category", error);
      const errorMessage =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to create category";
      toast.error(errorMessage);
    }
  };

  const handleEdit = async () => {
    if (!editingCategory) return;
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      await projectCategoryApi.update(editingCategory.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Category updated successfully");
      setIsEditDialogOpen(false);
      setEditingCategory(null);
      setName("");
      setDescription("");
      fetchCategories();
    } catch (error: unknown) {
      console.error("Failed to update category", error);
      const errorMessage =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to update category";
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (category: ProjectCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      await projectCategoryApi.delete(category.id);
      toast.success("Category deleted successfully");
      fetchCategories();
    } catch (error: unknown) {
      console.error("Failed to delete category", error);
      const errorMessage =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to delete category";
      toast.error(errorMessage);
    }
  };

  const openEditDialog = (category: ProjectCategory) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || "");
    setIsEditDialogOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Project Categories</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage project categories for better organization
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>
                  Create a new project category
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <input
                    className="w-full px-4 py-2 rounded-md border border-gray-300"
                    placeholder="e.g., Image Classification"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <textarea
                    className="w-full px-4 py-2 rounded-md border border-gray-300"
                    placeholder="Optional description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleCreate}
                >
                  Create Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Loading categories...
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    No categories found
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category, index) => (
                  <motion.tr
                    key={category.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.description || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(category.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => openEditDialog(category)}
                          title="Edit Category"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(category)}
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>
                Name <span className="text-red-500">*</span>
              </Label>
              <input
                className="w-full px-4 py-2 rounded-md border border-gray-300"
                placeholder="e.g., Image Classification"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="w-full px-4 py-2 rounded-md border border-gray-300"
                placeholder="Optional description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleEdit}
            >
              Update Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
