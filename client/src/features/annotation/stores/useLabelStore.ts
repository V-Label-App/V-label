import { create } from 'zustand';

export interface Label {
    id: string;
    name: string;
    color: string;
    category?: string;
}

interface LabelState {
    labels: Label[];
    activeLabel: Label | null;
    setLabels: (labels: Label[]) => void;
    setActiveLabel: (label: Label | null) => void;
    clearLabels: () => void;
    getLabelColor: (labelName: string) => string;
}

export const useLabelStore = create<LabelState>((set, get) => ({
    labels: [],
    activeLabel: null,

    setLabels: (labels) => set({ 
        labels,
        activeLabel: labels.length > 0 ? labels[0] : null
    }),

    setActiveLabel: (activeLabel) => set({ activeLabel }),

    clearLabels: () => set({ labels: [], activeLabel: null }),

    getLabelColor: (labelName) => {
        const label = get().labels.find(l => l.name === labelName);
        return label?.color || '#3B82F6'; // Default blue if not found
    },
}));
