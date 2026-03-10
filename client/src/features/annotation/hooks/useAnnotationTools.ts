import { useState, useCallback } from "react";
import Konva from "konva";
import { useCanvasStore, useAnnotationStore, useLabelStore } from "../stores";
import { generateId } from "../constants";

export function useAnnotationTools() {
  const { tool, drawingSettings } = useCanvasStore();
  const { addAnnotation } = useAnnotationStore();
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
  const [tempPoints, setTempPoints] = useState<number[] | null>(null);

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (tool !== "rectangle" && tool !== "brush") return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      // Convert screen coordinates to stage coordinates (accounting for zoom/pan)
      const transform = stage.getAbsoluteTransform().copy().invert();
      const stagePos = transform.point(pos);

      setIsDrawing(true);
      setDrawStart(stagePos);

      if (tool === "rectangle") {
        setTempRect({ x: stagePos.x, y: stagePos.y, width: 0, height: 0 });
      } else if (tool === "brush") {
        setTempPoints([stagePos.x, stagePos.y]);
      }
    },
    [tool],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawing || !drawStart) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const transform = stage.getAbsoluteTransform().copy().invert();
      const stagePos = transform.point(pos);

      if (tool === "rectangle") {
        const newRect = {
          x: Math.min(drawStart.x, stagePos.x),
          y: Math.min(drawStart.y, stagePos.y),
          width: Math.abs(stagePos.x - drawStart.x),
          height: Math.abs(stagePos.y - drawStart.y),
        };

        setTempRect(newRect);
      } else if (tool === "brush") {
        setTempPoints((prev) =>
          prev ? [...prev, stagePos.x, stagePos.y] : null,
        );
      }
    },
    [isDrawing, drawStart, tool],
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
          color: drawingSettings.color,
          strokeWidth: drawingSettings.strokeWidth,
          opacity: drawingSettings.opacity,
        });
      }
    } else if (tool === "brush" && tempPoints && tempPoints.length > 4) {
      // Calculate bounding box for the brush stroke
      const xs = tempPoints.filter((_, i) => i % 2 === 0);
      const ys = tempPoints.filter((_, i) => i % 2 === 1);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      addAnnotation({
        id: generateId(),
        label: labels[0]?.name || "Unlabeled",
        type: "brush",
        points: tempPoints,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        visible: true,
        createdAt: new Date(),
        color: drawingSettings.color,
        strokeWidth: drawingSettings.strokeWidth,
        opacity: drawingSettings.opacity,
      });
    }

    setIsDrawing(false);
    setDrawStart(null);
    setTempRect(null);
    setTempPoints(null);
  }, [
    isDrawing,
    tool,
    tempRect,
    tempPoints,
    addAnnotation,
    labels,
    drawingSettings,
  ]);

  return {
    isDrawing,
    tempRect,
    tempPoints,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
