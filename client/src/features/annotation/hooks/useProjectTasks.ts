import { useState, useEffect, useCallback, useMemo } from 'react';
import { annotatorApi, type TaskAssignmentListItem } from '../../../services/annotator.api';
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
 * @returns Task list and navigation helpers
 */
export const useProjectTasks = (projectId?: string): UseProjectTasksReturn => {
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

            // Get all tasks in project (paginated, but we'll get a reasonable limit)
            const response = await annotatorApi.getMyTasks({
                projectId,
                limit: 100 // Load up to 100 tasks for navigation
            });

            setTasks(response.data);
        } catch (err) {
            console.error('[useProjectTasks] Failed to load project tasks:', err);
            setError(err instanceof Error ? err : new Error('Failed to load project tasks'));
        } finally {
            setLoading(false);
        }
    }, []);

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
