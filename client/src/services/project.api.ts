import { apiClient } from './auth.api';
import type { CreateProjectRequest, Project, ProjectListResponse, UpdateProjectRequest } from '../types/project.types';
import { ProjectStatus } from '../types/project.types';

export interface ProjectHealthStats {
    stuck: number;
    problematic: number;
    orphaned: number;
    totalIssues: number;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

const BASE_URL = '/projects';

export const projectApi = {
    /**
     * Get all projects with pagination and filtering
     */
    getAll: async (params?: {
        page?: number;
        limit?: number;
        search?: string;
        categoryId?: string;
        status?: ProjectStatus;
    }) => {
        const response = await apiClient.get<ProjectListResponse>(BASE_URL, { params });
        return response.data;
    },

    /**
     * Get a single project by ID
     */
    getById: async (id: string) => {
        const response = await apiClient.get<Project>(`${BASE_URL}/${id}`);
        return response.data;
    },

    /**
     * Create a new project
     */
    create: async (data: CreateProjectRequest) => {
        const response = await apiClient.post<Project>(BASE_URL, data);
        return response.data;
    },

    /**
     * Update an existing project
     */
    update: async (id: string, data: UpdateProjectRequest) => {
        const response = await apiClient.put<Project>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    /**
     * Delete (archive) a project
     */
    delete: async (id: string) => {
        const response = await apiClient.delete(`${BASE_URL}/${id}`);
        return response.data;
    },

    /**
     * Get all members of a project
     */
    getMembers: async (projectId: string) => {
        const response = await apiClient.get<any[]>(`${BASE_URL}/${projectId}/members`);
        return response.data;
    },

    /**
     * Search for potential members to add
     */
    searchPotentialMembers: async (projectId: string, query: string) => {
        const response = await apiClient.get<any[]>(`${BASE_URL}/${projectId}/potential-members`, {
            params: { search: query }
        });
        return response.data;
    },

    /**
     * Add a member to the project
     */
    addMember: async (projectId: string, userId: string, role: string) => {
        const response = await apiClient.post(`${BASE_URL}/${projectId}/members`, { userId, role });
        return response.data;
    },

    /**
     * Remove a member from the project
     */
    /**
     * Remove a member from the project
     */
    removeMember: async (projectId: string, userId: string) => {
        const response = await apiClient.delete(`${BASE_URL}/${projectId}/members/${userId}`);
        return response.data;
    },

    /**
     * Update a member's role
     */
    updateMemberRole: async (projectId: string, userId: string, role: string) => {
        const response = await apiClient.patch(`${BASE_URL}/${projectId}/members/${userId}`, { role });
        return response.data;
    },
    /**
     * Upload an image to the project (and optional dataset)
     */
    uploadImage: async (projectId: string, file: File, datasetId?: string, batchSessionId?: string) => {
        const formData = new FormData();
        formData.append('image', file);
        if (datasetId) {
            formData.append('datasetId', datasetId);
        }
        if (batchSessionId) {
            formData.append('batchSessionId', batchSessionId);
        }

        const response = await apiClient.post(`${BASE_URL}/${projectId}/images`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    /**
     * Batch upload images to the project
     */
    uploadImagesBatch: async (projectId: string, files: File[], datasetId?: string) => {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('images', file);
        });
        if (datasetId) {
            formData.append('datasetId', datasetId);
        }

        const response = await apiClient.post(`${BASE_URL}/${projectId}/images/batch`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    /**
     * Get images for a project
     */
    getImages: async (projectId: string, params?: {
        page?: number;
        limit?: number;
        datasetId?: string | 'null';
        search?: string;
    }) => {
        const response = await apiClient.get<any>(`${BASE_URL}/${projectId}/images`, { params });
        return response.data;
    },

    /**
     * Delete an image from the project
     */
    deleteImage: async (projectId: string, imageId: string) => {
        const response = await apiClient.delete(`${BASE_URL}/${projectId}/images/${imageId}`);
        return response.data;
    },

    /**
     * Bulk delete images
     */
    deleteImages: async (projectId: string, imageIds: string[]) => {
        const response = await apiClient.delete(`${BASE_URL}/${projectId}/images/batch`, {
            data: { imageIds }
        });
        return response.data;
    },

    /**
     * Get Project Health Statistics
     */
    getHealthStats: async (projectId: string) => {
        const response = await apiClient.get<ProjectHealthStats>(`${BASE_URL}/${projectId}/health`);
        return response.data;
    },

    /**
     * Get Rescue Tasks (Stuck, Problematic, Orphaned)
     */
    getRescueTasks: async (projectId: string, type: 'STUCK' | 'PROBLEMATIC' | 'ORPHANED') => {
        const response = await apiClient.get<any[]>(`${BASE_URL}/${projectId}/rescue`, {
            params: { type }
        });
        return response.data;
    },

    /**
     * Get tasks for a project with assignment information
     */
    getTasks: async (projectId: string, params?: {
        page?: number;
        limit?: number;
        status?: string;
        assigneeId?: string;
    }) => {
        const response = await apiClient.get<any>(`${BASE_URL}/${projectId}/tasks`, { params });
        return response.data;
    },

    /**
     * Manually assign a task to an annotator
     */
    assignTask: async (projectId: string, taskId: string, annotatorId: string, deadline?: Date, reason?: string) => {
        const response = await apiClient.post(`${BASE_URL}/${projectId}/tasks/${taskId}/assign`, {
            annotatorId,
            ...(deadline && { deadline: deadline.toISOString() }),
            ...(reason && { reason })
        });
        return response.data;
    },

    /**
     * Unassign a task (remove assignment)
     */
    unassignTask: async (projectId: string, taskId: string) => {
        const response = await apiClient.delete(`${BASE_URL}/${projectId}/tasks/${taskId}/unassign`);
        return response.data;
    },

    /**
     * Bulk assign multiple tasks to an annotator
     */
    bulkAssignTasks: async (projectId: string, taskIds: string[], annotatorId: string, deadline?: Date) => {
        const response = await apiClient.post(`${BASE_URL}/${projectId}/tasks/bulk-assign`, {
            taskIds,
            annotatorId,
            deadline: deadline?.toISOString()
        });
        return response.data;
    },

    /**
     * Bulk unassign multiple tasks
     */
    bulkUnassignTasks: async (projectId: string, taskIds: string[]) => {
        const response = await apiClient.post(`${BASE_URL}/${projectId}/tasks/bulk-unassign`, {
            taskIds
        });
        return response.data;
    },

    /**
     * Update task deadline
     */
    updateTaskDeadline: async (projectId: string, taskId: string, deadline: Date) => {
        const response = await apiClient.patch(`${BASE_URL}/${projectId}/tasks/${taskId}/deadline`, {
            deadline: deadline.toISOString()
        });
        return response.data;
    },

    /**
     * Get user workloads for a project
     */
    getWorkloads: async (projectId: string) => {
        const response = await apiClient.get<any[]>(`${BASE_URL}/${projectId}/workloads`);
        return response.data;
    }
};
