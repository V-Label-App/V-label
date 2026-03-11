import { useAnnotationStore } from "../../stores";
import { Rectangle } from "./Rectangle";

interface AnnotationLayerProps {
  isReadOnly?: boolean;
}

export function AnnotationLayer({ isReadOnly = false }: AnnotationLayerProps) {
  const { annotations, selectedAnnotationId, selectAnnotation } =
    useAnnotationStore();

  return (
    <>
      {annotations
        .filter((a) => a.visible)
        .map((annotation) => {
          return (
            <Rectangle
              key={annotation.id}
              annotation={annotation}
              isSelected={selectedAnnotationId === annotation.id}
              isReadOnly={isReadOnly}
              onSelect={() => !isReadOnly && selectAnnotation(annotation.id)}
            />
          );
        })}
    </>
  );
}
