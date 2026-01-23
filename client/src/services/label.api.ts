import { apiClient } from './auth.api';

// =========================================================
// TYPES
// =========================================================

export interface LabelCategory {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count?: {
    labels: number;
  };
}

export interface Label {
  id: string;
  name: string;
  color: string;
  isGlobal: boolean;
  categoryId: string | null;
  createdBy: string;
  createdAt: string;
  category?: LabelCategory | null;
  creator?: {
    id: string;
    fullName: string | null;
    email: string;
  };
  _count?: {
    projectLabels: number;
  };
}

export interface ProjectLabel {
  id: string;
  projectId: string;
  labelId: string;
  createdAt: string;
  label: Label;
}

export interface LabelRequest {
  id: string;
  projectId: string;
  requestedBy: string;
  labelName: string;
  suggestedColor: string | null;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  requester?: {
    id: string;
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
  };
  reviewer?: {
    id: string;
    fullName: string | null;
    email: string;
  } | null;
}

// =========================================================
// LABEL CATEGORIES API
// =========================================================

export const labelCategoryApi = {
  getAll: async (): Promise<LabelCategory[]> => {
    const response = await apiClient.get<{ success: boolean; data: LabelCategory[] }>('/labels/categories');
    return response.data.data;
  },

  getById: async (id: string): Promise<LabelCategory> => {
    const response = await apiClient.get<{ success: boolean; data: LabelCategory }>(`/labels/categories/${id}`);
    return response.data.data;
  },

  create: async (data: { name: string; description?: string }): Promise<LabelCategory> => {
    const response = await apiClient.post<{ success: boolean; data: LabelCategory }>('/labels/categories', data);
    return response.data.data;
  },

  update: async (id: string, data: { name?: string; description?: string }): Promise<LabelCategory> => {
    const response = await apiClient.put<{ success: boolean; data: LabelCategory }>(`/labels/categories/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/labels/categories/${id}`);
  },
};

// =========================================================
// LABELS API
// =========================================================

export interface LabelImportResult {
  success: boolean;
  categoriesCreated: number;
  labelsCreated: number;
  labelsSkipped: number;
  errors: string[];
}

export const labelApi = {
  getAll: async (filters?: { isGlobal?: boolean; categoryId?: string; search?: string }): Promise<Label[]> => {
    const params = new URLSearchParams();
    if (filters?.isGlobal !== undefined) params.append('isGlobal', String(filters.isGlobal));
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.get<{ success: boolean; data: Label[] }>(`/labels?${params.toString()}`);
    return response.data.data;
  },

  getById: async (id: string): Promise<Label> => {
    const response = await apiClient.get<{ success: boolean; data: Label }>(`/labels/${id}`);
    return response.data.data;
  },

  create: async (data: { name: string; color: string; isGlobal?: boolean; categoryId?: string }): Promise<Label> => {
    const response = await apiClient.post<{ success: boolean; data: Label }>('/labels', data);
    return response.data.data;
  },

  update: async (id: string, data: { name?: string; color?: string; isGlobal?: boolean; categoryId?: string | null }): Promise<Label> => {
    const response = await apiClient.put<{ success: boolean; data: Label }>(`/labels/${id}`, data);
    return response.data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/labels/${id}`);
  },

  // Import/Export methods
  exportCSV: async (): Promise<string> => {
    const response = await apiClient.get<string>('/labels/export', {
      responseType: 'text',
    });
    return response.data;
  },

  getTemplate: async (): Promise<string> => {
    const response = await apiClient.get<string>('/labels/template', {
      responseType: 'text',
    });
    return response.data;
  },

  importCSV: async (csvData: string): Promise<LabelImportResult> => {
    const response = await apiClient.post<{ success: boolean; data: LabelImportResult } | LabelImportResult>(
      '/labels/import',
      { csv: csvData }
    );
    // Handle both response formats
    if ('data' in response.data && response.data.data) {
      return response.data.data;
    }
    return response.data as LabelImportResult;
  },

  // Excel Import/Export methods
  exportExcel: async (): Promise<Blob> => {
    const response = await apiClient.get('/labels/export-excel', {
      responseType: 'blob',
    });
    return response.data;
  },

  getExcelTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get('/labels/template-excel', {
      responseType: 'blob',
    });
    return response.data;
  },

  importExcel: async (file: File): Promise<LabelImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ success: boolean; data: LabelImportResult } | LabelImportResult>(
      '/labels/import-excel',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    // Handle both response formats
    if ('data' in response.data && response.data.data) {
      return response.data.data;
    }
    return response.data as LabelImportResult;
  },
};

// =========================================================
// PROJECT LABELS API
// =========================================================

export const projectLabelApi = {
  getProjectLabels: async (projectId: string): Promise<ProjectLabel[]> => {
    const response = await apiClient.get<{ success: boolean; data: ProjectLabel[] }>(`/projects/${projectId}/labels`);
    return response.data.data;
  },

  getAvailableLabels: async (projectId: string): Promise<{ available: Label[]; assigned: Label[] }> => {
    const response = await apiClient.get<{ success: boolean; data: { available: Label[]; assigned: Label[] } }>(`/projects/${projectId}/labels/available`);
    return response.data.data;
  },

  assignLabel: async (projectId: string, labelId: string): Promise<ProjectLabel> => {
    const response = await apiClient.post<{ success: boolean; data: ProjectLabel }>(`/projects/${projectId}/labels`, { labelId });
    return response.data.data;
  },

  assignLabels: async (projectId: string, labelIds: string[]): Promise<{ count: number }> => {
    const response = await apiClient.post<{ success: boolean; data: { count: number } }>(`/projects/${projectId}/labels`, { labelIds });
    return response.data.data;
  },

  updateProjectLabels: async (projectId: string, labelIds: string[]): Promise<ProjectLabel[]> => {
    const response = await apiClient.put<{ success: boolean; data: ProjectLabel[] }>(`/projects/${projectId}/labels`, { labelIds });
    return response.data.data;
  },

  removeLabel: async (projectId: string, labelId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/labels/${labelId}`);
  },
};

// =========================================================
// LABEL REQUESTS API
// =========================================================

export const labelRequestApi = {
  getProjectRequests: async (projectId: string, status?: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<LabelRequest[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get<{ success: boolean; data: LabelRequest[] }>(`/projects/${projectId}/labels/requests${params}`);
    return response.data.data;
  },

  getPendingCount: async (projectId: string): Promise<number> => {
    const response = await apiClient.get<{ success: boolean; data: { count: number } }>(`/projects/${projectId}/labels/requests/pending-count`);
    return response.data.data.count;
  },

  createRequest: async (projectId: string, data: { labelName: string; suggestedColor?: string; reason?: string }): Promise<LabelRequest> => {
    const response = await apiClient.post<{ success: boolean; data: LabelRequest }>(`/projects/${projectId}/labels/requests`, data);
    return response.data.data;
  },

  approveRequest: async (projectId: string, requestId: string, categoryId?: string): Promise<{ request: LabelRequest; label: Label }> => {
    const response = await apiClient.put<{ success: boolean; data: { request: LabelRequest; label: Label } }>(
      `/projects/${projectId}/labels/requests/${requestId}/approve`,
      { categoryId }
    );
    return response.data.data;
  },

  rejectRequest: async (projectId: string, requestId: string, reason?: string): Promise<LabelRequest> => {
    const response = await apiClient.put<{ success: boolean; data: LabelRequest }>(
      `/projects/${projectId}/labels/requests/${requestId}/reject`,
      { reason }
    );
    return response.data.data;
  },
};
