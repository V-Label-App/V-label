import { create } from 'zustand';

export interface Label {
    id: string;
    name: string;
    color: string;
    category?: string;
}

interface LabelState {
    labels: Label[];
    setLabels: (labels: Label[]) => void;
    clearLabels: () => void;
    getLabelColor: (labelName: string) => string;
}

export const useLabelStore = create<LabelState>((set, get) => ({
    labels: [],

    setLabels: (labels) => set({ labels }),

    clearLabels: () => set({ labels: [] }),

    getLabelColor: (labelName) => {
        const label = get().labels.find(l => l.name === labelName);
        return label?.color || '#3B82F6'; // Default blue if not found
    },
}));
