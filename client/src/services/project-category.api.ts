import { apiClient } from './auth.api';

export interface ProjectCategory {
    id: string;
    name: string;
    description?: string | null;
    createdAt: string;
    updatedAt: string;
    _count?: {
        projects: number;
    };
    projects?: {
        id: string;
        name: string;
    }[];
}

export interface CreateProjectCategoryRequest {
    name: string;
    description?: string;
}

export interface UpdateProjectCategoryRequest {
    name?: string;
    description?: string;
}

/**
 * Project Category API Service
 */
export const projectCategoryApi = {
    /**
     * Get all project categories
     */
    getAll: async (): Promise<ProjectCategory[]> => {
        const response = await apiClient.get<ProjectCategory[]>('/project-categories');
        return response.data;
    },

    /**
     * Create a new project category (Admin/Manager only)
     */
    create: async (data: CreateProjectCategoryRequest): Promise<ProjectCategory> => {
        const response = await apiClient.post<ProjectCategory>('/project-categories', data);
        return response.data;
    },

    /**
     * Update a project category (Admin/Manager only)
     */
    update: async (id: string, data: UpdateProjectCategoryRequest): Promise<ProjectCategory> => {
        const response = await apiClient.put<ProjectCategory>(`/project-categories/${id}`, data);
        return response.data;
    },

    /**
     * Delete a project category (Admin/Manager only)
     */
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/project-categories/${id}`);
    },
};
