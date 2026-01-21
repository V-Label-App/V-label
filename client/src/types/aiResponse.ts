// AI Response Type Definitions (Client-side)
// Mirrored from server/src/types/aiResponse.types.ts

export type AIResponseType =
    | 'text'           // Plain markdown text
    | 'table'          // Data table with sorting/filtering
    | 'form'           // Interactive form  
    | 'card'           // Info card with fields
    | 'action_buttons' // Quick action buttons
    | 'chart';         // Data visualization

export interface AIResponse {
    type: AIResponseType;
    content: any;
    metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
    action?: string;
    title?: string;
    validation?: ValidationSchema;
}

export interface ValidationSchema {
    [field: string]: {
        required?: boolean;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        message?: string;
    };
}

// Content Type Definitions
export interface TableContent {
    headers: string[];
    rows: any[][];
    actions?: ButtonAction[];
    sortable?: boolean;
    filterable?: boolean;
}

export interface FormContent {
    id: string;
    title: string;
    description?: string;
    fields: FormField[];
}

export interface FormField {
    name: string;
    type: 'text' | 'email' | 'password' | 'select' | 'number' | 'date' | 'textarea';
    label: string;
    placeholder?: string;
    required?: boolean;
    options?: string[];
    defaultValue?: any;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    helpText?: string;
}

export interface CardContent {
    title: string;
    subtitle?: string;
    icon?: string;
    fields: Record<string, any>;
    actions?: ButtonAction[];
    variant?: 'default' | 'success' | 'warning' | 'error';
}

export interface ButtonAction {
    label: string;
    action: string;
    variant?: 'primary' | 'secondary' | 'danger';
    data?: any;
}

export interface ActionButtonsContent {
    title?: string;
    description?: string;
    buttons: ButtonAction[];
}

export interface ChartContent {
    type: 'bar' | 'line' | 'pie' | 'area';
    data: {
        labels: string[];
        datasets: {
            label: string;
            data: number[];
            backgroundColor?: string | string[];
            borderColor?: string | string[];
        }[];
    };
    options?: any;
}
