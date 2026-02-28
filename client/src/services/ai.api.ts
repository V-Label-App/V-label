import { apiClient } from './auth.api';

const BASE_URL = '/ai';

export const aiApi = {
    /**
     * Refactor/improve text using AI
     */
    refactorText: async (text: string, context?: string) => {
        const response = await apiClient.post<{ refactoredText: string }>(
            `${BASE_URL}/refactor-text`,
            { text, context }
        );
        return response.data;
    },
};
