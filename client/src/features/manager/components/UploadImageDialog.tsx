import { useState, useCallback, useRef } from 'react';
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
import { Upload, X, FileImage, FolderOpen, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { projectApi } from '../../../services/project.api';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { datasetApi, type Dataset } from '../../../services/dataset.api';
import { useEffect } from 'react';
import { analyzeImageQuality, type ImageQualityResult, type ImageQualityConfig } from '../../../utils/image-analysis';
import { Badge } from '../../../components/ui/badge';

interface UploadImageDialogProps {
    projectId: string;
    datasetId?: string; // If provided, pre-select this dataset and maybe lock it?
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface FileWithStatus extends File {
    preview?: string;
    quality?: ImageQualityResult;
}

interface UploadProgress {
    fileName: string;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error' | 'duplicate';
    error?: string;
    existingImageUrl?: string;
}

export function UploadImageDialog({ projectId, datasetId: initialDatasetId, open, onOpenChange, onSuccess }: UploadImageDialogProps) {
    const [files, setFiles] = useState<FileWithStatus[]>([]);
    const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
    const [isUploading, setIsUploading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedDatasetId, setSelectedDatasetId] = useState<string | "general">(initialDatasetId || "general");
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [overallProgress, setOverallProgress] = useState(0);

    // Quality Config
    const [qualityConfig, setQualityConfig] = useState<ImageQualityConfig | undefined>(undefined);

    // Quality Review State
    const [qualityReviewOpen, setQualityReviewOpen] = useState(false);
    const [reviewedFiles, setReviewedFiles] = useState<FileWithStatus[]>([]); // Files causing the quality alert

    // Hidden input for folder selection
    const folderInputRef = useRef<HTMLInputElement>(null);

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

    // Fetch Quality Config
    useEffect(() => {
        if (open) {
            import('../../../services/system.api').then(({ systemApi }) => {
                systemApi.getImageQualityConfig().then(setQualityConfig).catch(console.error);
            });
        }
    }, [open]);

    const processFiles = useCallback(async (newFiles: File[]) => {
        setIsAnalyzing(true);
        const processedFiles: FileWithStatus[] = [];

        // Process in chunks to avoid UI freeze
        for (const file of newFiles) {
            // Basic preview
            const fileWithPreview: FileWithStatus = Object.assign(file, {
                preview: URL.createObjectURL(file)
            });

            // Analyze quality
            try {
                const quality = await analyzeImageQuality(file, qualityConfig);
                fileWithPreview.quality = quality;
            } catch (e) {
                console.error("Analysis failed", e);
            }

            processedFiles.push(fileWithPreview);
        }

        setFiles(prev => [...prev, ...processedFiles]);
        setIsAnalyzing(false);

        // Check for quality issues to open modal
        const poorQualityFiles = processedFiles.filter(f => !f.quality?.isGood);
        if (poorQualityFiles.length > 0) {
            setReviewedFiles(poorQualityFiles);
            setQualityReviewOpen(true);
        }
    }, [qualityConfig]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        processFiles(acceptedFiles);
    }, [processFiles]);

    // Folder selection handler
    const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = event.target.files;
        if (!fileList) return;

        const imageFiles: File[] = [];
        // Filter only images
        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            if (file.type.startsWith('image/')) {
                imageFiles.push(file);
            }
        }

        if (imageFiles.length > 0) {
            processFiles(imageFiles);
            // toast.success(`Found ${imageFiles.length} images in folder.`);
        } else {
            toast.info("No valid images found in selected folder.");
        }

        // Reset input
        if (folderInputRef.current) folderInputRef.current.value = "";
    };

    // Reset progress when dialog closes or opens
    useEffect(() => {
        if (!open) {
            setOverallProgress(0);
            setUploadProgress({});
            setIsUploading(false);
            setFiles([]);
            setIsAnalyzing(false);
            setQualityReviewOpen(false);
        }
    }, [open]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp']
        }
    });

    const removeFile = (fileToRemove: FileWithStatus) => {
        setFiles(files.filter(f => f !== fileToRemove));
        if (fileToRemove.preview) {
            URL.revokeObjectURL(fileToRemove.preview);
        }
    };

    // Remove specific files (used by Quality Modal)
    const removeSpecificFiles = (filesToRemove: FileWithStatus[]) => {
        setFiles(currentFiles => currentFiles.filter(f => !filesToRemove.includes(f)));
        filesToRemove.forEach(f => {
            if (f.preview) URL.revokeObjectURL(f.preview);
        });
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

    // Helper to count issues
    // const badQualityCount = files.filter(f => !f.quality?.isGood).length;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle>Upload Images</DialogTitle>
                            {isAnalyzing && <Badge variant="outline" className="animate-pulse">Analyzing Quality...</Badge>}
                        </div>
                        <DialogDescription>
                            Import images from files or folders. Quality check is active.
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

                        {/* Actions Area */}
                        <div className="flex gap-2">
                            {/* Dropzone */}
                            <div
                                {...getRootProps()}
                                className={`flex flex-col items-center justify-center flex-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
                                    } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <input {...getInputProps()} />
                                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                <p className="text-sm font-medium">Select Files</p>
                                <p className="text-xs text-muted-foreground">or Drag & Drop</p>
                            </div>

                            {/* Folder Select Button */}
                            <div
                                className={`flex flex-col items-center justify-center flex-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-400
                                    ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                                onClick={() => folderInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={folderInputRef}
                                    onChange={handleFolderSelect}
                                    style={{ display: 'none' }}
                                    // @ts-ignore - webkitdirectory is non-standard but supported
                                    webkitdirectory=""
                                    directory=""
                                    multiple
                                />
                                <FolderOpen className="w-8 h-8 text-blue-500 mb-2" />
                                <p className="text-sm font-medium text-blue-700">Select Folder</p>
                                <p className="text-xs text-blue-600">Import entire directory</p>
                            </div>
                        </div>

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                    <span className="text-xs font-medium text-muted-foreground">{files.length} files selected</span>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="h-6 text-xs text-red-500 hover:text-red-600" disabled={isUploading}>
                                            Clear all
                                        </Button>
                                    </div>
                                </div>
                                <ScrollArea className="h-[200px] w-full rounded-md border p-2">
                                    <div className="space-y-2">
                                        {files.map((file, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-2 bg-white border rounded-md group">
                                                <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-100 table-cell align-middle text-center border relative">
                                                    {file.preview ? (
                                                        <img src={file.preview} alt={file.name} className={`w-full h-full object-cover ${!file.quality?.isGood ? 'opacity-50' : ''}`} />
                                                    ) : (
                                                        <FileImage className="w-5 h-5 mx-auto mt-2.5 text-gray-400" />
                                                    )}
                                                    {/* Quality Overlay Badge */}
                                                    {!file.quality?.isGood && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                            <AlertTriangle className="w-4 h-4 text-yellow-400 drop-shadow-md" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                                                            {/* Quality Tags */}
                                                            {!file.quality?.isGood && file.quality?.issues.map((issue, i) => (
                                                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium whitespace-nowrap border border-red-200">
                                                                    {issue}
                                                                </span>
                                                            ))}
                                                            {file.quality?.isGood && (
                                                                <span className="text-[10px] px-1 py-0.5 rounded text-green-600 flex items-center gap-0.5" title="Quality Good">
                                                                    <ShieldCheck className="w-3 h-3" />
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Status Badges */}
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
                                                        <p className="text-xs text-muted-foreground flex gap-2">
                                                            <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                                            {file.quality && (
                                                                <span className="text-gray-300">|</span>
                                                            )}
                                                            {file.quality?.details && (
                                                                <span className="text-gray-500" title="Resolution">
                                                                    {file.quality.details.resolution}
                                                                </span>
                                                            )}
                                                        </p>
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

            {/* Quality Review Modal (Nested) */}
            <Dialog open={qualityReviewOpen} onOpenChange={setQualityReviewOpen}>
                <DialogContent className="sm:max-w-md border-orange-200">
                    <DialogHeader>
                        <div className="flex items-center gap-3 text-orange-600">
                            <div className="p-2 bg-orange-100 rounded-full">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <DialogTitle className="text-orange-900">Quality Issues Detected</DialogTitle>
                        </div>
                        <DialogDescription>
                            We found {reviewedFiles.length} images with potential quality issues (blur, low resolution, or lighting).
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="h-[200px] mt-2 border rounded-md p-2 bg-slate-50">
                        <div className="space-y-2">
                            {reviewedFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2 bg-white border border-orange-100 rounded-md">
                                    <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-gray-100 border">
                                        <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                        <div className="flex gap-1 mt-1 flex-wrap">
                                            {file.quality?.issues.map((issue, i) => (
                                                <Badge key={i} variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-red-50 text-red-600 border-red-200">
                                                    {issue}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                // Mark all reviewed files as good (accepted)
                                setFiles(prev => prev.map(f => {
                                    if (reviewedFiles.some(rf => rf.name === f.name)) {
                                        // Directly update the property to preserve File prototype (size, type, etc.)
                                        f.quality = { ...f.quality!, isGood: true };
                                        return f;
                                    }
                                    return f;
                                }));
                                setQualityReviewOpen(false);
                                toast.success("Quality warnings ignored.");
                            }}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            Keep All (Ignore)
                        </Button>
                        <Button
                            variant="destructive"
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                            onClick={() => {
                                removeSpecificFiles(reviewedFiles);
                                setQualityReviewOpen(false);
                                toast.success(`Removed ${reviewedFiles.length} poor quality images.`);
                            }}
                        >
                            Remove {reviewedFiles.length} Images
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
