import { useState, useCallback } from "react";
import Konva from "konva";
import { useCanvasStore, useAnnotationStore, useLabelStore } from "../stores";
import { generateId } from "../constants";

export function useAnnotationTools() {
  const { tool, imageSize, isModalOpen } = useCanvasStore();
  const { addAnnotation, defaultOpacity, defaultStrokeWidth } =
    useAnnotationStore();
  const { labels } = useLabelStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [tempRect, setTempRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (tool !== "rectangle" || isModalOpen) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const transform = stage.getAbsoluteTransform().copy().invert();
      const stagePos = transform.point(pos);

      // Clamp start point to image bounds
      const clampX = Math.max(0, Math.min(stagePos.x, imageSize.width));
      const clampY = Math.max(0, Math.min(stagePos.y, imageSize.height));

      setIsDrawing(true);
      const startPoint = { x: clampX, y: clampY };
      setDrawStart(startPoint);
      setTempRect({ x: clampX, y: clampY, width: 0, height: 0 });
    },
    [tool, imageSize, isModalOpen],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawing || !drawStart || tool !== "rectangle") return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const transform = stage.getAbsoluteTransform().copy().invert();
      const stagePos = transform.point(pos);

      // Clamp to image bounds
      const clampX = Math.max(0, Math.min(stagePos.x, imageSize.width));
      const clampY = Math.max(0, Math.min(stagePos.y, imageSize.height));

      const newRect = {
        x: Math.min(drawStart.x, clampX),
        y: Math.min(drawStart.y, clampY),
        width: Math.abs(clampX - drawStart.x),
        height: Math.abs(clampY - drawStart.y),
      };

      console.log("Drawing rectangle coordinates:", newRect);

      setTempRect(newRect);
    },
    [isDrawing, drawStart, tool, imageSize],
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;

    if (tool === "rectangle" && tempRect) {
      if (tempRect.width >= 5 && tempRect.height >= 5) {
        addAnnotation({
          id: generateId(),
          label: labels[0]?.name || "Unlabeled", // Default to first label from project
          type: "rectangle",
          x: tempRect.x,
          y: tempRect.y,
          width: tempRect.width,
          height: tempRect.height,
          visible: true,
          createdAt: new Date(),
          opacity: defaultOpacity,
          strokeWidth: defaultStrokeWidth,
        });
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setTempRect(null);
  }, [
    isDrawing,
    tool,
    tempRect,
    addAnnotation,
    labels,
    defaultOpacity,
    defaultStrokeWidth,
  ]);

  return {
    isDrawing,
    tempRect,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
