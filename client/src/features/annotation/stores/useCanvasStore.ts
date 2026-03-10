import { create } from "zustand";

export type Tool = "select" | "rectangle" | "brush" | "hand";

interface CanvasState {
  zoom: number;
  pan: { x: number; y: number };
  tool: Tool;

  // Actions
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setTool: (tool: Tool) => void;
  drawingSettings: {
    color: string;
    strokeWidth: number;
    opacity: number;
  };
  setDrawingSettings: (
    settings: Partial<{ color: string; strokeWidth: number; opacity: number }>,
  ) => void;
  resetCanvas: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  zoom: 100,
  pan: { x: 0, y: 0 },
  tool: "select",
  drawingSettings: {
    color: "#3b82f6",
    strokeWidth: 2,
    opacity: 1,
  },

  setZoom: (zoom) => set({ zoom: Math.max(50, Math.min(500, zoom)) }),
  setPan: (pan) => set({ pan }),
  setTool: (tool) => set({ tool }),
  setDrawingSettings: (settings) =>
    set((state) => ({
      drawingSettings: { ...state.drawingSettings, ...settings },
    })),
  resetCanvas: () =>
    set({
      zoom: 100,
      pan: { x: 0, y: 0 },
      tool: "select",
      drawingSettings: {
        color: "#3b82f6",
        strokeWidth: 2,
        opacity: 1,
      },
    }),
  zoomIn: () => set((state) => ({ zoom: Math.min(500, state.zoom + 25) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(50, state.zoom - 25) })),
}));
