import { apiClient } from './auth.api';

const BASE_URL = '/ai';

export interface AISuggestion {
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
}

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

    /**
     * Suggest bounding box annotations for an image
     */
    suggestAnnotations: async (
        imageUrl: string,
        labels: Array<{ name: string; color: string }>,
        imageWidth: number,
        imageHeight: number
    ) => {
        const response = await apiClient.post<{ suggestions: AISuggestion[] }>(
            `${BASE_URL}/suggest-annotations`,
            { imageUrl, labels, imageWidth, imageHeight }
        );
        return response.data;
    },
};
