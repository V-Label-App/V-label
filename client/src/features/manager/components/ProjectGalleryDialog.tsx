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
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Loader2, Image as ImageIcon, Trash2, ZoomIn, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
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

    const confirmDelete = (imageId?: string) => {
        if (imageId) {
            setImageToDelete(imageId);
        } else {
            setImageToDelete(null); // Bulk
        }
        setIsDeleteConfirmOpen(true);
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
            <DialogContent className="max-w-[95vw] !max-w-[95vw] w-[95vw] h-[90vh] flex flex-col">
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
                                <div key={img.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all">
                                    <img
                                        src={img.storageUrl}
                                        alt={img.originalFilename}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                        <p className="text-white text-xs truncate font-medium">{img.originalFilename}</p>
                                        <p className="text-white/80 text-[10px]">{formatSize(img.fileSizeBytes)}</p>
                                        {img.dataset && (
                                            <Badge variant="secondary" className="mt-1 w-fit text-[10px] h-4 px-1">{img.dataset.name}</Badge>
                                        )}

                                        <Checkbox
                                            className="absolute top-2 left-2 z-10 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 bg-white/80 border-gray-400"
                                            checked={selectedImages.includes(img.id)}
                                            onCheckedChange={() => toggleSelect(img.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        />

                                        <div className="absolute top-2 right-2 flex gap-1">
                                            <Button size="icon" variant="destructive" className="h-6 w-6" onClick={(e) => {
                                                e.stopPropagation();
                                                confirmDelete(img.id);
                                            }}>
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                            <Button size="icon" variant="secondary" className="h-6 w-6" onClick={() => setPreviewImage(img)}>
                                                <ZoomIn className="w-3 h-3" />
                                            </Button>
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
            {/* Confirmation Dialog */}
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
        </Dialog>
    );
}
