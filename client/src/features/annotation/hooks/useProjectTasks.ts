import { useState, useEffect, useCallback, useMemo } from 'react';
import { annotatorApi, type TaskAssignmentListItem } from '../../../services/annotator.api';
import { reviewerApi } from '../../../services/reviewer.api';
import type { ImageTask } from '../stores';

export interface UseProjectTasksReturn {
    loading: boolean;
    error: Error | null;
    tasks: TaskAssignmentListItem[];
    imageTasks: ImageTask[];
    loadProjectTasks: (projectId: string) => Promise<void>;
    findTaskIndex: (assignmentId: string) => number;
}

/**
 * Custom hook to load all tasks in a project for navigation
 * @param projectId - The project ID to load tasks from
 * @param mode - The workspace mode ('annotate' or 'review')
 * @returns Task list and navigation helpers
 */
export const useProjectTasks = (projectId?: string, mode: 'annotate' | 'review' = 'annotate'): UseProjectTasksReturn => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [tasks, setTasks] = useState<TaskAssignmentListItem[]>([]);

    /**
     * Load all tasks for the current project
     */
    const loadProjectTasks = useCallback(async (projectId: string) => {
        try {
            setLoading(true);
            setError(null);

            let responseData: TaskAssignmentListItem[] = [];

            if (mode === 'review') {
                // For reviewers, get items from the review queue for this project
                const response = await reviewerApi.getReviewQueue({
                    projectId,
                    limit: 100
                });
                // Map ReviewQueueItem to TaskAssignmentListItem (they are compatible)
                responseData = response.data as any;
            } else {
                // For annotators, get their specific tasks
                const response = await annotatorApi.getMyTasks({
                    projectId,
                    limit: 100
                });
                responseData = response.data;
            }

            setTasks(responseData);
        } catch (err) {
            console.error('[useProjectTasks] Failed to load project tasks:', err);
            setError(err instanceof Error ? err : new Error('Failed to load project tasks'));
        } finally {
            setLoading(false);
        }
    }, [mode]);

    /**
     * Find index of a task by its assignmentId
     */
    const findTaskIndex = useCallback((assignmentId: string): number => {
        const index = tasks.findIndex(t => t.id === assignmentId);
        return index >= 0 ? index : 0;
    }, [tasks]);

    /**
     * Transform tasks to ImageTask format for ImageNavigator
     * Memoized to prevent infinite loops from reference changes
     */
    const imageTasks: ImageTask[] = useMemo(() => tasks.map(task => ({
        id: task.id, // Use assignmentId for navigation
        filename: task.task.image?.originalFilename || 'Unknown',
        status: task.status.toLowerCase() as ImageTask['status'],
        url: task.task.image?.storageUrl || '',
        thumbnail: task.task.image?.storageUrl || '',
        width: task.task.image?.width,
        height: task.task.image?.height,
        annotationCount: 0 // Will be updated when task detail is loaded
    })), [tasks]);

    // Auto-load when projectId changes
    useEffect(() => {
        if (projectId) {
            loadProjectTasks(projectId);
        }
    }, [projectId, loadProjectTasks]);

    return {
        loading,
        error,
        tasks,
        imageTasks,
        loadProjectTasks,
        findTaskIndex
    };
};
