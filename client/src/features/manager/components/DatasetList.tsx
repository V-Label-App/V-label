import { useState, useEffect } from 'react';
import { Plus, MoreVertical, Trash2, Folder, Image as ImageIcon, Upload } from 'lucide-react';
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { Skeleton } from "../../../components/ui/skeleton";
import { toast } from 'sonner';
import { datasetApi, type Dataset } from '../../../services/dataset.api';
import { DatasetCreateDialog } from './DatasetCreateDialog';
import { UploadImageDialog } from './UploadImageDialog';
import { ProjectGalleryDialog } from './ProjectGalleryDialog';
import { format } from 'date-fns';

interface DatasetListProps {
    projectId: string;
}

export function DatasetList({ projectId }: DatasetListProps) {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [selectedDatasetIdForUpload, setSelectedDatasetIdForUpload] = useState<string | undefined>(undefined);

    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [selectedDatasetIdForGallery, setSelectedDatasetIdForGallery] = useState<string | null | undefined>(undefined);

    const loadDatasets = async () => {
        if (!projectId) return;
        setIsLoading(true);
        try {
            const data = await datasetApi.getProjectDatasets(projectId);
            setDatasets(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load datasets");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDatasets();
    }, [projectId]);

    const handleUploadClick = (datasetId?: string) => {
        setSelectedDatasetIdForUpload(datasetId);
        setIsUploadOpen(true);
    };

    const handleViewGallery = (datasetId?: string | null) => {
        // undefined = all, null = general, string = specific
        setSelectedDatasetIdForGallery(datasetId);
        setIsGalleryOpen(true);
    };

    const handleDelete = async (dataset: Dataset) => {
        if (confirm(`Are you sure you want to delete dataset "${dataset.name}"?`)) {
            try {
                await datasetApi.delete(projectId, dataset.id);
                toast.success("Dataset deleted");
                loadDatasets();
            } catch (error) {
                console.error(error);
                toast.error("Failed to delete dataset");
            }
        }
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[200px] rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Datasets</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage image groups for this project.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => handleViewGallery(undefined)}>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        View Gallery
                    </Button>
                    <Button variant="outline" onClick={() => handleUploadClick()}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Images
                    </Button>
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Dataset
                    </Button>
                </div>
            </div>

            {datasets.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-gray-50 text-center">
                    <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
                        <Folder className="w-8 h-8 text-blue-500" />
                    </div>
                    <h4 className="text-lg font-medium mb-2">No Datasets Yet</h4>
                    <p className="text-sm text-muted-foreground max-w-sm mb-6">
                        Datasets help organize your images into logical groups (e.g., "Training Set", "Validation Set").
                    </p>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => handleViewGallery(undefined)}>
                            View All Images
                        </Button>
                        <Button variant="outline" onClick={() => handleUploadClick()}>
                            Upload Direct to Project
                        </Button>
                        <Button onClick={() => setIsCreateOpen(true)}>
                            Create Your First Dataset
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* General Unorganized Folder Card */}
                    <Card className="hover:shadow-md transition-shadow group border-dashed bg-gray-50/50">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <div className="p-2 bg-gray-200 rounded-lg w-fit mb-2">
                                    <Folder className="w-5 h-5 text-gray-600" />
                                </div>
                            </div>
                            <CardTitle className="text-base text-gray-600">Unorganized</CardTitle>
                            <CardDescription className="line-clamp-2 min-h-[40px]">
                                Images not assigned to any dataset.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter className="pt-3 border-t bg-gray-100/50 text-xs text-muted-foreground flex justify-between items-center">
                            <span>General</span>
                            <Button size="sm" variant="ghost" onClick={() => handleViewGallery(null)}>
                                View
                            </Button>
                        </CardFooter>
                    </Card>

                    {datasets.map((dataset) => (
                        <Card key={dataset.id} className="hover:shadow-md transition-shadow group">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="p-2 bg-blue-50 rounded-lg w-fit mb-2">
                                        <Folder className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="-mr-2 -mt-2">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleViewGallery(dataset.id)}>
                                                <ImageIcon className="w-4 h-4 mr-2" />
                                                View Images
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleUploadClick(dataset.id)}>
                                                <Upload className="w-4 h-4 mr-2" />
                                                Upload Images
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDelete(dataset)} className="text-red-600">
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <CardTitle className="text-base truncate" title={dataset.name}>
                                    {dataset.name}
                                </CardTitle>
                                <CardDescription className="line-clamp-2 min-h-[40px]">
                                    {dataset.description || "No description"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-3">
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <ImageIcon className="w-4 h-4" />
                                        <span>{dataset._count?.images || 0} images</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-3 border-t bg-gray-50/50 text-xs text-muted-foreground flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span>{dataset.source || "Unknown Source"}</span>
                                    <span>{format(new Date(dataset.createdAt), 'MMM dd, yyyy')}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => handleViewGallery(dataset.id)}>
                                        View
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleUploadClick(dataset.id)}>
                                        <Upload className="w-3 h-3" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <DatasetCreateDialog
                projectId={projectId}
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                onSuccess={loadDatasets}
            />

            <UploadImageDialog
                projectId={projectId}
                datasetId={selectedDatasetIdForUpload}
                open={isUploadOpen}
                onOpenChange={setIsUploadOpen}
                onSuccess={loadDatasets}
            />

            <ProjectGalleryDialog
                projectId={projectId}
                initialDatasetId={selectedDatasetIdForGallery}
                open={isGalleryOpen}
                onOpenChange={setIsGalleryOpen}
            />
        </div>
    );
}
