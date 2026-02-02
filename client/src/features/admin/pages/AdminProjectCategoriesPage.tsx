import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { projectCategoryApi } from "../../../services/project-category.api";
import type { ProjectCategory } from "../../../services/project-category.api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

export function AdminProjectCategoriesPage() {
    const [categories, setCategories] = useState<ProjectCategory[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] =
        useState<ProjectCategory | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const fetchCategories = async () => {
        try {
            const data = await projectCategoryApi.getAll();
            setCategories(data);
        } catch (error) {
            console.error("Failed to fetch categories", error);
            toast.error("Failed to load categories");
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const openCreateDialog = () => {
        setEditingCategory(null);
        setName("");
        setDescription("");
        setIsDialogOpen(true);
    };

    const openEditDialog = (category: ProjectCategory) => {
        setEditingCategory(category);
        setName(category.name);
        setDescription(category.description || "");
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            toast.error("Category name is required");
            return;
        }

        try {
            if (editingCategory) {
                // Update
                await projectCategoryApi.update(editingCategory.id, {
                    name,
                    description: description || undefined,
                });
                toast.success("Category updated successfully");
            } else {
                // Create
                await projectCategoryApi.create({
                    name,
                    description: description || undefined,
                });
                toast.success("Category created successfully");
            }

            setIsDialogOpen(false);
            setName("");
            setDescription("");
            fetchCategories();
        } catch (error: any) {
            console.error("Failed to save category", error);
            const errorMessage =
                error?.response?.data?.error || "Failed to save category";
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
        } catch (error: any) {
            console.error("Failed to delete category", error);
            const errorMessage =
                error?.response?.data?.error || "Failed to delete category";
            toast.error(errorMessage);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold">Project Categories</h2>
                    <p className="text-muted-foreground mt-1">
                        Manage project categories for better organization
                    </p>
                </div>
                <Button
                    onClick={openCreateDialog}
                    className="bg-blue-500 hover:bg-blue-600"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Category
                </Button>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                    <Card key={category.id} className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">{category.name}</h3>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {category.description || "No description"}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4 pt-4 border-t">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => openEditDialog(category)}
                            >
                                <Pencil className="w-3 h-3 mr-1" />
                                Edit
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDelete(category)}
                            >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete
                            </Button>
                        </div>
                    </Card>
                ))}

                {categories.length === 0 && (
                    <Card className="p-12 col-span-full text-center">
                        <p className="text-muted-foreground">
                            No categories yet. Create one to get started.
                        </p>
                    </Card>
                )}
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? "Edit Category" : "Create New Category"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingCategory
                                ? "Update category information"
                                : "Add a new project category"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>Category Name *</Label>
                            <Input
                                placeholder="e.g., Medical Imaging"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                placeholder="Describe this category..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setIsDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-blue-500 hover:bg-blue-600"
                                onClick={handleSubmit}
                                disabled={!name.trim()}
                            >
                                {editingCategory ? "Update" : "Create"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
