export interface Label {
  id: string;
  name: string;
  color: string;
  category: string;
  description?: string;
  createdAt: string;
}

export interface LabelCategory {
  id: string;
  name: string;
  description: string;
  color: string;
}
