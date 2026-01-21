// Re-export types from the API service for backwards compatibility
export type { Label, LabelCategory, ProjectLabel, LabelRequest } from '../services/label.api';

// Legacy types for backwards compatibility with existing components
export interface LegacyLabel {
  id: string;
  name: string;
  color: string;
  category: string;
  description?: string;
  createdAt: string;
}

export interface LegacyLabelCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}
