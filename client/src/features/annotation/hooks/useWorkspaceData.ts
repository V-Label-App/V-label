import { useState, useEffect, useCallback } from "react";
import type { TaskAssignmentListItem } from "../../../services/annotator.api";
import { annotatorApi } from "../../../services/annotator.api";
import type { Annotation } from "../stores";

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
  reviewScore?: number;
  projectName: string;
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
}

/**
 * Custom hook to manage workspace task data and API interactions
 * @param assignmentId - The task assignment ID
 * @returns Task data and methods to interact with the API
 */
export const useWorkspaceData = (
  assignmentId: string,
): UseWorkspaceDataReturn => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [taskData, setTaskData] = useState<WorkspaceTaskData | null>(null);

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
        annotations: assignment.annotations || [],
        labels,
        annotatorNote: assignment.annotatorNote,
        reviewComment: assignment.reviewComment,
        reviewScore: assignment.reviewScore,
        projectName: assignment.task.project.name,
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

      const assignment = await annotatorApi.getTaskAssignment(assignmentId);
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
  }, [assignmentId, transformTaskData]);

  /**
   * Auto-save draft annotations
   */
  const saveDraft = useCallback(
    async (annotations: Annotation[], note?: string, timeSeconds?: number) => {
      try {
        await annotatorApi.saveDraft(assignmentId, {
          annotations,
          annotatorNote: note,
          actualTimeSeconds: timeSeconds,
        });
      } catch (err: any) {
        console.error("Failed to save draft:", err);
        if (err.response) {
          console.error("Server error response:", err.response.data);
        }
        throw err;
      }
    },
    [assignmentId],
  );

  /**
   * Submit task for review
   */
  const submitTask = useCallback(
    async (annotations: Annotation[], note?: string, timeSeconds?: number) => {
      try {
        await annotatorApi.updateTaskAssignment(assignmentId, {
          status: "SUBMITTED",
          annotations,
          annotatorNote: note,
          actualTimeSeconds: timeSeconds,
        });
      } catch (err) {
        console.error("Failed to submit task:", err);
        throw err;
      }
    },
    [assignmentId],
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
      } catch (err) {
        console.error("Failed to skip task:", err);
        throw err;
      }
    },
    [assignmentId],
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
  };
};
