import { Line as KonvaLine } from "react-konva";
import type { Annotation } from "../../stores";

interface BrushStrokeProps {
  annotation: Annotation;
  isSelected: boolean;
  onSelect: () => void;
}

export function BrushStroke({
  annotation,
  isSelected,
  onSelect,
}: BrushStrokeProps) {
  if (!annotation.points) return null;

  return (
    <KonvaLine
      points={annotation.points}
      stroke={annotation.color || "#3b82f6"}
      strokeWidth={annotation.strokeWidth || 2}
      opacity={annotation.opacity !== undefined ? annotation.opacity : 1}
      lineCap="round"
      lineJoin="round"
      tension={0.5}
      onClick={onSelect}
      onTap={onSelect}
      shadowColor={isSelected ? annotation.color : "transparent"}
      shadowBlur={isSelected ? 10 : 0}
      shadowOpacity={isSelected ? 0.5 : 0}
    />
  );
}
