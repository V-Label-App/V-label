import { useEffect } from "react";
import {
  useCanvasStore,
  useAnnotationStore,
  useLabelStore,
  useImageStore,
} from "../stores";

export function useKeyboardShortcuts(isReadOnly: boolean = false) {
  const { tool, setTool } = useCanvasStore();
  const {
    selectedAnnotationId,
    selectAnnotation,
    annotations,
    deleteAnnotation,
    updateAnnotation,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useAnnotationStore();
  const { labels, activeLabel, setActiveLabel } = useLabelStore();
  const { goToNext, goToPrevious, hasNext, hasPrevious, setHasInteracted } = useImageStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { isModalOpen } = useCanvasStore.getState();
      if (isModalOpen) return;

      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Tool shortcuts
      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        setTool("select");
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setTool("rectangle");
      }
      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        setTool("hand");
        return; // Allow 'h' even in read-only
      }

      if (isReadOnly) return;

      // Delete selected annotation
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedAnnotationId
      ) {
        e.preventDefault();
        deleteAnnotation(selectedAnnotationId);
        setHasInteracted(true);
      }

      // Undo/Redo
      if (e.ctrlKey && e.key === "z" && !e.shiftKey && canUndo()) {
        e.preventDefault();
        undo();
        setHasInteracted(true);
      }
      if (e.ctrlKey && e.shiftKey && e.key === "z" && canRedo()) {
        e.preventDefault();
        redo();
        setHasInteracted(true);
      }
      if (e.ctrlKey && e.key === "y" && canRedo()) {
        e.preventDefault();
        redo();
        setHasInteracted(true);
      }

      // Quick label assignment (1-9)
      if (selectedAnnotationId && e.key >= "1" && e.key <= "9") {
        const index = parseInt(e.key) - 1;
        if (index < labels.length) {
          e.preventDefault();
          updateAnnotation(selectedAnnotationId, { label: labels[index].name });
          setHasInteracted(true);
        }
      }

      // Escape to deselect
      if (e.key === "Escape" && selectedAnnotationId) {
        e.preventDefault();
        useAnnotationStore.getState().selectAnnotation(null);
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const { isModalOpen } = useCanvasStore.getState();
      if (isModalOpen) return;

      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Contextual arrow key navigation (Always active regardless of isReadOnly)
      if (e.key === "ArrowLeft" && !e.altKey && !e.ctrlKey) {
        e.preventDefault();
        if (tool === "rectangle" && !isReadOnly) {
          // Switch to previous drawn annotation
          if (annotations.length > 0) {
            if (selectedAnnotationId) {
              const currentIndex = annotations.findIndex(
                (a) => a.id === selectedAnnotationId,
              );
              if (currentIndex > 0) {
                selectAnnotation(annotations[currentIndex - 1].id);
              } else {
                selectAnnotation(annotations[annotations.length - 1].id); // wrap around
              }
            } else {
              selectAnnotation(annotations[annotations.length - 1].id);
            }
          }
        } else {
          // Switch to previous task (for other tools OR when in review/read-only mode)
          if (hasPrevious()) goToPrevious();
        }
      }

      if (e.key === "ArrowRight" && !e.altKey && !e.ctrlKey) {
        e.preventDefault();
        if (tool === "rectangle" && !isReadOnly) {
          // Switch to next drawn annotation
          if (annotations.length > 0) {
            if (selectedAnnotationId) {
              const currentIndex = annotations.findIndex(
                (a) => a.id === selectedAnnotationId,
              );
              if (currentIndex < annotations.length - 1) {
                selectAnnotation(annotations[currentIndex + 1].id);
              } else {
                selectAnnotation(annotations[0].id); // wrap around
              }
            } else {
              selectAnnotation(annotations[0].id);
            }
          }
        } else {
          // Switch to next task (for other tools OR when in review/read-only mode)
          if (hasNext()) goToNext();
        }
      }

      // Alt + Arrow keys always navigate tasks
      if (e.altKey && e.key === "ArrowLeft" && hasPrevious()) {
        e.preventDefault();
        goToPrevious();
      }
      if (e.altKey && e.key === "ArrowRight" && hasNext()) {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [
    isReadOnly,
    selectedAnnotationId,
    selectAnnotation,
    annotations,
    tool,
    setTool,
    deleteAnnotation,
    updateAnnotation,
    undo,
    redo,
    canUndo,
    canRedo,
    labels,
    activeLabel,
    setActiveLabel,
    goToNext,
    goToPrevious,
    hasNext,
    hasPrevious,
  ]);
}

