import { apiClient } from './auth.api';
import type { CreateProjectRequest, Project, ProjectListResponse, UpdateProjectRequest } from '../types/project.types';
import { ProjectStatus } from '../types/project.types';

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
    }
};
