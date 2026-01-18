import { apiClient } from './auth.api';

export interface EmailConfig {
  id?: string;
  provider: 'smtp' | 'sendgrid' | 'aws_ses';
  config: any;
  isActive: boolean;
}

export interface EmailTemplate {
  type: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables: string[];
  enabled: boolean;
  updatedAt?: string;
}

export interface EmailLog {
  id: string;
  to: string;
  from: string;
  subject: string;
  templateType?: string;
  status: 'sent' | 'failed';
  error?: string;
  sentAt: string;
}

export const adminApi = {
  // Email Config
  getEmailConfig: async () => {
    const response = await apiClient.get<EmailConfig>('/admin/config/email');
    return response.data;
  },
  updateEmailConfig: async (config: Partial<EmailConfig>) => {
    const response = await apiClient.put<EmailConfig>('/admin/config/email', config);
    return response.data;
  },

  // Email Templates
  getEmailTemplates: async () => {
    const response = await apiClient.get<EmailTemplate[]>('/admin/email/templates');
    return response.data;
  },
  upsertEmailTemplate: async (template: Partial<EmailTemplate>) => {
    const response = await apiClient.post<EmailTemplate>('/admin/email/templates', template);
    return response.data;
  },
  deleteEmailTemplate: async (type: string) => {
    const response = await apiClient.delete(`/admin/email/templates/${type}`);
    return response.data;
  },

  // Email Logs
  getEmailLogs: async () => {
    const response = await apiClient.get<EmailLog[]>('/admin/email/logs');
    return response.data;
  },
};
