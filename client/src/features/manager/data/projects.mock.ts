import type { LegacyLabel as LabelType, LegacyLabelCategory as LabelCategory } from '../../../types/label.types';

export interface Task {
  id: string;
  imageUrl: string;
  imageName: string;
  status: 'pending' | 'assigned' | 'submitted' | 'approved';
  assignee: string | null;
  deadline: string | null;
  selected?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  annotationType: 'bounding-box' | 'polygon' | 'segmentation';
  deadline: string;
  createdAt: string;
  tasks: Task[];
  totalImages: number;
  assignedTo: string[];
  labelIds: string[]; // Assigned label IDs for this project
}

export interface Annotator {
  id: string;
  name: string;
  reputation: number;
}

export const annotators: Annotator[] = [
  { id: '1', name: 'Nguyen Van A', reputation: 98 },
  { id: '2', name: 'Lisa Chen', reputation: 92 },
  { id: '3', name: 'David Kim', reputation: 85 },
  { id: '4', name: 'Tran Thi B', reputation: 95 },
  { id: '5', name: 'Sarah Johnson', reputation: 88 },
];

export const initialLabels: LabelType[] = [
  // Medical Category
  { id: 'lbl-1', name: 'Tumor', color: '#EF4444', category: 'medical', description: 'Tumor or lesion detection', createdAt: '2026-01-10' },
  { id: 'lbl-2', name: 'Fracture', color: '#F59E0B', category: 'medical', description: 'Bone fracture identification', createdAt: '2026-01-10' },
  { id: 'lbl-3', name: 'Organ', color: '#10B981', category: 'medical', description: 'Organ segmentation', createdAt: '2026-01-10' },
  // Animals Category
  { id: 'lbl-4', name: 'Dog', color: '#3B82F6', category: 'animals', description: 'Dog detection', createdAt: '2026-01-11' },
  { id: 'lbl-5', name: 'Cat', color: '#8B5CF6', category: 'animals', description: 'Cat detection', createdAt: '2026-01-11' },
  { id: 'lbl-6', name: 'Bird', color: '#EC4899', category: 'animals', description: 'Bird species', createdAt: '2026-01-11' },
  // Vehicles Category
  { id: 'lbl-7', name: 'Car', color: '#06B6D4', category: 'vehicles', description: 'Car detection', createdAt: '2026-01-12' },
  { id: 'lbl-8', name: 'Truck', color: '#84CC16', category: 'vehicles', description: 'Truck detection', createdAt: '2026-01-12' },
  { id: 'lbl-9', name: 'Motorcycle', color: '#F97316', category: 'vehicles', description: 'Motorcycle detection', createdAt: '2026-01-12' },
];

export const initialCategories: LabelCategory[] = [
  { id: 'medical', name: 'Medical', description: 'Medical imaging and diagnosis', color: '#EF4444' },
  { id: 'animals', name: 'Animals', description: 'Animal and wildlife detection', color: '#3B82F6' },
  { id: 'vehicles', name: 'Vehicles', description: 'Vehicle and transportation objects', color: '#06B6D4' },
];

export const initialProjects: Project[] = [
  {
    id: 'PRJ-001',
    name: 'Medical Imaging Classification',
    description: 'Medical imaging dataset for diagnosis support',
    annotationType: 'bounding-box',
    deadline: '2026-01-31',
    createdAt: '2026-01-10',
    totalImages: 120,
    assignedTo: ['Nguyen Van A', 'Lisa Chen', 'David Kim'],
    labelIds: ['lbl-1', 'lbl-2', 'lbl-3'], // Medical labels
    tasks: [
      { id: 'T-001', imageUrl: '', imageName: 'scan_001.jpg', status: 'pending', assignee: null, deadline: null },
      { id: 'T-002', imageUrl: '', imageName: 'scan_002.jpg', status: 'assigned', assignee: 'Nguyen Van A', deadline: '2026-01-15' },
      { id: 'T-003', imageUrl: '', imageName: 'scan_003.jpg', status: 'submitted', assignee: 'Lisa Chen', deadline: '2026-01-14' },
      { id: 'T-004', imageUrl: '', imageName: 'scan_004.jpg', status: 'pending', assignee: null, deadline: null },
      { id: 'T-005', imageUrl: '', imageName: 'scan_005.jpg', status: 'assigned', assignee: 'David Kim', deadline: '2026-01-12' },
      { id: 'T-006', imageUrl: '', imageName: 'scan_006.jpg', status: 'approved', assignee: 'Nguyen Van A', deadline: '2026-01-13' },
    ],
  },
  {
    id: 'PRJ-002',
    name: 'Retail Product Detection',
    description: 'Object detection for retail inventory management',
    annotationType: 'bounding-box',
    deadline: '2026-02-15',
    createdAt: '2026-01-12',
    totalImages: 450,
    assignedTo: ['Tran Thi B', 'Sarah Johnson'],
    labelIds: ['lbl-4', 'lbl-5'], // Animal labels
    tasks: [],
  },
  {
    id: 'PRJ-003',
    name: 'Road Segmentation',
    description: 'Semantic segmentation for autonomous driving',
    annotationType: 'segmentation',
    deadline: '2026-02-28',
    createdAt: '2026-01-14',
    totalImages: 800,
    assignedTo: ['Lisa Chen', 'David Kim', 'Tran Thi B'],
    labelIds: ['lbl-7', 'lbl-8', 'lbl-9'], // Vehicle labels
    tasks: [],
  },
];


let projects: Project[] = [...initialProjects];

export const getProjects = () => [...projects];

export const getProjectById = (id: string) => projects.find(p => p.id === id);

export const addProject = (project: Project) => {
  projects = [project, ...projects];
  return project;
};

export const updateProject = (updatedProject: Project) => {
  projects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
  return updatedProject;
};

export const deleteProject = (projectId: string) => {
  projects = projects.filter(p => p.id !== projectId);
};

