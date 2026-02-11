import apiClient from '../api/axiosClient';

export interface ImageQualityConfig {
    minResolution: number;
    minBrightness: number;
    maxBrightness: number;
    blurThreshold: number;
}

export const systemApi = {
    getImageQualityConfig: async (): Promise<ImageQualityConfig> => {
        const response = await apiClient.get('/config/image-quality');
        return response.data;
    },

    updateImageQualityConfig: async (config: Partial<ImageQualityConfig>): Promise<ImageQualityConfig> => {
        const response = await apiClient.put('/admin/config/image-quality', config);
        return response.data;
    },

    // Admin specific call (uses admin route)
    getAdminImageQualityConfig: async (): Promise<ImageQualityConfig> => {
        const response = await apiClient.get('/admin/config/image-quality');
        return response.data;
    }
};
