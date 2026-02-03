import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Progress } from "../../../components/ui/progress";
import { Upload, X, FileImage, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { projectApi } from '../../../services/project.api';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { datasetApi, type Dataset } from '../../../services/dataset.api';
import { useEffect } from 'react';

interface UploadImageDialogProps {
    projectId: string;
    datasetId?: string; // If provided, pre-select this dataset and maybe lock it?
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface FileWithPreview extends File {
    preview?: string;
}

interface UploadProgress {
    fileName: string;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error' | 'duplicate';
    error?: string;
    existingImageUrl?: string;
}

export function UploadImageDialog({ projectId, datasetId: initialDatasetId, open, onOpenChange, onSuccess }: UploadImageDialogProps) {
    const [files, setFiles] = useState<FileWithPreview[]>([]);
    const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
    const [isUploading, setIsUploading] = useState(false);
    const [selectedDatasetId, setSelectedDatasetId] = useState<string | "general">(initialDatasetId || "general");
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [overallProgress, setOverallProgress] = useState(0);

    // Fetch datasets for selection
    useEffect(() => {
        if (open && projectId) {
            datasetApi.getProjectDatasets(projectId).then(setDatasets).catch(console.error);
        }
    }, [open, projectId]);

    useEffect(() => {
        if (initialDatasetId) {
            setSelectedDatasetId(initialDatasetId);
        }
    }, [initialDatasetId]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles = acceptedFiles.map(file => Object.assign(file, {
            preview: URL.createObjectURL(file)
        }));
        setFiles(prev => [...prev, ...newFiles]);
    }, []);

    // Reset progress when dialog closes or opens
    useEffect(() => {
        if (!open) {
            setOverallProgress(0);
            setUploadProgress({});
            setIsUploading(false);
        }
    }, [open]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp']
        }
    });

    const removeFile = (fileToRemove: FileWithPreview) => {
        setFiles(files.filter(f => f !== fileToRemove));
        if (fileToRemove.preview) {
            URL.revokeObjectURL(fileToRemove.preview);
        }
    };

    const handleUpload = async () => {
        setIsUploading(true);
        setOverallProgress(0);
        const targetDatasetId = selectedDatasetId === "general" ? undefined : selectedDatasetId;

        // Initialize progress
        const initialProgress: Record<string, UploadProgress> = {};
        files.forEach(file => {
            initialProgress[file.name] = {
                fileName: file.name,
                progress: 0,
                status: 'pending'
            };
        });
        setUploadProgress(initialProgress);

        let successCount = 0;
        let failCount = 0;
        let duplicateCount = 0;
        const totalFiles = files.length;

        // Process sequentially to be safe (or parallel with limit)
        for (const file of files) {
            setUploadProgress(prev => ({
                ...prev,
                [file.name]: { ...prev[file.name], status: 'uploading', progress: 10 }
            }));

            try {
                await projectApi.uploadImage(projectId, file, targetDatasetId);

                setUploadProgress(prev => ({
                    ...prev,
                    [file.name]: { ...prev[file.name], status: 'completed', progress: 100 }
                }));
                successCount++;
            } catch (error: any) {
                console.error(`Failed to upload ${file.name}`, error);

                // Handle Duplicate
                if (error.response?.status === 409) {
                    duplicateCount++;
                    setUploadProgress(prev => ({
                        ...prev,
                        [file.name]: {
                            ...prev[file.name],
                            status: 'duplicate',
                            error: 'Duplicate image skipped',
                            existingImageUrl: error.response?.data?.existingImageUrl
                        }
                    }));
                } else {
                    failCount++;
                    setUploadProgress(prev => ({
                        ...prev,
                        [file.name]: { ...prev[file.name], status: 'error', error: 'Upload failed' }
                    }));
                }
            } finally {
                // Update overall progress
                const processed = successCount + failCount + duplicateCount;
                setOverallProgress(Math.round((processed / totalFiles) * 100));
            }
        }

        setIsUploading(false);

        // Summary Toast
        const parts = [];
        if (successCount > 0) parts.push(`${successCount} uploaded`);
        if (duplicateCount > 0) parts.push(`${duplicateCount} duplicates skipped`);
        if (failCount > 0) parts.push(`${failCount} failed`);

        if (failCount === 0 && duplicateCount === 0) {
            toast.success("All images uploaded successfully!");
            setFiles([]);
            onSuccess();
            onOpenChange(false);
        } else {
            toast(parts.join(", "), {
                description: "Review the list to see skipped files.",
                action: {
                    label: "Close",
                    onClick: () => console.log("Undo")
                },
            });
            // If some succeeded, still refresh the list behind
            if (successCount > 0) onSuccess();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Upload Images</DialogTitle>
                    <DialogDescription>
                        Upload images to your project. Supports JPG, PNG, WebP.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                    {/* Dataset Selection */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Target Dataset</label>
                        <Select
                            value={selectedDatasetId}
                            onValueChange={setSelectedDatasetId}
                            disabled={!!initialDatasetId || isUploading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select dataset" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="general">General (No Dataset)</SelectItem>
                                {datasets.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Overall Progress */}
                    {isUploading && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Overall Progress</span>
                                <span>{overallProgress}%</span>
                            </div>
                            <Progress value={overallProgress} className="h-2" />
                        </div>
                    )}

                    {/* Dropzone */}
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
                            } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <input {...getInputProps()} />
                        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                        <p className="text-sm font-medium">Drag & drop images here, or click to select</p>
                        <p className="text-xs text-muted-foreground mt-2">Max file size: 10MB</p>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                <span className="text-xs font-medium text-muted-foreground">{files.length} files selected</span>
                                <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="h-6 text-xs text-red-500 hover:text-red-600" disabled={isUploading}>
                                    Clear all
                                </Button>
                            </div>
                            <ScrollArea className="h-[200px] w-full rounded-md border p-2">
                                <div className="space-y-2">
                                    {files.map((file, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 bg-white border rounded-md group">
                                            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-100 table-cell align-middle text-center border">
                                                {file.preview ? (
                                                    <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <FileImage className="w-5 h-5 mx-auto mt-2.5 text-gray-400" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                                                    {uploadProgress[file.name]?.status === 'duplicate' && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-orange-500 font-medium">Duplicate</span>
                                                            {uploadProgress[file.name]?.existingImageUrl && (
                                                                <div className="flex items-center gap-1 bg-orange-50 px-1 py-0.5 rounded border border-orange-100">
                                                                    <span className="text-[10px] text-orange-700">Existing:</span>
                                                                    <img
                                                                        src={uploadProgress[file.name].existingImageUrl}
                                                                        alt="Existing"
                                                                        className="w-6 h-6 object-cover rounded border"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {uploadProgress[file.name]?.status === 'error' && (
                                                        <span className="text-xs text-red-500 font-medium">Failed</span>
                                                    )}
                                                    {uploadProgress[file.name]?.status === 'completed' && (
                                                        <span className="text-xs text-green-600 font-medium">Done</span>
                                                    )}
                                                </div>

                                                {uploadProgress[file.name] ? (
                                                    <Progress value={uploadProgress[file.name].progress} className="h-1.5" />
                                                ) : (
                                                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                )}
                                            </div>

                                            {!isUploading && !uploadProgress[file.name] && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-400 hover:text-red-500"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeFile(file);
                                                    }}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
                        Cancel
                    </Button>
                    <Button onClick={handleUpload} disabled={files.length === 0 || isUploading}>
                        {isUploading ? 'Uploading...' : `Upload ${files.length} Images`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
