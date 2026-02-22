import { apiClient } from './auth.api';

export interface ReviewerProject {
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

export interface ReviewQueueItem {
    id: string;
    taskId: string;
    status: string;
    deadline: Date | null;
    annotations?: any;
    reviewScore?: number;
    reviewComment?: string;
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
    annotator: {
        id: string;
        fullName: string;
        email: string;
        avatarUrl?: string;
    };
}

export interface ReviewQueueResponse {
    data: ReviewQueueItem[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        reviewCounts: {
            pending: number;
            approved: number;
            rejected: number;
            total: number;
        };
    };
}

const BASE_URL = '/reviewer';

export const reviewerApi = {
    /**
     * Get all projects where user is a member as Reviewer
     */
    getMyProjects: async () => {
        const response = await apiClient.get<ReviewerProject[]>(`${BASE_URL}/projects`);
        return response.data;
    },

    /**
     * Get review queue (tasks submitted for review)
     */
    getReviewQueue: async (params?: {
        projectId?: string;
        status?: string;
        page?: number;
        limit?: number;
    }) => {
        const response = await apiClient.get<ReviewQueueResponse>(`${BASE_URL}/queue`, { params });
        return response.data;
    }
};
