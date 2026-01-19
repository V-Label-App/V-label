import { apiClient } from '../../../services/auth.api';

export interface PublicChatConfig {
    enabled: boolean;
    modelName?: string;
    ui: {
        themeColor: string;
        position: 'left' | 'right';
        welcomeMessage?: string;
        iconType?: 'default' | 'custom';
        customIconUrl?: string;
        quickReplies: string[];
    };
    botId: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    parts: string;
    timestamp?: number;
}

export const chatWidgetApi = {
    getConfig: async (): Promise<PublicChatConfig> => {
        const response = await apiClient.get<PublicChatConfig>('/ai/config');
        return response.data;
    },

    sendMessage: async (message: string, history: ChatMessage[]): Promise<{ text: string }> => {
        const response = await apiClient.post<{ text: string }>('/ai/chat/completion', {
            message,
            history
        });
        return response.data;
    }
};
