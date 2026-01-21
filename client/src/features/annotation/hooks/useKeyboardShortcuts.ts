import { useEffect } from 'react';
import { useCanvasStore, useAnnotationStore } from '../stores';
import { availableLabels } from '../constants';

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
                if (index < availableLabels.length) {
                    e.preventDefault();
                    updateAnnotation(selectedAnnotationId, { label: availableLabels[index] });
                }
            }

            // Escape to deselect
            if (e.key === 'Escape' && selectedAnnotationId) {
                e.preventDefault();
                useAnnotationStore.getState().selectAnnotation(null);
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
    ]);
}
