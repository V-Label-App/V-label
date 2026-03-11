import { useLabelStore } from './stores/useLabelStore';

// Label color configuration (fallback for old labels)
export const labelColors: Record<string, { border: string; fill: string; bg: string }> = {
    'Normal': {
        border: '#3B82F6',
        fill: 'rgba(59, 130, 246, 0.2)',
        bg: 'bg-blue-100 text-blue-700'
    },
    'Abnormal': {
        border: '#EF4444',
        fill: 'rgba(239, 68, 68, 0.2)',
        bg: 'bg-red-100 text-red-700'
    },
    'Uncertain': {
        border: '#F59E0B',
        fill: 'rgba(245, 158, 11, 0.2)',
        bg: 'bg-amber-100 text-amber-700'
    },
};

export const availableLabels = ['Normal', 'Abnormal', 'Uncertain'];

// Helper to get label color (dynamic from project labels)
export function getLabelColor(labelName: string, opacity?: number): string {
    // Try to get from label store first
    const labelStore = useLabelStore.getState();
    const label = labelStore.labels.find(l => l.name === labelName);
    
    if (label) {
        const color = label.color;
        
        if (opacity !== undefined) {
            const rgb = hexToRgb(color);
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
        }
        
        return color;
    }
    
    // Fallback to old label colors
    const colors = labelColors[labelName];
    if (!colors) return '#3B82F6';

    if (opacity !== undefined) {
        const rgb = hexToRgb(colors.border);
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
    }

    return colors.border;
}

// Helper to get badge class for label
export function getLabelBadgeClass(labelName: string): string {
    // Try to get from label store first
    const labelStore = useLabelStore.getState();
    const label = labelStore.labels.find(l => l.name === labelName);
    
    if (label) {
        // Use dynamic styling for project labels
        return 'border border-current';
    }
    
    // Fallback to old label colors
    const colors = labelColors[labelName];
    return colors?.bg || 'bg-blue-100 text-blue-700';
}

// Helper to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 59, g: 130, b: 246 }; // Default blue
}

// Format timestamp to readable time
export function formatTime(timestamp?: number): string {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Generate unique ID for annotations
export function generateId(): string {
    return `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
