import { apiClient } from './auth.api'

export interface ChatWidgetConfig {
    enabled: boolean;
    modelName: string;
    systemPrompt: string;
    temperature: number;
    ui: {
        themeColor: string;
        position: 'left' | 'right';
        welcomeMessage: string;
        botId: string;
        iconType: 'default' | 'custom';
        customIconUrl?: string;
        quickReplies: string[];
    };
}

export const chatSettingsApi = {
    getConfig: async (): Promise<ChatWidgetConfig> => {
        const response = await apiClient.get<ChatWidgetConfig>('/admin/config/chat');
        return response.data;
    },

    updateConfig: async (config: Partial<ChatWidgetConfig>): Promise<ChatWidgetConfig> => {
        const response = await apiClient.put<ChatWidgetConfig>('/admin/config/chat', config);
        return response.data;
    }
}
