import { useState, useEffect, useCallback } from "react";
import type { TaskAssignmentListItem } from "../../../services/annotator.api";
import { annotatorApi } from "../../../services/annotator.api";
import { reviewerApi } from "../../../services/reviewer.api";
import { projectApi } from "../../../services/project.api";
import { useImageStore } from "../stores";
import type { Annotation } from "../stores";
import { toast } from "sonner";

export interface WorkspaceTaskData {
  assignmentId: string;
  taskId: string;
  projectId: string;
  status: string;
  image: {
    id: string;
    url: string;
    filename: string;
    width: number;
    height: number;
  };
  annotations: Annotation[];
  labels: Array<{
    id: string;
    name: string;
    color: string;
    category?: string;
  }>;
  annotatorNote?: string;
  reviewComment?: string;
  annotator?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    reputationScore?: number;
  };
  projectName: string;
  actualTimeSeconds?: number;
  enableAiAssistance: boolean;
  updatedAt: string;
  deadline?: string;
}

export interface UseWorkspaceDataReturn {
  loading: boolean;
  error: Error | null;
  taskData: WorkspaceTaskData | null;
  loadData: () => Promise<void>;
  saveDraft: (
    annotations: Annotation[],
    note?: string,
    timeSeconds?: number,
  ) => Promise<void>;
  submitTask: (
    annotations: Annotation[],
    note?: string,
    timeSeconds?: number,
  ) => Promise<void>;
  skipTask: (reason?: string, timeSeconds?: number) => Promise<void>;
  resumeTask: () => Promise<void>;
  approveTask: (note?: string) => Promise<void>;
  rejectTask: (reason: string) => Promise<void>;
}

/**
 * Custom hook to manage workspace task data and API interactions
 * @param assignmentId - The task assignment ID
 * @param isManagerReview - If true, uses manager API endpoint
 * @param mode - 'annotate' or 'review' mode
 * @returns Task data and methods to interact with the API
 */
export const useWorkspaceData = (
  assignmentId: string,
  isManagerReview = false,
  mode: "annotate" | "review" = "annotate",
): UseWorkspaceDataReturn => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [taskData, setTaskData] = useState<WorkspaceTaskData | null>(null);
  const updateImageStatus = useImageStore((state) => state.updateImageStatus);

  /**
   * Transform API response to internal workspace format
   */
  const transformTaskData = useCallback(
    (assignment: TaskAssignmentListItem): WorkspaceTaskData => {
      const image = assignment.task.image;

      if (!image) {
        throw new Error("Task image not found");
      }

      // Extract labels from project
      const labels =
        assignment.task.project.projectLabels?.map((pl) => ({
          id: pl.label.id,
          name: pl.label.name,
          color: pl.label.color,
          category: pl.label.category?.name,
        })) || [];

      return {
        assignmentId: assignment.id,
        taskId: assignment.taskId,
        projectId: assignment.task.project.id,
        status: assignment.status,
        image: {
          id: image.id,
          url: image.storageUrl,
          filename: image.originalFilename,
          width: image.width,
          height: image.height,
        },
        annotations: (assignment.annotations as Annotation[]) || [],
        labels,
        annotatorNote: assignment.annotatorNote,
        reviewComment: assignment.reviewComment,
        annotator: assignment.annotator,
        projectName: assignment.task.project.name,
        actualTimeSeconds: assignment.actualTimeSeconds,
        enableAiAssistance: assignment.task.project.enableAiAssistance ?? false,
        updatedAt: assignment.updatedAt,
        deadline: assignment.deadline ? String(assignment.deadline) : undefined,
      };
    },
    [],
  );

  /**
   * Load task data from API
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let assignment;
      if (mode === "review") {
        // Reviewer mode: use reviewer API
        assignment = await reviewerApi.getAssignmentDetail(assignmentId);
      } else if (isManagerReview) {
        // Manager review mode
        assignment = await projectApi.getTaskAssignmentForReview(assignmentId);
      } else {
        // Annotator mode
        assignment = await annotatorApi.getTaskAssignment(assignmentId);
      }

      const transformedData = transformTaskData(assignment);

      setTaskData(transformedData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load task data";
      const error = new Error(errorMessage);
      setError(error);
      console.error("Failed to load task data:", err);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, isManagerReview, mode, transformTaskData]);

  /**
   * Auto-save draft annotations
   */
  const saveDraft = useCallback(
    async (annotations: Annotation[], note?: string, timeSeconds?: number) => {
      try {
        const updatedAssignment = await annotatorApi.saveDraft(assignmentId, {
          annotations,
          annotatorNote: note,
          actualTimeSeconds: timeSeconds,
        });

        // Update local task data if the status or annotations changed on the server
        if (updatedAssignment) {
          const transformed = transformTaskData(updatedAssignment);
          setTaskData(transformed);
          // Also sync with the image store to keep the navigator updated
          updateImageStatus(assignmentId, transformed.status.toLowerCase() as any);
        }
      } catch (err: any) {
        console.error("Failed to save draft:", err);
        if (err.response) {
          console.error("Server error response:", err.response.data);
        }
        throw err;
      }
    },
    [assignmentId, transformTaskData, updateImageStatus],
  );

  /**
   * Submit task for review
   */
  const submitTask = useCallback(
    async (annotations: Annotation[], note?: string, timeSeconds?: number) => {
      try {
        // Backend rejects direct ASSIGNED -> SUBMITTED transition
        // We ensure it's IN_PROGRESS first if it's currently ASSIGNED
        if (taskData?.status === "ASSIGNED") {
          await annotatorApi.updateTaskAssignment(assignmentId, {
            status: "IN_PROGRESS",
          });
        }

        await annotatorApi.updateTaskAssignment(assignmentId, {
          status: "SUBMITTED",
          annotations,
          annotatorNote: note,
          actualTimeSeconds: timeSeconds,
        });
        updateImageStatus(assignmentId, "submitted");
        setTaskData((prev) => (prev ? { ...prev, status: "SUBMITTED" } : null));
      } catch (err: any) {
        console.error("Failed to submit task:", err);
        if (err.response) {
          console.error("Server error response:", err.response.data);
        }
        throw err;
      }
    },
    [assignmentId, taskData?.status, updateImageStatus],
  );

  /**
   * Skip current task with a mandatory reason
   */
  const skipTask = useCallback(
    async (reason?: string, timeSeconds?: number) => {
      try {
        await annotatorApi.updateTaskAssignment(assignmentId, {
          status: "SKIPPED",
          annotatorNote: reason,
          actualTimeSeconds: timeSeconds,
        });
        updateImageStatus(assignmentId, "skipped");
        setTaskData((prev) => (prev ? { ...prev, status: "SKIPPED" } : null));
        // Reloader after status change to get fresh state
        await loadData();
      } catch (err: any) {
        console.error("Failed to skip task:", err);
        if (err.response) {
          console.error("Server error response:", err.response.data);
        }
        throw err;
      }
    },
    [assignmentId, loadData, updateImageStatus],
  );

  /**
   * Resume a skipped or submitted task back to IN_PROGRESS
   */
  const resumeTask = useCallback(async () => {
    try {
      await annotatorApi.updateTaskAssignment(assignmentId, {
        status: "IN_PROGRESS",
      });
      updateImageStatus(assignmentId, "in_progress");
      setTaskData((prev) => (prev ? { ...prev, status: "IN_PROGRESS" } : null));
      // Refresh local data to reflect status change
      await loadData();
      toast.success("Task resumed. You can now continue annotating.");
    } catch (err: any) {
      console.error("Failed to resume task:", err);
      if (err.response) {
        console.error("Server error response:", err.response.data);
      }
      throw err;
    }
  }, [assignmentId, loadData]);

  /**
   * Approve task (Reviewer only)
   */
  const approveTask = useCallback(
    async (note?: string) => {
      try {
        await reviewerApi.approveTask(assignmentId, { 
          reviewComment: note
        });
        toast.success("Task approved successfully");
        updateImageStatus(assignmentId, "approved");
        setTaskData((prev) => (prev ? { ...prev, status: "APPROVED" } : null));
      } catch (err: any) {
        console.error("Failed to approve task:", err);
        toast.error(err.response?.data?.error || "Failed to approve task");
        throw err;
      }
    },
    [assignmentId, updateImageStatus],
  );

  /**
   * Reject task (Reviewer only)
   */
  const rejectTask = useCallback(
    async (reason: string) => {
      try {
        await reviewerApi.rejectTask(assignmentId, { 
          reviewComment: reason
        });
        toast.success("Task rejected successfully");
        updateImageStatus(assignmentId, "rejected");
        setTaskData((prev) => (prev ? { ...prev, status: "REJECTED" } : null));
      } catch (err: any) {
        console.error("Failed to reject task:", err);
        toast.error(err.response?.data?.error || "Failed to reject task");
        throw err;
      }
    },
    [assignmentId, updateImageStatus],
  );

  // Load data on mount
  useEffect(() => {
    if (assignmentId) {
      loadData();
    }
  }, [assignmentId, loadData]);

  return {
    loading,
    error,
    taskData,
    loadData,
    saveDraft,
    submitTask,
    skipTask,
    resumeTask,
    approveTask,
    rejectTask,
  };
};
