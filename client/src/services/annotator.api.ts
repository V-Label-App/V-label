import { apiClient } from './auth.api';

export interface TaskAssignmentListItem {
    id: string;
    taskId: string;
    status: string;
    deadline: Date | null;
    annotatorNote?: string;
    reviewComment?: string;
    reviewScore?: number;
    task: {
        id: string;
        priority: string;
        difficultyLevel: string;
        image: {
            id: string;
            storageUrl: string;
            originalFilename: string;
            width: number;
            height: number;
        } | null;
        project: {
            id: string;
            name: string;
            labelConfig: any[];
            projectLabels?: {
                label: {
                    id: string;
                    name: string;
                    color: string;
                    category?: {
                        id: string;
                        name: string;
                    };
                };
            }[];
        };
    };
}

export interface AnnotatorProject {
    id: string;
    name: string;
    description?: string;
    status: string;
    progress?: number;
    category?: {
        id: string;
        name: string;
    };
    _count: {
        tasks: number;
        members: number;
    };
}

export interface TaskListResponse {
    data: TaskAssignmentListItem[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        taskCounts: {
            assigned: number;
            submitted: number;
            rejected: number;
            inProgress: number;
            total: number;
        };
    };
}

const BASE_URL = '/annotator';

export const annotatorApi = {
    /**
     * Get all projects where user is a member as Annotator
     */
    getMyProjects: async () => {
        const response = await apiClient.get<AnnotatorProject[]>(`${BASE_URL}/projects`);
        return response.data;
    },

    /**
     * Get task assignments for current user
     */
    getMyTasks: async (params?: {
        projectId?: string;
        status?: string;
        page?: number;
        limit?: number;
    }) => {
        const response = await apiClient.get<TaskListResponse>(`${BASE_URL}/tasks`, { params });
        return response.data;
    },

    /**
     * Get single task assignment with full details
     */
    getTaskAssignment: async (assignmentId: string) => {
        const response = await apiClient.get<TaskAssignmentListItem>(`${BASE_URL}/tasks/${assignmentId}`);
        return response.data;
    },

    /**
     * Update task assignment (submit, add note, mark in progress)
     */
    updateTaskAssignment: async (assignmentId: string, updates: {
        status?: string;
        annotations?: any;
        annotatorNote?: string;
    }) => {
        const response = await apiClient.patch<TaskAssignmentListItem>(
            `${BASE_URL}/tasks/${assignmentId}`,
            updates
        );
        return response.data;
    },

    /**
     * Save draft annotations (auto-save)
     */
    saveDraft: async (assignmentId: string, data: {
        annotations?: any;
        annotatorNote?: string;
        actualTimeSeconds?: number;
    }) => {
        const response = await apiClient.put<TaskAssignmentListItem>(
            `${BASE_URL}/tasks/${assignmentId}/draft`,
            data
        );
        return response.data;
    }
};
