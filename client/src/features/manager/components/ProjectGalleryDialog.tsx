import { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { projectApi } from '../../../services/project.api';
import { datasetApi, type Dataset } from '../../../services/dataset.api';
import { Loader2, Image as ImageIcon, Trash2, ZoomIn, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../../../components/ui/badge';
import { Checkbox } from "../../../components/ui/checkbox";
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

interface ProjectGalleryDialogProps {
    projectId: string;
    initialDatasetId?: string | null; // null for 'General', undefined for All, string for specific
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ImageRecord {
    id: string;
    storageUrl: string;
    originalFilename: string;
    datasetId: string | null;
    dataset?: { name: string };
    fileSizeBytes: string;
    uploadedAt: string;
}

interface AssignmentInfo {
    imageId: string;
    taskId: string;
    filename: string;
    storageUrl: string;
    assignments: Array<{
        assignmentId: string;
        status: string;
        annotatorId: string;
        annotatorName: string;
    }>;
}

interface AssignmentCheckResult {
    assigned: AssignmentInfo[];
    unassigned: string[];
}

export function ProjectGalleryDialog({ projectId, initialDatasetId, open, onOpenChange }: ProjectGalleryDialogProps) {
    const [images, setImages] = useState<ImageRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [datasets, setDatasets] = useState<Dataset[]>([]);

    // Filter State
    // "all" = undefined in API
    // "general" = "null" in API
    // "uuid" = "uuid" in API
    const [selectedFilter, setSelectedFilter] = useState<string>("all");

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 50;

    // Preview
    const [previewImage, setPreviewImage] = useState<ImageRecord | null>(null);

    // Selection
    const [selectedImages, setSelectedImages] = useState<string[]>([]);

    // Confirmation
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [imageToDelete, setImageToDelete] = useState<string | null>(null); // If null, means bulk delete

    // Assignment Check Dialog
    const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
    const [assignmentCheckResult, setAssignmentCheckResult] = useState<AssignmentCheckResult | null>(null);
    const [isProcessingSelected, setIsProcessingSelected] = useState(false);
    const [isProcessingAll, setIsProcessingAll] = useState(false);
    const [isProcessingUnassigned, setIsProcessingUnassigned] = useState(false);
    const [selectedAssignedImages, setSelectedAssignedImages] = useState<string[]>([]); // Track which assigned images to unassign & delete

    // Initialize Filter from props
    useEffect(() => {
        if (open) {
            if (initialDatasetId === null) setSelectedFilter("general");
            else if (initialDatasetId) setSelectedFilter(initialDatasetId);
            else setSelectedFilter("all");

            // Load datasets for filter dropdown
            datasetApi.getProjectDatasets(projectId).then(setDatasets).catch(console.error);
        }
    }, [open, initialDatasetId, projectId]);

    const loadImages = useCallback(async () => {
        if (!open) return;
        setIsLoading(true);
        try {
            let apiDatasetId: string | 'null' | undefined = undefined;
            if (selectedFilter === 'general') apiDatasetId = 'null';
            else if (selectedFilter !== 'all') apiDatasetId = selectedFilter;

            const res = await projectApi.getImages(projectId, {
                page,
                limit: LIMIT,
                datasetId: apiDatasetId
            });

            setImages(res.data);
            setTotalPages(res.meta.totalPages);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load images");
        } finally {
            setIsLoading(false);
        }
    }, [projectId, page, selectedFilter, open]);

    useEffect(() => {
        loadImages();
    }, [loadImages]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [selectedFilter]);

    const confirmDelete = async (imageId?: string) => {
        const imageIds = imageId ? [imageId] : selectedImages;
        
        if (imageIds.length === 0) return;

        try {
            // Check which images have assignments
            const result = await projectApi.checkImageAssignments(projectId, imageIds);
            
            if (result.assigned.length === 0) {
                // No assignments, proceed with normal deletion
                if (imageId) {
                    setImageToDelete(imageId);
                } else {
                    setImageToDelete(null); // Bulk
                }
                setIsDeleteConfirmOpen(true);
            } else {
                // Has assignments, show assignment dialog
                setAssignmentCheckResult(result);
                setImageToDelete(imageId || null);
                // Pre-select all assigned images by default
                setSelectedAssignedImages(result.assigned.map(a => a.imageId));
                setIsAssignmentDialogOpen(true);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to check image assignments");
        }
    };

    const handleDelete = async () => {
        try {
            if (imageToDelete) {
                // Single Delete
                await projectApi.deleteImage(projectId, imageToDelete);
                setImages(prev => prev.filter(img => img.id !== imageToDelete));
                if (previewImage?.id === imageToDelete) setPreviewImage(null);
                setSelectedImages(prev => prev.filter(id => id !== imageToDelete));
            } else {
                // Bulk Delete
                await projectApi.deleteImages(projectId, selectedImages);
                setImages(prev => prev.filter(img => !selectedImages.includes(img.id)));
                if (previewImage && selectedImages.includes(previewImage.id)) setPreviewImage(null);
                setSelectedImages([]);
            }
            toast.success("Deleted successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete");
        } finally {
            setIsDeleteConfirmOpen(false);
            setImageToDelete(null);
        }
    };

    // Handle unassign and delete all assigned images
    const handleUnassignAndDelete = async () => {
        if (!assignmentCheckResult) return;
        
        setIsProcessingAll(true);
        try {
            // First, unassign all tasks
            const taskIds = assignmentCheckResult.assigned.map(a => a.taskId);
            await projectApi.bulkUnassignTasks(projectId, taskIds);
            
            // Then delete all images (assigned + unassigned)
            const allImageIds = [
                ...assignmentCheckResult.assigned.map(a => a.imageId),
                ...assignmentCheckResult.unassigned
            ];
            await projectApi.deleteImages(projectId, allImageIds);
            
            // Update UI
            setImages(prev => prev.filter(img => !allImageIds.includes(img.id)));
            if (previewImage && allImageIds.includes(previewImage.id)) setPreviewImage(null);
            setSelectedImages([]);
            
            toast.success(`Unassigned and deleted ${allImageIds.length} image(s) successfully`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to unassign and delete images");
        } finally {
            setIsProcessingAll(false);
            setIsAssignmentDialogOpen(false);
            setAssignmentCheckResult(null);
            setImageToDelete(null);
            setSelectedAssignedImages([]);
        }
    };

    // Handle unassign and delete selected assigned images
    const handleUnassignSelectedAndDelete = async () => {
        if (!assignmentCheckResult) return;
        
        if (selectedAssignedImages.length === 0 && assignmentCheckResult.unassigned.length === 0) {
            toast.info("Please select at least one image");
            return;
        }
        
        setIsProcessingSelected(true);
        try {
            // Get task IDs for selected assigned images
            const tasksToUnassign = assignmentCheckResult.assigned
                .filter(a => selectedAssignedImages.includes(a.imageId))
                .map(a => a.taskId);
            
            // Unassign selected tasks
            if (tasksToUnassign.length > 0) {
                await projectApi.bulkUnassignTasks(projectId, tasksToUnassign);
            }
            
            // Delete selected assigned images + all unassigned images
            const imagesToDelete = [
                ...selectedAssignedImages,
                ...assignmentCheckResult.unassigned
            ];
            
            if (imagesToDelete.length > 0) {
                await projectApi.deleteImages(projectId, imagesToDelete);
            }
            
            // Update UI
            setImages(prev => prev.filter(img => !imagesToDelete.includes(img.id)));
            if (previewImage && imagesToDelete.includes(previewImage.id)) setPreviewImage(null);
            setSelectedImages([]);
            
            const unassignCount = selectedAssignedImages.length;
            const totalCount = imagesToDelete.length;
            toast.success(`Unassigned ${unassignCount} and deleted ${totalCount} image(s) successfully`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to unassign and delete images");
        } finally {
            setIsProcessingSelected(false);
            setIsAssignmentDialogOpen(false);
            setAssignmentCheckResult(null);
            setImageToDelete(null);
            setSelectedAssignedImages([]);
        }
    };

    // Handle delete only unassigned images
    const handleDeleteUnassignedOnly = async () => {
        if (!assignmentCheckResult) return;
        
        setIsProcessingUnassigned(true);
        try {
            if (assignmentCheckResult.unassigned.length === 0) {
                toast.info("No unassigned images to delete");
                return;
            }
            
            // Delete only unassigned images
            await projectApi.deleteImages(projectId, assignmentCheckResult.unassigned);
            
            // Update UI
            setImages(prev => prev.filter(img => !assignmentCheckResult.unassigned.includes(img.id)));
            if (previewImage && assignmentCheckResult.unassigned.includes(previewImage.id)) setPreviewImage(null);
            setSelectedImages(prev => prev.filter(id => !assignmentCheckResult.unassigned.includes(id)));
            
            toast.success(`Deleted ${assignmentCheckResult.unassigned.length} unassigned image(s)`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete unassigned images");
        } finally {
            setIsProcessingUnassigned(false);
            setIsAssignmentDialogOpen(false);
            setAssignmentCheckResult(null);
            setImageToDelete(null);
            setSelectedAssignedImages([]);
        }
    };

    const toggleAssignedImage = (imageId: string) => {
        setSelectedAssignedImages(prev =>
            prev.includes(imageId) ? prev.filter(id => id !== imageId) : [...prev, imageId]
        );
    };

    const toggleSelectAllAssigned = () => {
        if (!assignmentCheckResult) return;
        if (selectedAssignedImages.length === assignmentCheckResult.assigned.length) {
            setSelectedAssignedImages([]);
        } else {
            setSelectedAssignedImages(assignmentCheckResult.assigned.map(a => a.imageId));
        }
    };

    const toggleSelectAll = () => {
        if (selectedImages.length === images.length && images.length > 0) {
            setSelectedImages([]);
        } else {
            setSelectedImages(images.map(img => img.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedImages(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const formatSize = (bytesStr: string) => {
        const bytes = parseInt(bytesStr);
        if (isNaN(bytes)) return '? B';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-[95vw] w-[95vw] h-[90vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle>Project Gallery</DialogTitle>
                            <DialogDescription>
                                {selectedImages.length > 0
                                    ? <span className="text-blue-600 font-medium">{selectedImages.length} selected</span>
                                    : "View all images in your project"}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedImages.length > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => confirmDelete()}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete ({selectedImages.length})
                                </Button>
                            )}

                            <div className="flex items-center gap-2 border-l pl-4 ml-2">
                                <Checkbox
                                    checked={images.length > 0 && selectedImages.length === images.length}
                                    onCheckedChange={toggleSelectAll}
                                    id="select-all"
                                />
                                <label htmlFor="select-all" className="text-sm cursor-pointer select-none">
                                    All
                                </label>
                            </div>

                            <div className="h-6 w-px bg-gray-200 mx-2" />

                            <Filter className="w-4 h-4 text-muted-foreground" />
                            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by Dataset" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Images</SelectItem>
                                    <SelectItem value="general">Unorganized (General)</SelectItem>
                                    {datasets.map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto min-h-[400px] border rounded-md bg-gray-50/50 p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : images.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                            <p>No images found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4">
                            {images.map(img => (
                                <div
                                    key={img.id}
                                    className={`
                                        group relative rounded-lg overflow-hidden border transition-all
                                        ${selectedImages.includes(img.id) ? 'ring-2 ring-blue-600 border-transparent bg-blue-50/10' : 'hover:ring-2 hover:ring-gray-300 bg-white'}
                                    `}
                                >
                                    <div className="aspect-square relative bg-gray-100 overflow-hidden">
                                        <img
                                            src={img.storageUrl}
                                            alt={img.originalFilename}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />

                                        {/* Overlay for Actions */}
                                        <div className={`
                                            absolute inset-0 bg-black/10 transition-opacity flex flex-col justify-between p-2
                                            ${selectedImages.includes(img.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                        `}>
                                            <div className="flex justify-between items-start">
                                                <Checkbox
                                                    className={`
                                                        data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 bg-white/90 border-gray-400 shadow-sm
                                                    `}
                                                    checked={selectedImages.includes(img.id)}
                                                    onCheckedChange={() => toggleSelect(img.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="flex gap-1 ml-auto">
                                                    <Button size="icon" variant="destructive" className="h-6 w-6 shadow-sm" onClick={(e) => {
                                                        e.stopPropagation();
                                                        confirmDelete(img.id);
                                                    }}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                    <Button size="icon" variant="secondary" className="h-6 w-6 shadow-sm bg-white/90 hover:bg-white" onClick={() => setPreviewImage(img)}>
                                                        <ZoomIn className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info Below Image */}
                                    <div className="p-2 border-t bg-white">
                                        <p className="text-xs font-medium text-gray-900 truncate" title={img.originalFilename}>
                                            {img.originalFilename}
                                        </p>
                                        <div className="flex items-center justify-between mt-1">
                                            <p className="text-[10px] text-muted-foreground">{formatSize(img.fileSizeBytes)}</p>
                                            {img.dataset && (
                                                <Badge variant="secondary" className="text-[10px] h-4 px-1">{img.dataset.name}</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination Footer */}
                <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>

                {/* Preview Overlay */}
                {previewImage && (
                    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col animate-in fade-in duration-200">
                        <div className="flex items-center justify-between p-4 text-white">
                            <div>
                                <h3 className="font-medium">{previewImage.originalFilename}</h3>
                                <p className="text-sm opacity-70">
                                    {previewImage.dataset ? previewImage.dataset.name : "Unorganized"} • {new Date(previewImage.uploadedAt).toLocaleString()}
                                </p>
                            </div>
                            <Button variant="ghost" className="text-white hover:bg-white/20 rounded-full" onClick={() => setPreviewImage(null)}>
                                <X className="w-6 h-6" />
                            </Button>
                        </div>
                        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                            <img
                                src={previewImage.storageUrl}
                                alt={previewImage.originalFilename}
                                className="max-w-full max-h-full object-contain shadow-2xl"
                            />
                        </div>
                    </div>
                )}
            </DialogContent>
            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {imageToDelete
                                ? "This action cannot be undone. This will permanently delete the selected image."
                                : `This action cannot be undone. This will permanently delete ${selectedImages.length} images.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Assignment Warning Dialog */}
            <AlertDialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
                <AlertDialogContent className="!max-w-7xl w-[50vw]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Images Are Assigned</AlertDialogTitle>
                        <AlertDialogDescription>
                            {assignmentCheckResult && (
                                <>
                                    {assignmentCheckResult.assigned.length === 1 && assignmentCheckResult.unassigned.length === 0 ? (
                                        <span>This image is currently assigned to an annotator and cannot be deleted directly.</span>
                                    ) : assignmentCheckResult.unassigned.length === 0 ? (
                                        <span>{assignmentCheckResult.assigned.length} images are currently assigned to annotators and cannot be deleted directly.</span>
                                    ) : (
                                        <span>
                                            {assignmentCheckResult.assigned.length} image(s) are assigned to annotators and {assignmentCheckResult.unassigned.length} image(s) are unassigned.
                                        </span>
                                    )}
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {/* Show assigned images details */}
                    {assignmentCheckResult && assignmentCheckResult.assigned.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded">
                                <Checkbox
                                    checked={selectedAssignedImages.length === assignmentCheckResult.assigned.length}
                                    onCheckedChange={toggleSelectAllAssigned}
                                    id="select-all-assigned"
                                />
                                <label htmlFor="select-all-assigned" className="text-sm font-medium cursor-pointer select-none">
                                    Select all assigned images ({assignmentCheckResult.assigned.length})
                                </label>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto border rounded-md p-4 space-y-3 bg-gray-50">
                                {assignmentCheckResult.assigned.map((item) => (
                                    <div key={item.imageId} className="flex items-start gap-3 p-3 bg-white rounded border hover:border-blue-300 transition-colors">
                                        <Checkbox
                                            checked={selectedAssignedImages.includes(item.imageId)}
                                            onCheckedChange={() => toggleAssignedImage(item.imageId)}
                                            className="mt-1"
                                        />
                                        <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 border flex-shrink-0">
                                            <img
                                                src={item.storageUrl}
                                                alt={item.filename}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{item.filename}</p>
                                            <div className="mt-1 space-y-1">
                                                {item.assignments.map((assignment, idx) => (
                                                    <p key={idx} className="text-xs text-muted-foreground">
                                                        <span className="font-medium">Assigned to:</span> {assignment.annotatorName}
                                                        <span className="ml-2 text-blue-600">({assignment.status})</span>
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="text-sm text-muted-foreground mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                        {assignmentCheckResult && (
                            <>
                                {assignmentCheckResult.unassigned.length > 0 && (
                                    <p className="mb-2">
                                        ✓ <strong>{assignmentCheckResult.unassigned.length}</strong> unassigned image(s) will be deleted
                                    </p>
                                )}
                                <p>
                                    {selectedAssignedImages.length === 0 ? (
                                        <span>⚠️ No assigned images selected. Select images above to unassign and delete them.</span>
                                    ) : (
                                        <span>✓ <strong>{selectedAssignedImages.length}</strong> assigned image(s) will be unassigned and deleted</span>
                                    )}
                                </p>
                            </>
                        )}
                    </div>

                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel 
                            onClick={() => {
                                setIsAssignmentDialogOpen(false);
                                setAssignmentCheckResult(null);
                                setImageToDelete(null);
                                setSelectedAssignedImages([]);
                            }}
                            disabled={isProcessingSelected || isProcessingAll || isProcessingUnassigned}
                        >
                            Cancel
                        </AlertDialogCancel>
                        
                        {assignmentCheckResult && assignmentCheckResult.unassigned.length > 0 && selectedAssignedImages.length === 0 && (
                            <Button
                                onClick={handleDeleteUnassignedOnly}
                                disabled={isProcessingUnassigned || isProcessingSelected || isProcessingAll}
                                variant="outline"
                                className="gap-2"
                            >
                                {isProcessingUnassigned ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>Delete Only Unassigned ({assignmentCheckResult.unassigned.length})</>
                                )}
                            </Button>
                        )}

                        <Button
                            onClick={handleUnassignSelectedAndDelete}
                            disabled={isProcessingSelected || isProcessingAll || isProcessingUnassigned || (selectedAssignedImages.length === 0 && (!assignmentCheckResult || assignmentCheckResult.unassigned.length === 0))}
                            variant="destructive"
                            className="gap-2"
                        >
                            {isProcessingSelected ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Unassign & Delete Selected
                                    {assignmentCheckResult && ` (${selectedAssignedImages.length + assignmentCheckResult.unassigned.length})`}
                                </>
                            )}
                        </Button>
                        
                        <Button
                            onClick={handleUnassignAndDelete}
                            disabled={isProcessingAll || isProcessingSelected || isProcessingUnassigned || Boolean(assignmentCheckResult && selectedAssignedImages.length !== assignmentCheckResult.assigned.length)}
                            variant="outline"
                            className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                        >
                            {isProcessingAll ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Unassign & Delete All
                                    {assignmentCheckResult && ` (${assignmentCheckResult.assigned.length + assignmentCheckResult.unassigned.length})`}
                                </>
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
