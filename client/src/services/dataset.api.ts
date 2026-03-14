import { apiClient } from "./auth.api";

export interface Dataset {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    images: number;
  };
  images?: any[]; // We can refine this type later if needed
}

export interface ImportedDataset extends Dataset {
  _taskCount?: number;
}

export interface CreateDatasetDto {
  name: string;
  description?: string;
  source?: string;
}

export const datasetApi = {
  /**
   * Get all datasets for a project
   */
  getProjectDatasets: async (projectId: string): Promise<Dataset[]> => {
    const response = await apiClient.get(`/projects/${projectId}/datasets`);
    return response.data;
  },

  /**
   * Get a single dataset by ID
   */
  getById: async (projectId: string, datasetId: string): Promise<Dataset> => {
    const response = await apiClient.get(
      `/projects/${projectId}/datasets/${datasetId}`,
    );
    return response.data;
  },

  /**
   * Create a new dataset
   */
  create: async (
    projectId: string,
    data: CreateDatasetDto,
  ): Promise<Dataset> => {
    const response = await apiClient.post(
      `/projects/${projectId}/datasets`,
      data,
    );
    return response.data;
  },

  /**
   * Delete a dataset
   */
  delete: async (projectId: string, datasetId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/datasets/${datasetId}`);
  },

  /**
   * Copy dataset from one project to another
   */
  copyDataset: async (
    sourceProjectId: string,
    datasetId: string,
    targetProjectId: string,
  ): Promise<ImportedDataset> => {
    const response = await apiClient.post(
      `/projects/${targetProjectId}/datasets/import`,
      {
        sourceProjectId,
        datasetId,
      },
    );
    return response.data;
  },
};
