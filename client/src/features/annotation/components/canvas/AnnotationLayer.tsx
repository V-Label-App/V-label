import { useAnnotationStore } from "../../stores";
import { Rectangle } from "./Rectangle";

interface AnnotationLayerProps {
  isReadOnly?: boolean;
  isPreviewMode?: boolean;
}

export function AnnotationLayer({ isReadOnly = false, isPreviewMode = false }: AnnotationLayerProps) {
  const { annotations, selectedAnnotationId, selectAnnotation } =
    useAnnotationStore();
  const { historicalAnnotations } = useAnnotationStore();

  return (
    <>
      {!isPreviewMode && annotations
        .filter((a) => a.visible !== false)
        .map((annotation) => (
          <Rectangle
            key={annotation.id}
            annotation={annotation}
            isSelected={selectedAnnotationId === annotation.id}
            isReadOnly={isReadOnly}
            onSelect={() => !isReadOnly && selectAnnotation(annotation.id)}
          />
        ))}

      {historicalAnnotations
        .filter((a) => a.visible !== false)
        .map((annotation) => (
          <Rectangle
            key={`hist-${annotation.id}`}
            annotation={annotation}
            isSelected={false}
            isReadOnly={true}
            onSelect={() => {}}
            isHistorical={true}
            isPreviewMode={isPreviewMode}
          />
        ))}
    </>
  );
}
