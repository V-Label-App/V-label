import { useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { aiApi } from "../../../services/ai.api";
import { Sparkles } from "lucide-react";
import type { Annotation } from "../stores";
import { WorkspaceHeader } from "../components/workspace/WorkspaceHeader";
import { WorkspaceToolbar } from "../components/workspace/WorkspaceToolbar";
import { WorkspaceCanvas } from "../components/canvas/WorkspaceCanvas";
import { WorkspaceSidebar } from "../components/workspace/WorkspaceSidebar";
import { ImageNavigator } from "../components/workspace/ImageNavigator";
import {
  useImageStore,
  useLabelStore,
  useAnnotationStore,
} from "../stores";
import { ReviewScoringModal } from "../components/workspace/ReviewScoringModal";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useWorkspaceData } from "../hooks/useWorkspaceData";
import { useProjectTasks } from "../hooks/useProjectTasks";
import { useAutoSave } from "../hooks/useAutoSave";
import { useState } from "react";
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
  mode: propMode,
  taskStatus: propTaskStatus,
}: WorkspacePageProps) {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read mode from URL query params, fallback to props
  const mode =
    (searchParams.get("mode") as "annotate" | "review") ||
    propMode ||
    "annotate";
  
  // Load task data from API
  const {
    loading,
    error,
    taskData,
    submitTask,
    skipTask,
    saveDraft,
    approveTask,
    rejectTask,
    resumeTask,
  } = useWorkspaceData(taskId || "", false, mode);

  const { updateImages, getCurrentImage, currentIndex, jumpToImage } =
    useImageStore();

  // Derive taskStatus dynamically from taskData, fallback to propTaskStatus/assigned
  const taskStatus = (taskData?.status?.toLowerCase() ||
    propTaskStatus ||
    "assigned") as any;
  const {
    clearAnnotations,
    setAnnotations,
    annotations,
    annotatorNote,
    addAnnotation,
    setAnnotatorNote,
    setReviewComment,
  } = useAnnotationStore();
  const { setLabels } = useLabelStore();

  const [actualTimeSeconds, setActualTimeSeconds] = useState(0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewType, setReviewType] = useState<"approve" | "reject">("approve");
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Ref to prevent navigation loop
  const isUpdatingFromURL = useRef(false);

  // Validate taskId
  if (!taskId) {
    throw new Error("Task ID is required");
  }

  const isReadOnly =
    taskStatus === "approved" ||
    taskStatus === "submitted" ||
    taskStatus === "skipped" ||
    mode === "review";

  // Work Timer
  useEffect(() => {
    if (!loading && !isReadOnly) {
      const timer = setInterval(() => {
        setActualTimeSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [loading, isReadOnly]);

  // Auto-save integration (disabled in review mode)
  useAutoSave(saveDraft, actualTimeSeconds, mode !== "review");

  // Extract projectId from taskData for loading other tasks
  const projectId = taskData?.projectId;

  // Load all tasks in the project for navigation (enabled for both modes)
  const { imageTasks, findTaskIndex } = useProjectTasks(
    projectId,
    mode
  );

  // Initialize keyboard shortcuts
  useKeyboardShortcuts(isReadOnly);

  // Track the current assignment ID to detect changes
  const lastAssignmentIdRef = useRef<string | null>(null);

  // Load task data into stores when available
  useEffect(() => {
    if (taskData) {
      const currentAssignmentId = taskData.assignmentId;
      const isNewTask = lastAssignmentIdRef.current !== currentAssignmentId;

      // Set labels from project (shared across all tasks)
      if (taskData.labels && Array.isArray(taskData.labels)) {
        setLabels(taskData.labels);
      }

      // Only load annotations and clear selection if it's a new task
      // or if we were previously loading but now have data.
      // This prevents auto-save updates from resetting current selection/history
      if (isNewTask) {
        if (taskData.annotations && Array.isArray(taskData.annotations)) {
          setAnnotations(taskData.annotations);
        } else {
          clearAnnotations();
        }

        // Sync notes and review comments to store
        setAnnotatorNote(taskData.annotatorNote || "");
        setReviewComment(taskData.reviewComment || "");

        // Update ref
        lastAssignmentIdRef.current = currentAssignmentId;
      }
    }
  }, [
    taskData,
    setLabels,
    setAnnotations,
    clearAnnotations,
    setAnnotatorNote,
    setReviewComment,
  ]);

  // Update image tasks list and current index when project tasks are loaded
  useEffect(() => {
    if (imageTasks.length > 0 && taskId) {
      // Mark that we're updating from URL to prevent navigation loop
      isUpdatingFromURL.current = true;

      // Update images without resetting currentIndex
      updateImages(imageTasks);

      // Always set current index based on taskId when taskId changes
      const targetIndex = findTaskIndex(taskId);
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
        navigate(`/workspace/${newTaskId}?mode=${mode}`, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]); // Only watch currentIndex to avoid loops

  const currentImage = getCurrentImage();

  const [isSkipConfirmOpen, setIsSkipConfirmOpen] = useState(false);
  const [skipReason, setSkipReason] = useState("");

  const handleSubmit = async () => {
    // Validate before submit
    if (annotations.length === 0) {
      toast.error("Please add at least one annotation before submitting");
      return;
    }

    // Check if all annotations have labels
    const hasUnlabeledAnnotations = annotations.some((ann) => !ann.label);
    if (hasUnlabeledAnnotations) {
      toast.error("Please assign a label to all annotations before submitting");
      return;
    }

    try {
      await submitTask(annotations, annotatorNote, actualTimeSeconds);
      toast.success("Task submitted successfully! 🎉", {
        description: "Your work has been sent to a Reviewer.",
      });
      handleNextTask();
    } catch {
      toast.error("Failed to submit task. Please try again.");
    }
  };

  const handleSkip = async () => {
    if (!skipReason.trim()) {
      toast.error("Please provide a reason before skipping.");
      return;
    }
    
    setIsSkipConfirmOpen(false);
    try {
      await skipTask(skipReason, actualTimeSeconds);
      toast.info("Task skipped");
      setSkipReason("");
      handleNextTask();
    } catch {
      toast.error("Failed to skip task. Please try again.");
    }
  };

  const handleApprove = () => {
    setReviewType("approve");
    setIsReviewModalOpen(true);
  };

  const handleReject = () => {
    setReviewType("reject");
    setIsReviewModalOpen(true);
  };

  const handleNextTask = () => {
    const store = useImageStore.getState();
    const currentIdx = store.currentIndex;
    // Auto-navigate to the next task if available
    if (imageTasks.length > 0 && currentIdx >= 0 && currentIdx < imageTasks.length - 1) {
      store.jumpToImage(currentIdx + 1);
    } else {
      // If no more tasks, return to previous page
      navigate(-1);
    }
  };

  const handleReviewConfirm = async (comment: string) => {
    setIsReviewLoading(true);
    try {
      if (reviewType === "approve") {
        await approveTask(comment);
        toast.success("Task approved successfully! 🎉");
      } else {
        await rejectTask(comment);
        toast.success("Task rejected successfully.");
      }
      setIsReviewModalOpen(false);
      handleNextTask();
    } catch {
      // Error handles in hook
    } finally {
      setIsReviewLoading(false);
    }
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
          confidence: s.confidence,
          opacity: 0.7,
        };
        addAnnotation(ann);
      });
    } catch {
      toast.error("AI suggestion failed. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  }, [currentImage, taskData, isAiLoading, addAnnotation, setAnnotations]);

  const handleClose = () => {
    navigate(-1);
  };

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
        taskStatus={taskStatus}
        onSubmit={handleSubmit}
        onSkip={() => setIsSkipConfirmOpen(true)}
        onResume={resumeTask}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={handleClose}
        actualTimeSeconds={actualTimeSeconds}
        projectName={taskData.projectName}
        annotator={taskData.annotator}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <WorkspaceToolbar
          isReadOnly={isReadOnly}
          enableAiAssistance={taskData?.enableAiAssistance}
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
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-slate-800 border border-slate-600 rounded-xl px-6 py-5 w-72 shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                  <p className="text-white font-medium text-sm">AI Analyzing Image</p>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full w-2/5 bg-gradient-to-r from-purple-500 to-blue-400 rounded-full animate-progress" />
                </div>
                <p className="text-slate-400 text-xs mt-2">Detecting objects and generating annotations...</p>
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
        />
      </div>

      <ReviewScoringModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onConfirm={handleReviewConfirm}
        type={reviewType}
        isLoading={isReviewLoading}
        initialComment={annotatorNote} // default to annotator note as feedback start
      />

      {/* Skip Confirm Dialog */}
      {isSkipConfirmOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 shadow-2xl max-w-md w-full mx-4 text-white">
            <h3 className="text-lg font-bold mb-1">Skip this task?</h3>
            <p className="text-slate-400 text-sm mb-4">
              This task will be returned to the pool for someone else to complete.
            </p>
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Reason <span className="text-red-400 ml-1">*</span>
              </label>
              <textarea
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                placeholder="e.g. Image is too blurry to annotate..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setIsSkipConfirmOpen(false); setSkipReason(""); }}
                className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSkip}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors text-sm font-semibold"
              >
                Skip Task
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
