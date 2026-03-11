import { create } from "zustand";

export type Tool = "select" | "rectangle" | "hand";

interface CanvasState {
  zoom: number;
  pan: { x: number; y: number };
  tool: Tool;
  imageSize: { width: number; height: number };
  fitTrigger: number;
  isModalOpen: boolean;

  // Actions
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setTool: (tool: Tool) => void;
  setImageSize: (size: { width: number; height: number }) => void;
  triggerFit: () => void;
  setModalOpen: (isOpen: boolean) => void;
  resetCanvas: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  zoom: 100,
  pan: { x: 0, y: 0 },
  tool: "select",
  imageSize: { width: 0, height: 0 },
  fitTrigger: 0,
  isModalOpen: false,

  setZoom: (zoom) => set({ zoom: Math.max(50, Math.min(500, zoom)) }),
  setPan: (pan) => set({ pan }),
  setTool: (tool) => set({ tool }),
  setImageSize: (size) => set({ imageSize: size }),
  triggerFit: () => set((state) => ({ fitTrigger: state.fitTrigger + 1 })),
  setModalOpen: (isOpen) => set({ isModalOpen: isOpen }),
  resetCanvas: () =>
    set({
      zoom: 100,
      pan: { x: 0, y: 0 },
      tool: "select",
    }),
  zoomIn: () => set((state) => ({ zoom: Math.min(500, state.zoom + 25) })),
  zoomOut: () => set((state) => ({ zoom: Math.max(50, state.zoom - 25) })),
}));
