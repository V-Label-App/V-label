import { apiClient } from './auth.api';

export interface WeeklyActivity {
    name: string; // Day name (Mon, Tue, etc.)
    completed: number;
    rejected: number;
}

export interface TaskDistribution {
    name: string;
    value: number;
    color: string;
}

export interface TodayProgress {
    time: string; // "9 AM", "10 AM", etc.
    tasks: number; // Cumulative count
}

const BASE_URL = '/performance';

export const performanceApi = {
    /**
     * Get weekly task activity (last 7 days)
     */
    getWeeklyActivity: async () => {
        const response = await apiClient.get<WeeklyActivity[]>(`${BASE_URL}/weekly-activity`);
        return response.data;
    },

    /**
     * Get task status distribution (pie chart data)
     */
    getTaskDistribution: async () => {
        const response = await apiClient.get<TaskDistribution[]>(`${BASE_URL}/task-distribution`);
        return response.data;
    },

    /**
     * Get today's hourly progress
     */
    getTodayProgress: async () => {
        const response = await apiClient.get<TodayProgress[]>(`${BASE_URL}/today-progress`);
        return response.data;
    }
};
