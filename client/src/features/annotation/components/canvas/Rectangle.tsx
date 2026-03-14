import { useEffect, useRef } from "react";
import { Rect, Transformer, Text } from "react-konva";
import Konva from "konva";
import { useAnnotationStore, useCanvasStore } from "../../stores";
import type { Annotation } from "../../stores";
import { getLabelColor } from "../../constants";

interface RectangleProps {
  annotation: Annotation;
  isSelected: boolean;
  isReadOnly: boolean;
  onSelect: () => void;
}

export function Rectangle({
  annotation,
  isSelected,
  isReadOnly,
  onSelect,
}: RectangleProps) {
  const shapeRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const { updateAnnotation, defaultOpacity, defaultStrokeWidth } =
    useAnnotationStore();

  const borderColor = getLabelColor(annotation.label);
  const strokeW = annotation.strokeWidth ?? defaultStrokeWidth;
  const opacityVal = annotation.opacity ?? defaultOpacity;
  const fillAlpha = isSelected ? Math.min(1, opacityVal + 0.2) : opacityVal;
  const fillColor = getLabelColor(annotation.label, fillAlpha);

  // Attach transformer to selected annotation
  useEffect(() => {
    if (isSelected && !isReadOnly) {
      if (trRef.current && shapeRef.current) {
        trRef.current.nodes([shapeRef.current]);
        trRef.current.getLayer()?.batchDraw();
      }
    }
  }, [isSelected, isReadOnly]);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    updateAnnotation(annotation.id, {
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  const dragBoundFunc = (pos: Konva.Vector2d) => {
    const { pan, zoom, imageSize } = useCanvasStore.getState();
    const scale = zoom / 100;

    const rX = (pos.x - pan.x) / scale;
    const rY = (pos.y - pan.y) / scale;

    const clampedRx = Math.max(
      0,
      Math.min(rX, imageSize.width - annotation.width),
    );
    const clampedRy = Math.max(
      0,
      Math.min(rY, imageSize.height - annotation.height),
    );

    return {
      x: pan.x + clampedRx * scale,
      y: pan.y + clampedRy * scale,
    };
  };

  const handleTransformEnd = () => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);

    updateAnnotation(annotation.id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
    });
  };

  return (
    <>
      {/* Rectangle */}
      <Rect
        ref={shapeRef}
        x={annotation.x}
        y={annotation.y}
        width={annotation.width}
        height={annotation.height}
        fill={fillColor}
        stroke={borderColor}
        strokeWidth={strokeW}
        draggable={!isReadOnly}
        dragBoundFunc={dragBoundFunc}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        shadowColor={isSelected ? borderColor : "transparent"}
        shadowBlur={isSelected ? 20 : 0}
        shadowOpacity={isSelected ? 0.5 : 0}
      />

      {/* Label Text */}
      <Text
        x={annotation.x}
        y={annotation.y - 25}
        text={annotation.label}
        fontSize={14}
        fontFamily="Inter, sans-serif"
        fill="white"
        padding={6}
        align="center"
        backgroundColor={borderColor}
        cornerRadius={4}
      />

      {/* AI Confidence Badge */}
      {annotation.aiSuggested && annotation.confidence !== undefined && (
        <Text
          x={annotation.x + annotation.width - 44}
          y={annotation.y - 25}
          text={`AI ${Math.round(annotation.confidence * 100)}%`}
          fontSize={11}
          fontFamily="Inter, sans-serif"
          fill="white"
          padding={4}
          align="center"
          backgroundColor={
            annotation.confidence >= 0.8
              ? "#16a34a"
              : annotation.confidence >= 0.6
                ? "#d97706"
                : "#dc2626"
          }
          cornerRadius={4}
        />
      )}

      {/* Transformer (Resize/Rotate handles) */}
      {isSelected && !isReadOnly && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            const { imageSize } = useCanvasStore.getState();

            // Constrain to image bounds
            if (newBox.x < 0 || newBox.y < 0) return oldBox;
            if (newBox.x + newBox.width > imageSize.width) return oldBox;
            if (newBox.y + newBox.height > imageSize.height) return oldBox;

            // Limit resize to minimum 5x5
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}
