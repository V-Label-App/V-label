import { useEffect, useRef } from "react";
import { Rect, Transformer, Text } from "react-konva";
import Konva from "konva";
import { useAnnotationStore } from "../../stores";
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
  const { updateAnnotation } = useAnnotationStore();

  const borderColor = annotation.color || getLabelColor(annotation.label);
  const fillColor = annotation.color
    ? `${annotation.color}33` // Add 20% opacity (33 in hex) to custom color
    : getLabelColor(annotation.label, 0.2);

  const strokeWidth = annotation.strokeWidth || (isSelected ? 3 : 2);
  const opacity = annotation.opacity !== undefined ? annotation.opacity : 1;

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
        strokeWidth={strokeWidth}
        opacity={opacity}
        draggable={!isReadOnly}
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

      {/* Transformer (Resize/Rotate handles) */}
      {isSelected && !isReadOnly && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
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
