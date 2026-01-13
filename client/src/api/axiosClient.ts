import axios from 'axios';
import { logger } from '../utils/logger';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies/sessions
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    logger.info(`📡 API Request: [${config.method?.toUpperCase()}] ${config.url}`);
    return config;
  },
  (error) => {
    logger.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    logger.success(`✅ API Response: [${response.config.method?.toUpperCase()}] ${response.config.url}`, {
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    if (error.response) {
      logger.error(`🚨 API Error Response: [${error.response.status}] ${error.config.url}`, error.response.data);
    } else if (error.request) {
      logger.error('🚨 API No Response:', error.request);
    } else {
      logger.error('🚨 API Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
