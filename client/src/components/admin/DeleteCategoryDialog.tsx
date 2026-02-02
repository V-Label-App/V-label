import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import type { ProjectCategory } from "../../services/project-category.api";

interface DeleteCategoryDialogProps {
    category: ProjectCategory | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isDeleting?: boolean;
}

export function DeleteCategoryDialog({
    category,
    open,
    onOpenChange,
    onConfirm,
    isDeleting = false,
}: DeleteCategoryDialogProps) {
    if (!category) return null;

    const projectCount = category._count?.projects || 0;
    const hasLinkedProjects = projectCount > 0;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Category?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                        <p>
                            Are you sure you want to delete the category{" "}
                            <span className="font-semibold text-foreground">"{category.name}"</span>?
                        </p>
                        {hasLinkedProjects && (
                            <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm border border-red-200">
                                <strong>Cannot Delete:</strong> This category is currently used by{" "}
                                <strong>{projectCount}</strong> project{projectCount !== 1 ? "s" : ""}.
                                <br />
                                You must remove or reassign all projects from this category before deleting it.
                            </div>
                        )}
                        {!hasLinkedProjects && (
                            <p>This action cannot be undone.</p>
                        )}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                        {hasLinkedProjects ? "Close" : "Cancel"}
                    </AlertDialogCancel>
                    {!hasLinkedProjects && (
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                onConfirm();
                            }}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Delete Category"}
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
