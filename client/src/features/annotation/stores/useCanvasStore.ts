import { create } from "zustand";

export type Tool = "select" | "rectangle" | "hand";

interface CanvasState {
  zoom: number;
  pan: { x: number; y: number };
  tool: Tool;

  // Actions
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setTool: (tool: Tool) => void;
  resetCanvas: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  zoom: 100,
  pan: { x: 0, y: 0 },
  tool: "select",

  setZoom: (zoom) => set({ zoom: Math.max(50, Math.min(500, zoom)) }),
  setPan: (pan) => set({ pan }),
  setTool: (tool) => set({ tool }),
  resetCanvas: () =>
    set({
      zoom: 100,
      pan: { x: 0, y: 0 },
      tool: "select",
    }),
  zoomIn: () => set((state) => ({ zoom: Math.min(500, state.zoom + 25) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(50, state.zoom - 25) })),
}));
