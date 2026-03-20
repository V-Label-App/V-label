export const ProjectStatus = {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
    ARCHIVED: 'ARCHIVED'
} as const;

export type ProjectStatus = typeof ProjectStatus[keyof typeof ProjectStatus];

export const ProjectRole = {
    MANAGER: 'MANAGER',
    REVIEWER: 'REVIEWER',
    ANNOTATOR: 'ANNOTATOR'
} as const;

export type ProjectRole = typeof ProjectRole[keyof typeof ProjectRole];

export interface ProjectLabel {
    id: string;
    projectId: string;
    labelId: string;
    createdAt: string;
}

export interface ProjectMember {
    id: string;
    projectId: string;
    userId: string;
    projectRole: ProjectRole;
    joinedAt: string;
    user?: {
        id: string;
        email: string;
        fullName?: string;
        avatarUrl?: string;
    };
}

export interface AssignmentRule {
    id: string;
    projectId: string;
    isAutoAssignEnabled: boolean;
    assignmentStrategy: string;
    autoAssignReviewer: boolean;
    reviewerAssignmentStrategy: string;
    reviewerDelayHours: number;
    maxTasksPerAnnotator: number;
    maxTasksPerReviewer: number;
    minAnnotatorReputation: number;
    minReviewerReputation: number;
    maxRejectionsBeforeReassign: number;
    autoReassignOnSkip: boolean;
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    labelConfig?: any[]; // JSON
    deadline?: string; // ISO Date string
    enableAiAssistance: boolean;
    status: ProjectStatus;
    categoryId?: string;
    createdAt: string;
    updatedAt: string;
    assignmentRule?: AssignmentRule;

    // Relations (Optional, depending on query)
    members?: ProjectMember[];
    projectLabels?: {
        label: {
            id: string;
            name: string;
            color: string;
            category?: {
                id: string;
                name: string;
            };
        };
    }[];
    category?: {
        id: string;
        name: string;
        description?: string;
    };
    _count?: {
        tasks: number;
        members: number;
        images: number;
    };

    // Frontend specific helpers (might be computed)
    totalImages?: number;
    progress?: number;
}

export interface CreateProjectRequest {
    name: string;
    description?: string;
    categoryId?: string;
    deadline?: string;
    labelConfig?: any[];
    enableAiAssistance?: boolean;
}

export interface UpdateProjectRequest {
    name?: string;
    description?: string;
    categoryId?: string;
    deadline?: string;
    status?: ProjectStatus;
    labelConfig?: any[];
    enableAiAssistance?: boolean;
    assignmentRule?: Partial<Omit<AssignmentRule, 'id' | 'projectId'>>;
}

export interface ProjectListResponse {
    data: Project[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
