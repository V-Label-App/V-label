import { apiClient } from './auth.api'

export interface ChatWidgetConfig {
    enabled: boolean;
    modelName: string;
    systemPrompt: string;
    knowledgeBase?: string; // Documentation content for AI context
    
    // Per-role custom prompts
    rolePrompts?: {
        MANAGER?: string;
        ANNOTATOR?: string;
        REVIEWER?: string;
        ADMIN?: string;
    };
    
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
    },

    getDefaultPrompts: async (): Promise<Record<string, string>> => {
        const response = await apiClient.get<Record<string, string>>('/admin/config/chat/defaults');
        return response.data;
    }
}
