// AI Response Type Definitions
// Used by both backend and frontend to ensure type consistency

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
    action?: string;         // Function to call on submit
    title?: string;          // Optional title
    message?: string;        // Companion text from Gemini to display above the component
    validation?: ValidationSchema;
    quickReplies?: string[]; // Quick reply buttons from Gemini
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

// ==========================================
// Content Type Definitions
// ==========================================

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
    options?: string[];      // For select type
    defaultValue?: any;
    minLength?: number;
    maxLength?: number;
    pattern?: string;        // Regex pattern
    helpText?: string;
}

export interface CardContent {
    title: string;
    subtitle?: string;
    icon?: string;           // Icon name or emoji
    fields: Record<string, any>;
    actions?: ButtonAction[];
    variant?: 'default' | 'success' | 'warning' | 'error';
    data?: any;              // Additional structured data for frontend
}

export interface ButtonAction {
    label: string;
    action: string;
    variant?: 'primary' | 'secondary' | 'danger';
    data?: any;              // Additional data to pass
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
