import { apiClient } from './auth.api';

export interface ChatMessage {
    id: string;
    projectId: string;
    senderId: string;
    content: string;
    createdAt: string;
    sender: {
        id: string;
        fullName: string | null;
        avatarUrl: string | null;
    };
}

export interface ChatHistoryResponse {
    messages: ChatMessage[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const chatApi = {
    getMessages: async (projectId: string, page = 1, limit = 50): Promise<ChatHistoryResponse> => {
        const response = await apiClient.get(`/chat/projects/${projectId}/messages`, {
            params: { page, limit }
        });
        return response.data;
    },

    clearHistory: async (projectId: string): Promise<{ message: string }> => {
        const response = await apiClient.delete(`/chat/projects/${projectId}/messages`);
        return response.data;
    }
};
