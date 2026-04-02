import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

import { motion, AnimatePresence } from "framer-motion";
import { aiApi } from "../../../services/ai.api";
import { Sparkles, ChevronLeft } from "lucide-react";
import type { Annotation } from "../stores";
import { WorkspaceHeader } from "../components/workspace/WorkspaceHeader";
import { WorkspaceToolbar } from "../components/workspace/WorkspaceToolbar";
import { AiAnalysisPanel } from "../components/workspace/AiAnalysisPanel";
import { WorkspaceCanvas } from "../components/canvas/WorkspaceCanvas";
import { WorkspaceSidebar } from "../components/workspace/WorkspaceSidebar";
import { ImageNavigator } from "../components/workspace/ImageNavigator";
import { useImageStore, useLabelStore, useAnnotationStore } from "../stores";
import { ReviewScoringModal } from "../components/workspace/ReviewScoringModal";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useWorkspaceData } from "../hooks/useWorkspaceData";
import { projectApi } from "../../../services/project.api";
import { useProjectTasks } from "../hooks/useProjectTasks";
import { useAutoSave } from "../hooks/useAutoSave";
import { toast } from "sonner";
import { useNotifications } from "../../../hooks/useNotifications";
import { usePageTitle } from "../../../hooks/usePageTitle";
import { useAuth } from "../../../context/AuthContext";

interface WorkspacePageProps {
  mode?: "annotate" | "review";
  taskStatus?:
    | "assigned"
    | "in_progress"
    | "submitted"
    | "rejected"
    | "approved"
    | "skipped";
}

const getLatestAnnotatorAssignment = (task: any) => {
  if (!task || !task.assignments || !Array.isArray(task.assignments))
    return undefined;
  const annotatorAssignments = task.assignments.filter(
    (a: any) => a.annotatorId,
  );
  if (annotatorAssignments.length === 0) return undefined;
  return [...annotatorAssignments].sort((a, b) => {
    const dateA = a.updatedAt
      ? new Date(a.updatedAt).getTime()
      : new Date(a.createdAt).getTime();
    const dateB = b.updatedAt
      ? new Date(b.updatedAt).getTime()
      : new Date(b.createdAt).getTime();
    return dateB - dateA;
  })[0];
};

export function WorkspacePage({
  mode: propMode,
  taskStatus: propTaskStatus,
}: WorkspacePageProps) {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const isTaskId = searchParams.get("isTaskId") === "true";
  const projectIdFromUrl = searchParams.get("projectId");
  const [resolvedId, setResolvedId] = useState<string | null>(isTaskId ? null : taskId || "");
  const [isResolving, setIsResolving] = useState(isTaskId);

  // Keep resolvedId in sync with taskId URL param when navigating between tasks
  // (WorkspacePage is not remounted on taskId change — useState initial value only runs once)
  useEffect(() => {
    if (!isTaskId && taskId && taskId !== resolvedId) {
      setResolvedId(taskId);
    }
  }, [taskId, isTaskId, resolvedId]);

  // Read mode from URL query params, fallback to props
  const mode =
    (searchParams.get("mode") as "annotate" | "review") ||
    propMode ||
    "annotate";

  // Update page title with notification count
  const { unreadCount } = useNotifications();
  usePageTitle(unreadCount, "V Label - AI-Powered Data Annotation Platform");

  // Load task data from API
  const {
    loading: dataLoading,
    error,
    taskData,
    submitTask,
    skipTask,
    saveDraft,
    approveTask,
    rejectTask,
    resumeTask,
  } = useWorkspaceData(
    resolvedId || "", 
    user?.role === "MANAGER" || user?.role === "ADMIN", 
    mode
  );

  // Logic to resolve Task ID to Assignment ID for Managers
  useEffect(() => {
    if (isTaskId && taskId && projectIdFromUrl && !resolvedId) {
      const resolveTask = async () => {
        setIsResolving(true);
        try {
          // Fetch all tasks for the project and find our task
          const response = await projectApi.getTasks(projectIdFromUrl, { limit: 1000 });
          const tasks = response.data || [];
          const targetTask = tasks.find((t: any) => t.id === taskId);
          
          if (!targetTask) {
            toast.error("Task not found in this project");
            return;
          }
          
          const latestAssignment = getLatestAnnotatorAssignment(targetTask);
          if (latestAssignment) {
            setResolvedId(latestAssignment.id);
          } else {
            toast.error("This task has no active assignments to view");
          }
        } catch (err) {
          console.error("Failed to resolve Task ID:", err);
          toast.error("Could not find the assignment for this task");
        } finally {
          setIsResolving(false);
        }
      };
      
      resolveTask();
    }
  }, [isTaskId, taskId, projectIdFromUrl, resolvedId]);

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const loading = (dataLoading || isResolving) && !hasLoadedOnce;
  const isSwitchingTask = dataLoading && hasLoadedOnce;

  useEffect(() => {
    if (taskData && !dataLoading) {
      setHasLoadedOnce(true);
    }
  }, [taskData, dataLoading]);

  const { updateImages, getCurrentImage, currentIndex, jumpToImage, setAutoSaveStatus, setHasInteracted } =
    useImageStore();

  // Derive taskStatus dynamically from taskData, fallback to propTaskStatus/assigned
  const taskStatus = (taskData?.status?.toLowerCase() ||
    propTaskStatus ||
    "assigned") as WorkspacePageProps["taskStatus"];

  const {
    clearAnnotations,
    setAnnotations,
    annotations,
    annotatorNote,
    addAnnotation,
    setAnnotatorNote,
    setReviewComment,
    setHistoricalAnnotations,
  } = useAnnotationStore();
  const { setLabels } = useLabelStore();

  const [actualTimeSeconds, setActualTimeSeconds] = useState(0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewType, setReviewType] = useState<"approve" | "reject">("approve");
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [aiOtherObjects, setAiOtherObjects] = useState<string[]>([]);

  // History preview state
  const [previewingSubmission, setPreviewingSubmission] = useState<
    number | null
  >(null);

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
    mode === "review" ||
    previewingSubmission !== null;

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
    projectIdFromUrl || taskData?.projectId,
    mode,
    user?.role === "MANAGER" || user?.role === "ADMIN",
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

        // Historical annotations should only be shown when manually selected
        // from the history list, so we initialize as empty.
        setHistoricalAnnotations([]);

        // Reset preview state
        setPreviewingSubmission(null);

        // Reset auto-save status so previous task's "Unsaved changes" doesn't bleed over
        setAutoSaveStatus("saved");
      }
    }
  }, [
    taskData,
    setLabels,
    setAnnotations,
    setHistoricalAnnotations,
    clearAnnotations,
    setAnnotatorNote,
    setReviewComment,
    setAutoSaveStatus,
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

  const handleSaveDraft = useCallback(async () => {
    if (isReadOnly) return;
    try {
      await saveDraft(annotations, annotatorNote, actualTimeSeconds);
      toast.success("Draft saved successfully");
    } catch {
      toast.error("Failed to save draft");
    }
  }, [saveDraft, annotations, annotatorNote, actualTimeSeconds, isReadOnly]);

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
      toast.info("Skip task successfully");
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
    const tasks = store.images;
    const currentIdx = store.currentIndex;

    if (currentIdx < tasks.length - 1) {
      store.jumpToImage(currentIdx + 1);
    } else {
      toast.success("All tasks completed!");
      // If no more tasks, return to previous page
      navigate(-1);
    }
  };

  const handlePreviewAnnotations = (
    historyAnnots: Annotation[],
    submissionNumber: number,
  ) => {
    setPreviewingSubmission(submissionNumber);
    // Ensure all historical annotations are visible for the preview
    const visibleAnnots = historyAnnots.map((ann) => ({
      ...ann,
      id:
        ann.id ||
        `hist-${submissionNumber}-${Math.random().toString(36).substr(2, 5)}`,
      visible: true,
    }));
    setHistoricalAnnotations(visibleAnnots);
  };

  const handleRestoreCurrent = () => {
    setPreviewingSubmission(null);
    // When returning from a preview, clear historical annotations to maintain a clean workspace.
    setHistoricalAnnotations([]);
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
    setHasInteracted(true);
    try {
      // Get actual image dimensions from browser
      const actualDims = await new Promise<{ width: number; height: number }>(
        (resolve) => {
          const img = new window.Image();
          img.crossOrigin = "Anonymous";
          img.onload = () =>
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () =>
            resolve({
              width: currentImage.width ?? 1000,
              height: currentImage.height ?? 1000,
            });
          img.src = currentImage.url ?? "";
        },
      );

      const imageUrl = currentImage.url ?? "";
      const { suggestions, otherObjects = [] } = await aiApi.suggestAnnotations(
        imageUrl,
        taskData.labels,
        actualDims.width,
        actualDims.height,
      );

      if (suggestions.length === 0 && otherObjects.length === 0) {
        toast.info("No matching objects detected.", {
          description: "Try a different image or review the project labels.",
          duration: 4000,
        });
        return;
      }

      // Remove previous AI-generated annotations before adding new ones
      const currentAnnotations = useAnnotationStore.getState().annotations;
      const manualAnnotations = currentAnnotations.filter(
        (a) => !a.aiSuggested,
      );
      setAnnotations(manualAnnotations);

      // Fetch AI-generated tips in background (non-blocking)
      setAiTips([]);
      setAiOtherObjects(otherObjects);
      setIsAiPanelOpen(true);
      aiApi.getAnnotationTips(
        suggestions.map((s) => ({ label: s.label, confidence: s.confidence, reason: s.reason })),
        otherObjects
      ).then(({ tips }) => setAiTips(tips)).catch(() => {});

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
  }, [currentImage, taskData, isAiLoading, addAnnotation, setAnnotations, setHasInteracted]);
  const handleClose = () => {
    navigate(-1);
  };

  // Loading state (Initial only)
  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse opacity-50"></div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-xl font-bold text-white tracking-widest uppercase">
            Initializing Workspace
          </p>
          <p className="text-sm text-slate-500">
            Preparing high-precision annotation tools...
          </p>
        </div>
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
        onApprove={handleApprove}
        onReject={handleReject}
        onResume={resumeTask}
        onSave={handleSaveDraft}
        onClose={handleClose}
        actualTimeSeconds={actualTimeSeconds}
        projectName={taskData.projectName}
        annotator={taskData.annotator}
        isTaskReassigned={taskData.isTaskReassigned}
        rejectionCount={taskData.rejectionCount}
      />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigator - Task List */}
        <ImageNavigator />

        {/* AI Analysis Panel — appears after AI suggest completes */}
        <AiAnalysisPanel
          isOpen={isAiPanelOpen}
          onClose={() => setIsAiPanelOpen(false)}
          tips={aiTips}
          otherObjects={aiOtherObjects}
          labelColors={Object.fromEntries(
            (taskData?.labels ?? []).map((l: any) => [l.name, l.color]),
          )}
        />

        {/* Floating Toolbar */}
        <div className="fixed bottom-0 left-0 right-0 h-0 pointer-events-none z-[100] flex justify-center">
          <div className="pointer-events-auto pb-8">
            <WorkspaceToolbar
              isReadOnly={isReadOnly}
              enableAiAssistance={taskData?.enableAiAssistance}
              onAiSuggest={handleAiSuggest}
              isAiLoading={isAiLoading}
            />
          </div>
        </div>

        {/* Canvas Area - Added ml-24 for the left navigator */}
        <div className="flex-1 relative bg-slate-950 ml-24 transition-all duration-500 ease-in-out">
          <AnimatePresence>
            {isSwitchingTask && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md z-[80] flex flex-col items-center justify-center gap-3"
              >
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse opacity-50"></div>
                  </div>
                </div>
                <p className="text-blue-400 font-bold text-sm tracking-widest uppercase animate-pulse">
                  Synchronizing Task...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <WorkspaceCanvas
            imageUrl={currentImage.url || ""}
            isReadOnly={isReadOnly}
            isPreviewMode={previewingSubmission !== null}
            previewSubmissionNumber={previewingSubmission}
            onRestoreCurrent={handleRestoreCurrent}
          />

          {/* AI Loading Overlay */}
          {isAiLoading && (
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-slate-800 border border-slate-600 rounded-xl px-6 py-5 w-72 shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                  <p className="text-white font-medium text-sm">
                    AI Analyzing Image
                  </p>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full w-2/5 bg-gradient-to-r from-purple-500 to-blue-400 rounded-full animate-progress" />
                </div>
                <p className="text-slate-400 text-xs mt-2">
                  Detecting objects and generating annotations...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <motion.div
          initial={false}
          animate={{
            width: isSidebarCollapsed ? 0 : 320,
            opacity: isSidebarCollapsed ? 0 : 1,
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="flex flex-col overflow-hidden border-l border-white/10 shadow-2xl z-30"
        >
          <WorkspaceSidebar
            isReadOnly={isReadOnly}
            initialTab={
              taskStatus === "rejected" ||
              (taskData.history && taskData.history.length > 0)
                ? "history"
                : "regions"
            }
            history={taskData.history}
            projectId={projectId}
            onPreviewAnnotations={handlePreviewAnnotations}
            onRestoreCurrent={handleRestoreCurrent}
            previewingSubmission={previewingSubmission}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </motion.div>

        {/* Toggle button when collapsed - floating on the right edge of canvas */}
        {isSidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-[60] flex items-center pr-2 pl-8 py-10 group/hitbox cursor-pointer"
            onClick={() => setIsSidebarCollapsed(false)}
          >
            <motion.button
              whileHover={{ width: 32, backgroundColor: "rgba(30, 41, 59, 0.8)" }}
              className="w-1.5 h-24 bg-blue-500/40 backdrop-blur-md rounded-full border border-white/5 shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all duration-500 group flex items-center justify-center overflow-hidden relative"
              title="Expand Sidebar"
            >
              <ChevronLeft className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-1 group-hover:translate-x-0" />
              
              {/* Subtle pulsing glow */}
              <div className="absolute inset-0 bg-blue-400/10 animate-pulse group-hover:hidden"></div>
            </motion.button>
          </motion.div>
        )}
      </div>

      <ReviewScoringModal
        key={`${taskId}-${isReviewModalOpen}`}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onConfirm={handleReviewConfirm}
        type={reviewType}
        isLoading={isReviewLoading}
        initialComment={""}
      />

      {/* Skip Confirm Dialog */}
      {isSkipConfirmOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 shadow-2xl max-w-md w-full mx-4 text-white">
            <h3 className="text-lg font-bold mb-1">Skip this task?</h3>
            <p className="text-slate-400 text-sm mb-4">
              This task will be returned to the pool for someone else to
              complete.
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
                onClick={() => {
                  setIsSkipConfirmOpen(false);
                  setSkipReason("");
                }}
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
