import { apiClient } from './auth.api';

export interface NotificationTemplate {
  id: string;
  type: string;
  titleTemplate: string;
  messageTemplate: string;
  variables: string[];
  isActive: boolean;
  updatedAt: string;
}

export const notificationTemplateApi = {
  getAll: async () => {
    const response = await apiClient.get<NotificationTemplate[]>('/admin/notifications/templates');
    return response.data;
  },

  update: async (type: string, data: Partial<NotificationTemplate>) => {
    const response = await apiClient.put<NotificationTemplate>(`/admin/notifications/templates/${type}`, data);
    return response.data;
  },

  broadcast: async (data: { title: string; message: string }) => {
    const response = await apiClient.post<{ success: boolean; count: number }>('/admin/notifications/templates/broadcast', data);
    return response.data;
  },
};
