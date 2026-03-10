import { useEffect } from 'react';
import { useCanvasStore, useAnnotationStore, useLabelStore, useImageStore } from '../stores';

export function useKeyboardShortcuts(isReadOnly: boolean = false) {
    const { setTool } = useCanvasStore();
    const {
        selectedAnnotationId,
        deleteAnnotation,
        updateAnnotation,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useAnnotationStore();
    const { labels } = useLabelStore();
    const { goToNext, goToPrevious, hasNext, hasPrevious } = useImageStore();

    useEffect(() => {
        if (isReadOnly) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Tool shortcuts
            if (e.key === 'v' || e.key === 'V') {
                e.preventDefault();
                setTool('select');
            }
            if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                setTool('rectangle');
            }
            if (e.key === 'h' || e.key === 'H') {
                e.preventDefault();
                setTool('hand');
            }

            // Delete selected annotation
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId) {
                e.preventDefault();
                deleteAnnotation(selectedAnnotationId);
            }

            // Undo/Redo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey && canUndo()) {
                e.preventDefault();
                undo();
            }
            if (e.ctrlKey && e.shiftKey && e.key === 'z' && canRedo()) {
                e.preventDefault();
                redo();
            }
            if (e.ctrlKey && e.key === 'y' && canRedo()) {
                e.preventDefault();
                redo();
            }

            // Quick label assignment (1-9)
            if (selectedAnnotationId && e.key >= '1' && e.key <= '9') {
                const index = parseInt(e.key) - 1;
                if (index < labels.length) {
                    e.preventDefault();
                    updateAnnotation(selectedAnnotationId, { label: labels[index].name });
                }
            }

            // Escape to deselect
            if (e.key === 'Escape' && selectedAnnotationId) {
                e.preventDefault();
                useAnnotationStore.getState().selectAnnotation(null);
            }

            // Navigate between tasks (Alt + Arrow keys)
            if (e.altKey && e.key === 'ArrowLeft' && hasPrevious()) {
                e.preventDefault();
                goToPrevious();
            }
            if (e.altKey && e.key === 'ArrowRight' && hasNext()) {
                e.preventDefault();
                goToNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        isReadOnly,
        selectedAnnotationId,
        setTool,
        deleteAnnotation,
        updateAnnotation,
        undo,
        redo,
        canUndo,
        canRedo,
        labels,
        goToNext,
        goToPrevious,
        hasNext,
        hasPrevious,
    ]);
}
