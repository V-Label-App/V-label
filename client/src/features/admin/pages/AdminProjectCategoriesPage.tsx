import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../../../components/ui/popover";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../../components/ui/table";
import { projectCategoryApi } from "../../../services/project-category.api";
import type { ProjectCategory } from "../../../services/project-category.api";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DeleteCategoryDialog } from "../../../components/admin/DeleteCategoryDialog";

export function AdminProjectCategoriesPage() {
    const [categories, setCategories] = useState<ProjectCategory[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] =
        useState<ProjectCategory | null>(null);

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<ProjectCategory | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const openDeleteDialog = (category: ProjectCategory) => {
        setCategoryToDelete(category);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!categoryToDelete) return;

        setIsDeleting(true);
        try {
            await projectCategoryApi.delete(categoryToDelete.id);
            toast.success("Category deleted successfully");
            setDeleteDialogOpen(false);
            fetchCategories();
        } catch (error: any) {
            console.error("Failed to delete category", error);
            const errorMessage =
                error?.response?.data?.error || "Failed to delete category";
            toast.error(errorMessage);
        } finally {
            setIsDeleting(false);
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

            {/* Categories Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[100px] text-center">Projects</TableHead>
                            <TableHead className="w-[150px] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.map((category) => (
                            <TableRow key={category.id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center">
                                        {category.name}
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {category.description || "No description"}
                                </TableCell>

                                <TableCell className="text-center">
                                    {category._count?.projects && category._count.projects > 0 ? (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer transition-colors">
                                                    {category._count.projects}
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-64 p-3">
                                                <div className="space-y-2">
                                                    <h4 className="font-medium text-sm border-b pb-2 mb-2">Linked Projects</h4>
                                                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                                                        {category.projects?.map((proj) => (
                                                            <div key={proj.id} className="text-sm py-1 px-2 hover:bg-slate-50 rounded truncate" title={proj.name}>
                                                                {proj.name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            0
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditDialog(category)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => openDeleteDialog(category)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {categories.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                    No categories yet. Create one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Delete Confirmation Dialog */}
            <DeleteCategoryDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                category={categoryToDelete}
                onConfirm={handleConfirmDelete}
                isDeleting={isDeleting}
            />


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
