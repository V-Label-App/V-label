import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Checkbox } from "../../../components/ui/checkbox";
import { Badge } from "../../../components/ui/badge";
import { Skeleton } from "../../../components/ui/skeleton";
import {
  Folder,
  Image as ImageIcon,
  Search,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { projectApi } from "../../../services/project.api";
import { datasetApi, type Dataset } from "../../../services/dataset.api";
import type { Project } from "../../../types/project.types";

interface ImagePreview {
  id: string;
  originalFilename: string;
  storageUrl: string;
  thumbnailUrl?: string;
}

interface ImportDatasetDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ProjectWithDatasets {
  id: string;
  name: string;
  description?: string;
  datasets: Dataset[];
  isExpanded?: boolean;
}

export function ImportDatasetDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: ImportDatasetDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [projects, setProjects] = useState<ProjectWithDatasets[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDatasets, setSelectedDatasets] = useState<
    Array<{
      projectId: string;
      datasetId: string;
      datasetName: string;
      projectName: string;
    }>
  >([]);
  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(
    new Set(),
  );
  const [datasetImages, setDatasetImages] = useState<
    Record<string, ImagePreview[]>
  >({});

  useEffect(() => {
    if (open) {
      loadProjectsWithDatasets();
    } else {
      // Reset state when dialog closes
      setSearchQuery("");
      setSelectedDatasets([]);
      setProjects([]);
      setExpandedDatasets(new Set());
      setDatasetImages({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const loadProjectsWithDatasets = async () => {
    setIsLoading(true);
    try {
      // Get all projects except current one
      const allProjects = await projectApi.getAll();
      const otherProjects = allProjects.data.filter(
        (p: Project) => p.id !== projectId,
      );

      // Load datasets for each project
      const projectsWithDatasets = await Promise.all(
        otherProjects.map(async (project: Project) => {
          try {
            const datasets = await datasetApi.getProjectDatasets(project.id);
            return {
              id: project.id,
              name: project.name,
              description: project.description,
              datasets: datasets || [],
              isExpanded: false,
            };
          } catch (error) {
            console.error(
              `Failed to load datasets for project ${project.id}`,
              error,
            );
            return {
              id: project.id,
              name: project.name,
              description: project.description,
              datasets: [],
              isExpanded: false,
            };
          }
        }),
      );

      // Filter out projects with no datasets
      const projectsWithData = projectsWithDatasets.filter(
        (p: ProjectWithDatasets) => p.datasets.length > 0,
      );

      setProjects(projectsWithData);
    } catch (error) {
      console.error("Failed to load projects", error);
      toast.error("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProject = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, isExpanded: !p.isExpanded } : p,
      ),
    );
  };

  const toggleDatasetExpansion = async (
    datasetProjectId: string,
    datasetId: string,
  ) => {
    const key = `${datasetProjectId}-${datasetId}`;
    const isExpanded = expandedDatasets.has(key);

    if (isExpanded) {
      // Collapse
      setExpandedDatasets((prev) => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    } else {
      // Expand and load images if not already loaded
      setExpandedDatasets((prev) => new Set(prev).add(key));

      if (!datasetImages[key]) {
        try {
          const response = await projectApi.getImages(datasetProjectId, {
            datasetId: datasetId,
            limit: 20, // Load first 20 images
            page: 1,
          });
          console.log("Dataset images response:", response);
          const images = Array.isArray(response.data) ? response.data : [];
          setDatasetImages((prev) => ({
            ...prev,
            [key]: images,
          }));
        } catch (error) {
          console.error("Failed to load dataset images", error);
          toast.error("Failed to load images");
          setDatasetImages((prev) => ({
            ...prev,
            [key]: [],
          }));
        }
      }
    }
  };

  const toggleDatasetSelection = (
    projectId: string,
    datasetId: string,
    datasetName: string,
    projectName: string,
  ) => {
    setSelectedDatasets((prev) => {
      const exists = prev.find(
        (d) => d.projectId === projectId && d.datasetId === datasetId,
      );

      if (exists) {
        return prev.filter(
          (d) => !(d.projectId === projectId && d.datasetId === datasetId),
        );
      } else {
        return [...prev, { projectId, datasetId, datasetName, projectName }];
      }
    });
  };

  const handleImport = async () => {
    if (selectedDatasets.length === 0) {
      toast.error("Please select at least one dataset to import");
      return;
    }

    setIsImporting(true);
    try {
      let successCount = 0;
      let failCount = 0;
      let totalImages = 0;
      let totalTasks = 0;

      for (const dataset of selectedDatasets) {
        try {
          const result = await datasetApi.copyDataset(
            dataset.projectId,
            dataset.datasetId,
            projectId,
          );
          successCount++;
          totalImages += result._count?.images || 0;
          totalTasks += result._taskCount || 0;
        } catch (error) {
          console.error(
            `Failed to import dataset ${dataset.datasetName}`,
            error,
          );
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(
          `Successfully imported ${successCount} dataset${successCount > 1 ? "s" : ""} with ${totalImages} images and ${totalTasks} tasks`,
        );
        onSuccess?.();
        onOpenChange(false);
      }

      if (failCount > 0) {
        toast.error(
          `Failed to import ${failCount} dataset${failCount > 1 ? "s" : ""}`,
        );
      }
    } catch (error) {
      console.error("Import failed", error);
      toast.error("Failed to import datasets");
    } finally {
      setIsImporting(false);
    }
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.datasets.some((d) =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Dataset from Another Project</DialogTitle>
          <DialogDescription>
            Select datasets from other projects to import into this project.
            Images and metadata will be copied.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects or datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected datasets summary */}
          {selectedDatasets.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedDatasets.length} dataset
                  {selectedDatasets.length > 1 ? "s" : ""} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDatasets([])}
                  className="h-auto py-1 text-blue-700 hover:text-blue-900"
                >
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedDatasets.map((d) => (
                  <Badge
                    key={`${d.projectId}-${d.datasetId}`}
                    variant="secondary"
                    className="bg-white"
                  >
                    {d.projectName} / {d.datasetName}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Projects and datasets list */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-4 space-y-2">
              {isLoading ? (
                // Loading skeleton
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <div className="pl-6 space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProjects.length === 0 ? (
                // Empty state
                <div className="text-center py-12 text-muted-foreground">
                  <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>
                    {searchQuery
                      ? "No projects or datasets found matching your search"
                      : "No other projects with datasets available"}
                  </p>
                </div>
              ) : (
                // Projects list
                filteredProjects.map((project) => (
                  <div key={project.id} className="space-y-1">
                    {/* Project header */}
                    <button
                      onClick={() => toggleProject(project.id)}
                      className={`w-full flex items-center gap-2 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left ${
                        project.isExpanded ? "bg-gray-50" : ""
                      }`}
                    >
                      {project.isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      )}
                      <Folder className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {project.name}
                        </div>
                        {project.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {project.description}
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary" className="flex-shrink-0">
                        {project.datasets.length} dataset
                        {project.datasets.length !== 1 ? "s" : ""}
                      </Badge>
                    </button>

                    {/* Datasets list */}
                    {project.isExpanded && (
                      <div className="pl-6 space-y-2">
                        {project.datasets.map((dataset) => {
                          const isSelected = selectedDatasets.some(
                            (d) =>
                              d.projectId === project.id &&
                              d.datasetId === dataset.id,
                          );
                          const datasetKey = `${project.id}-${dataset.id}`;
                          const isDatasetExpanded =
                            expandedDatasets.has(datasetKey);
                          const images = datasetImages[datasetKey] || [];

                          return (
                            <div key={dataset.id} className="space-y-1">
                              {/* Dataset row */}
                              <div
                                className={`flex items-center gap-2 p-2.5 rounded-lg transition-colors ${
                                  isSelected
                                    ? "bg-blue-50"
                                    : "hover:bg-gray-100"
                                }`}
                              >
                                {/* Checkbox */}
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    toggleDatasetSelection(
                                      project.id,
                                      dataset.id,
                                      dataset.name,
                                      project.name,
                                    )
                                  }
                                />

                                {/* Expand/Collapse button */}
                                <button
                                  onClick={() =>
                                    toggleDatasetExpansion(
                                      project.id,
                                      dataset.id,
                                    )
                                  }
                                  className="p-0.5 hover:bg-gray-200 rounded"
                                >
                                  {isDatasetExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                                  )}
                                </button>

                                {/* Dataset info */}
                                <ImageIcon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">
                                    {dataset.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {dataset._count?.images || 0} image
                                    {dataset._count?.images !== 1 ? "s" : ""}
                                  </div>
                                </div>
                              </div>

                              {/* Images preview */}
                              {isDatasetExpanded && (
                                <div className="pl-8 pr-2 py-2">
                                  {!datasetImages[datasetKey] ? (
                                    <div className="flex items-center justify-center py-4">
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                      <span className="text-xs text-muted-foreground">
                                        Loading images...
                                      </span>
                                    </div>
                                  ) : images.length === 0 ? (
                                    <div className="text-xs text-muted-foreground text-center py-4">
                                      No images in this dataset
                                    </div>
                                  ) : (
                                    <ScrollArea className="h-36">
                                      <div className="grid grid-cols-4 gap-2 pr-4 pb-2">
                                        {images.map(
                                          (img: ImagePreview, idx: number) => (
                                            <div
                                              key={img.id || idx}
                                              className="aspect-square rounded overflow-hidden border border-gray-200 bg-gray-100 relative group"
                                              title={img.originalFilename}
                                            >
                                              <img
                                                src={
                                                  img.thumbnailUrl || img.storageUrl
                                                }
                                                alt={
                                                  img.originalFilename ||
                                                  `Image ${idx + 1}`
                                                }
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                                onError={(e) => {
                                                  const target =
                                                    e.target as HTMLImageElement;
                                                  target.onerror = null;
                                                  target.src =
                                                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                                                }}
                                              />
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </ScrollArea>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={selectedDatasets.length === 0 || isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Import{" "}
                {selectedDatasets.length > 0 && `(${selectedDatasets.length})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
