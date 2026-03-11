import { useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { WorkspaceHeader } from "../components/workspace/WorkspaceHeader";
import { WorkspaceToolbar } from "../components/workspace/WorkspaceToolbar";
import { WorkspaceCanvas } from "../components/canvas/WorkspaceCanvas";
import { WorkspaceSidebar } from "../components/workspace/WorkspaceSidebar";
import { ImageNavigator } from "../components/workspace/ImageNavigator";
import { useImageStore, useAnnotationStore, useLabelStore } from "../stores";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useWorkspaceData } from "../hooks/useWorkspaceData";
import { useProjectTasks } from "../hooks/useProjectTasks";
import { useAutoSave } from "../hooks/useAutoSave";
import { useState, useCallback } from "react";
import { SkipReasonModal } from "../components/workspace/SkipReasonModal";
import { WorkspaceAlertModal } from "../components/workspace/WorkspaceAlertModal";
import { aiApi } from "../../../services/ai.api";
import type { Annotation } from "../stores";
import { toast } from "sonner";

interface WorkspacePageProps {
  mode?: "annotate" | "review";
  taskStatus?:
    | "assigned"
    | "in_progress"
    | "submitted"
    | "rejected"
    | "approved";
}

export function WorkspacePage({
  mode: modeProp = "annotate",
  taskStatus = "assigned",
}: WorkspacePageProps) {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get("mode") as "annotate" | "review") ?? modeProp;
  const { updateImages, getCurrentImage, currentIndex, jumpToImage } =
    useImageStore();
  const {
    clearAnnotations,
    setAnnotations,
    annotations,
    addAnnotation,
    setAnnotatorNote,
    setReviewComment,
    annotatorNote,
  } = useAnnotationStore();
  const { setLabels } = useLabelStore();

  const [actualTimeSeconds, setActualTimeSeconds] = useState(0);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Alert Modal State
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: "default" | "destructive" | "success";
  }>({
    isOpen: false,
    title: "",
    description: "",
    variant: "default",
  });

  const showAlert = (
    title: string,
    description: string,
    variant: "default" | "destructive" | "success" = "default",
  ) => {
    setAlertConfig({ isOpen: true, title, description, variant });
  };

  // Ref to prevent navigation loop
  const isUpdatingFromURL = useRef(false);

  // Validate taskId
  if (!taskId) {
    throw new Error("Task ID is required");
  }

  // Load task data from API
  const {
    loading,
    error,
    taskData,
    submitTask,
    skipTask,
    resumeTask,
    saveDraft,
  } = useWorkspaceData(taskId, mode === "review");

  const isReadOnly =
    taskStatus === "approved" ||
    taskStatus === "submitted" ||
    taskData?.status === "SUBMITTED" ||
    taskData?.status === "APPROVED" ||
    taskData?.status === "SKIPPED" ||
    mode === "review";

  // Work Timer - pauses when tab/window is not visible
  useEffect(() => {
    if (loading || isReadOnly) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const startTimer = () => {
      if (!timer) {
        timer = setInterval(() => {
          setActualTimeSeconds((prev) => prev + 1);
        }, 1000);
      }
    };

    const stopTimer = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTimer();
      } else {
        startTimer();
      }
    };

    startTimer();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loading, isReadOnly]);

  // Auto-save integration
  useAutoSave(saveDraft, actualTimeSeconds);

  // Extract projectId from taskData for loading other tasks
  const projectId = taskData?.projectId;

  // Load all tasks in the project for navigation
  const projectTasks = useProjectTasks(projectId);
  const { imageTasks } = projectTasks;

  // Initialize keyboard shortcuts
  useKeyboardShortcuts(isReadOnly);

  // Load task data into stores when available
  useEffect(() => {
    if (taskData) {
      // Set labels from project (shared across all tasks)
      if (taskData.labels && Array.isArray(taskData.labels)) {
        setLabels(taskData.labels);
      }

      // Load existing annotations if any
      if (taskData.annotations && Array.isArray(taskData.annotations)) {
        setAnnotations(taskData.annotations);
      } else {
        clearAnnotations();
      }

      setAnnotatorNote(taskData.annotatorNote || "");
      setReviewComment(taskData.reviewComment || "");

      // Initialize time from server if available
      if (taskData.actualTimeSeconds !== undefined) {
        setActualTimeSeconds(taskData.actualTimeSeconds);
      }

      // For manager review mode: imageTasks won't load (annotator API), set image directly
      if (mode === "review") {
        updateImages([{
          id: taskData.assignmentId,
          filename: taskData.image.filename,
          status: taskData.status.toLowerCase() as any,
          thumbnail: taskData.image.url,
          annotationCount: taskData.annotations?.length ?? 0,
          url: taskData.image.url,
          width: taskData.image.width,
          height: taskData.image.height,
        }]);
      }
    }
  }, [
    taskData,
    mode,
    setLabels,
    setAnnotations,
    clearAnnotations,
    setAnnotatorNote,
    setReviewComment,
    updateImages,
  ]);

  // Update image tasks list and current index when project tasks are loaded
  useEffect(() => {
    if (imageTasks.length > 0 && taskId) {
      // Mark that we're updating from URL to prevent navigation loop
      isUpdatingFromURL.current = true;

      // Update images without resetting currentIndex
      updateImages(imageTasks);

      // Always set current index based on taskId when taskId changes
      const targetIndex = projectTasks.findTaskIndex(taskId);
      if (targetIndex >= 0) {
        const store = useImageStore.getState();
        if (store.currentIndex !== targetIndex) {
          jumpToImage(targetIndex);
        }
      }

      // Reset flag after state updates
      setTimeout(() => {
        isUpdatingFromURL.current = false;
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageTasks, taskId]);

  // Handle navigation between tasks (user clicked or used keyboard)
  useEffect(() => {
    // Don't navigate if we're updating from URL change
    if (isUpdatingFromURL.current) {
      return;
    }

    if (
      imageTasks.length > 0 &&
      currentIndex >= 0 &&
      currentIndex < imageTasks.length
    ) {
      const newTaskId = imageTasks[currentIndex].id;

      // Only navigate if taskId changed (user clicked on different task)
      if (newTaskId !== taskId) {
        // Update URL without page reload - this will trigger useWorkspaceData to reload
        navigate(`/workspace/${newTaskId}`, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]); // Only watch currentIndex to avoid loops

  const currentImage = getCurrentImage();

  const handleSubmit = async () => {
    // Validate before submit
    if (annotations.length === 0) {
      showAlert(
        "Missing Annotations",
        "Please add at least one annotation before submitting",
        "destructive",
      );
      return;
    }

    // Check if all annotations have labels
    const hasUnlabeledAnnotations = annotations.some((ann) => !ann.label);
    if (hasUnlabeledAnnotations) {
      showAlert(
        "Missing Labels",
        "Please assign labels to all annotations before submitting",
        "destructive",
      );
      return;
    }

    // Prevent duplicate submission if already submitted or approved
    if (taskData?.status === "SUBMITTED" || taskData?.status === "APPROVED") {
      toast.info("Task already submitted. Moving to next...");
      handleNextAutoNav();
      return;
    }

    try {
      await submitTask(annotations, annotatorNote, actualTimeSeconds);
      toast.success("Task submitted successfully! Moving to next image...");
      handleNextAutoNav();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || "Failed to submit task. Please try again.";
      showAlert("Error", errorMsg, "destructive");
    }
  };

  // Helper for auto-navigation to avoid code duplication
  const handleNextAutoNav = () => {
    const currentIndexInProject = imageTasks.findIndex((t) => t.id === taskId);
    const nextTask =
      currentIndexInProject >= 0 &&
      currentIndexInProject < imageTasks.length - 1
        ? imageTasks[currentIndexInProject + 1]
        : null;

    setTimeout(() => {
      if (nextTask) {
        navigate(`/workspace/${nextTask.id}`, { replace: true });
      } else {
        navigate(-1);
      }
    }, 2000);
  };

  const handleSkip = () => {
    setIsSkipModalOpen(true);
  };

  const handleConfirmSkip = async (reason: string) => {
    // Prevent duplicate skip or skip on already submitted task
    const isSkipped =
      taskStatus.toLowerCase() === "skipped" ||
      (currentImage as { status?: string })?.status?.toUpperCase() ===
        "SKIPPED";
    if (isSkipped) {
      toast.info("Task already skipped. Moving to next...");
      setIsSkipModalOpen(false);
      handleNextAutoNav();
      return;
    }

    try {
      // In medical imaging, skip reason is often stored in the annotatorNote field
      // We pass the reason to skipTask which will call the PATCH API
      await skipTask(reason, actualTimeSeconds);
      setIsSkipModalOpen(false);
      toast.info("Task skipped. Moving to next image...");
      handleNextAutoNav();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error || "Failed to skip task. Please try again.";
      showAlert("Error", errorMsg, "destructive");
    }
  };

  const handleResume = async () => {
    try {
      await resumeTask();
    } catch {
      showAlert(
        "Error",
        "Failed to resume task. Please try again.",
        "destructive",
      );
    }
  };

  const handleApprove = () => {
    toast.success("Task approved!");
    setTimeout(() => navigate(-1), 1500);
  };

  const handleReject = () => {
    showAlert(
      "Feature Not Implemented",
      "Reject function is coming soon",
      "default",
    );
  };

  const handleAiSuggest = useCallback(async () => {
    if (!currentImage || !taskData || isAiLoading) return;

    setIsAiLoading(true);
    try {
      // Get actual image dimensions from browser
      const actualDims = await new Promise<{ width: number; height: number }>(
        (resolve) => {
          const img = new window.Image();
          img.crossOrigin = "Anonymous";
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => resolve({ width: currentImage.width ?? 1000, height: currentImage.height ?? 1000 });
          img.src = currentImage.url ?? "";
        }
      );

      const imageUrl = currentImage.url ?? "";
      const { suggestions } = await aiApi.suggestAnnotations(
        imageUrl,
        taskData.labels,
        actualDims.width,
        actualDims.height
      );

      if (suggestions.length === 0) {
        toast.info("No matching objects detected.", {
          description: "Try a different image or review the project labels.",
          duration: 4000,
        });
        return;
      }

      // Remove previous AI-generated annotations before adding new ones
      const currentAnnotations = useAnnotationStore.getState().annotations;
      const manualAnnotations = currentAnnotations.filter((a) => !a.aiSuggested);
      setAnnotations(manualAnnotations);

      toast.success(`AI detected ${suggestions.length} object${suggestions.length > 1 ? "s" : ""}.`, {
        description: "Review and adjust the regions if needed.",
        duration: 3000,
      });

      suggestions.forEach((s) => {
        const ann: Annotation = {
          id: crypto.randomUUID(),
          label: s.label,
          type: "rectangle",
          x: s.x,
          y: s.y,
          width: s.width,
          height: s.height,
          visible: true,
          createdAt: new Date(),
          aiSuggested: true,
          opacity: 0.7,
        };
        addAnnotation(ann);
      });
    } catch {
      toast.error("AI suggestion failed. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  }, [currentImage, taskData, isAiLoading, addAnnotation]);

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading task data...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Failed to load task</div>
          <div className="text-gray-400 mb-4">{error.message}</div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // No image data
  if (!currentImage || !taskData) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-white">No task data available</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-slate-900 z-50 overflow-hidden flex flex-col"
    >
      {/* Header */}
      <WorkspaceHeader
        mode={mode}
        taskStatus={taskData?.status?.toLowerCase() as any}
        onSubmit={handleSubmit}
        onSkip={handleSkip}
        onResume={handleResume}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={() => navigate(-1)}
        actualTimeSeconds={actualTimeSeconds}
        projectName={taskData.projectName}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <WorkspaceToolbar
          isReadOnly={isReadOnly}
          enableAiAssistance={taskData.enableAiAssistance}
          onAiSuggest={handleAiSuggest}
          isAiLoading={isAiLoading}
        />

        {/* Canvas */}
        <div className="flex-1 relative">
          <WorkspaceCanvas
            imageUrl={currentImage.url || ""}
            isReadOnly={isReadOnly}
          />

          {/* AI Loading Overlay */}
          {isAiLoading && (
            <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
              <div className="bg-slate-800 border border-slate-600 rounded-xl px-8 py-6 flex flex-col items-center gap-3 shadow-xl">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-600 border-t-blue-400" />
                <p className="text-white font-medium">AI is analyzing the image...</p>
                <p className="text-slate-400 text-sm">Please wait</p>
              </div>
            </div>
          )}

          {/* Image Navigator */}
          <ImageNavigator />
        </div>

        {/* Sidebar */}
        <WorkspaceSidebar
          isReadOnly={isReadOnly}
          initialTab={taskStatus === "rejected" ? "discussion" : "regions"}
          projectId={projectId}
        />
      </div>

      {/* Modals */}
      <SkipReasonModal
        isOpen={isSkipModalOpen}
        onClose={() => setIsSkipModalOpen(false)}
        onConfirm={handleConfirmSkip}
      />

      <WorkspaceAlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        description={alertConfig.description}
        variant={alertConfig.variant}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </motion.div>
  );
}
