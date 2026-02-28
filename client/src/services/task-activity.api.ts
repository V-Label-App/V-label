import { apiClient } from './auth.api';

export enum TaskAction {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  UNASSIGNED = 'UNASSIGNED',
  REASSIGNED = 'REASSIGNED',
  DEADLINE_UPDATED = 'DEADLINE_UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED',
  RESTORED = 'RESTORED',
  BULK_ASSIGNED = 'BULK_ASSIGNED',
  BULK_UNASSIGNED = 'BULK_UNASSIGNED',
  BULK_DELETED = 'BULK_DELETED',
}

export interface TaskActivity {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  action: TaskAction;
  metadata?: Record<string, any>;
  createdAt: string;
  user: {
    id: string;
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
    role?: string;
  };
  task?: {
    id: string;
    image?: {
      id: string;
      originalFilename: string | null;
      storageUrl: string;
    } | null;
  };
}

export interface ProjectActivitiesResponse {
  data: TaskActivity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const taskActivityApi = {
  /**
   * Get all activities for a project (paginated)
   */
  getProjectActivities: async (
    projectId: string,
    params?: {
      page?: number;
      limit?: number;
      action?: TaskAction;
      userId?: string;
    }
  ): Promise<ProjectActivitiesResponse> => {
    const response = await apiClient.get(`/projects/${projectId}/activities`, { params });
    return response.data;
  },

  /**
   * Get recent activities for dashboard feed
   */
  getRecentActivities: async (
    projectId: string,
    limit: number = 10
  ): Promise<TaskActivity[]> => {
    const response = await apiClient.get(`/projects/${projectId}/activities/recent`, {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get activity statistics for a project
   */
  getActivityStats: async (projectId: string): Promise<Record<TaskAction, number>> => {
    const response = await apiClient.get(`/projects/${projectId}/activities/stats`);
    return response.data;
  },

  /**
   * Get all activities for a specific task
   */
  getTaskActivities: async (taskId: string, limit: number = 50): Promise<TaskActivity[]> => {
    const response = await apiClient.get(`/tasks/${taskId}/activities`, {
      params: { limit },
    });
    return response.data;
  },
};

// Explicit re-export to ensure TypeScript recognizes all exports
export type { TaskActivity, ProjectActivitiesResponse };
