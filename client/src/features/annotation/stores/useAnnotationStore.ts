import { create } from "zustand";

export interface Annotation {
  id: string;
  label: string; // "Normal", "Abnormal", "Uncertain"
  type: "rectangle" | "brush"; // Future: 'polygon', 'point'
  x: number; // Pixel coordinates
  y: number;
  width: number;
  height: number;
  visible: boolean;
  createdBy?: string;
  createdAt: Date;
  aiSuggested?: boolean; // Flag if AI suggested this box
  color?: string; // Custom color
  strokeWidth?: number; // Custom stroke thickness
  opacity?: number; // Custom opacity
  points?: number[]; // For freehand brush strokes [x1, y1, x2, y2, ...]
}

interface AnnotationState {
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  history: Annotation[][];
  historyIndex: number;

  // Actions
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  selectAnnotation: (id: string | null) => void;
  toggleVisibility: (id: string) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  clearAnnotations: () => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  addToHistory: (annotations: Annotation[]) => void;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotations: [],
  selectedAnnotationId: null,
  history: [[]],
  historyIndex: 0,

  addAnnotation: (annotation) => {
    const newAnnotations = [...get().annotations, annotation];
    set({ annotations: newAnnotations, selectedAnnotationId: annotation.id });
    get().addToHistory(newAnnotations);
  },

  updateAnnotation: (id, updates) => {
    const newAnnotations = get().annotations.map((a) =>
      a.id === id ? { ...a, ...updates } : a,
    );
    set({ annotations: newAnnotations });
    get().addToHistory(newAnnotations);
  },

  deleteAnnotation: (id) => {
    const newAnnotations = get().annotations.filter((a) => a.id !== id);
    set({ annotations: newAnnotations, selectedAnnotationId: null });
    get().addToHistory(newAnnotations);
  },

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  toggleVisibility: (id) => {
    const newAnnotations = get().annotations.map((a) =>
      a.id === id ? { ...a, visible: !a.visible } : a,
    );
    set({ annotations: newAnnotations });
  },

  setAnnotations: (annotations) => {
    set({ annotations, selectedAnnotationId: null });
    get().addToHistory(annotations);
  },

  clearAnnotations: () => {
    set({
      annotations: [],
      selectedAnnotationId: null,
      history: [[]],
      historyIndex: 0,
    });
  },

  // History management
  addToHistory: (annotations) => {
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(annotations);
    // Keep only last 50 history states
    const trimmedHistory = newHistory.slice(-50);
    set({
      history: trimmedHistory,
      historyIndex: trimmedHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({
        historyIndex: historyIndex - 1,
        annotations: history[historyIndex - 1],
        selectedAnnotationId: null,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({
        historyIndex: historyIndex + 1,
        annotations: history[historyIndex + 1],
        selectedAnnotationId: null,
      });
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
}));
