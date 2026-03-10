import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { useState } from "react";
import { SkipReasonModal } from "../components/workspace/SkipReasonModal";
import { WorkspaceAlertModal } from "../components/workspace/WorkspaceAlertModal";

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
  mode = "annotate",
  taskStatus = "assigned",
}: WorkspacePageProps) {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { updateImages, getCurrentImage, currentIndex, jumpToImage } =
    useImageStore();
  const {
    clearAnnotations,
    setAnnotations,
    annotations,
    setAnnotatorNote,
    setReviewComment,
    annotatorNote,
  } = useAnnotationStore();
  const { setLabels } = useLabelStore();

  const [actualTimeSeconds, setActualTimeSeconds] = useState(0);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);

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
  const { loading, error, taskData, submitTask, skipTask, saveDraft } =
    useWorkspaceData(taskId);

  const isReadOnly =
    taskStatus === "approved" ||
    taskStatus === "submitted" ||
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

  // Auto-save integration
  useAutoSave(saveDraft, actualTimeSeconds);

  // Extract projectId from taskData for loading other tasks
  const projectId = taskData?.projectId;

  // Load all tasks in the project for navigation
  const { imageTasks, findTaskIndex } = useProjectTasks(projectId);

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

    try {
      await submitTask(annotations, annotatorNote);
      showAlert("Success", "Task submitted successfully!", "success");

      // Auto-navigate to next task if available
      const currentIndexInProject = imageTasks.findIndex(
        (t) => t.id === taskId,
      );
      const nextTask = imageTasks[currentIndexInProject + 1];

      setTimeout(() => {
        if (nextTask) {
          navigate(`/workspace/${nextTask.id}`, { replace: true });
        } else {
          navigate(-1);
        }
      }, 1500);
    } catch {
      showAlert(
        "Error",
        "Failed to submit task. Please try again.",
        "destructive",
      );
    }
  };

  const handleSkip = () => {
    setIsSkipModalOpen(true);
  };

  const handleConfirmSkip = async (reason: string) => {
    try {
      // In medical imaging, skip reason is often stored in the annotatorNote field
      // We pass the reason to skipTask which will call the PATCH API
      await skipTask(reason);
      setIsSkipModalOpen(false);
      showAlert("Skipped", "Task skipped successfully", "default");

      // Auto-navigate to next task if available
      const currentIndexInProject = imageTasks.findIndex(
        (t) => t.id === taskId,
      );
      const nextTask = imageTasks[currentIndexInProject + 1];

      setTimeout(() => {
        if (nextTask) {
          navigate(`/workspace/${nextTask.id}`, { replace: true });
        } else {
          navigate(-1);
        }
      }, 1000);
    } catch {
      showAlert(
        "Error",
        "Failed to skip task. Please try again.",
        "destructive",
      );
    }
  };

  const handleApprove = () => {
    showAlert("Approved", "Task approved successfully!", "success");
    setTimeout(() => navigate(-1), 1000);
  };

  const handleReject = () => {
    const reason = prompt("Please provide a rejection reason:");
    if (reason && reason.trim()) {
      alert(`Task rejected. Reason: ${reason}`);
      navigate(-1);
    }
  };

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
        onSkip={handleSkip}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={handleClose}
        actualTimeSeconds={actualTimeSeconds}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <WorkspaceToolbar isReadOnly={isReadOnly} />

        {/* Canvas */}
        <div className="flex-1 relative">
          <WorkspaceCanvas
            imageUrl={currentImage.url || ""}
            isReadOnly={isReadOnly}
          />

          {/* Image Navigator */}
          <ImageNavigator />
        </div>

        {/* Sidebar */}
        <WorkspaceSidebar
          isReadOnly={isReadOnly}
          initialTab={taskStatus === "rejected" ? "discussion" : "regions"}
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
