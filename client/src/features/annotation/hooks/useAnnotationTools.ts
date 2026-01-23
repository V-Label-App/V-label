import { useState, useCallback } from 'react';
import Konva from 'konva';
import { useCanvasStore, useAnnotationStore } from '../stores';
import type { Annotation } from '../stores';
import { generateId, availableLabels } from '../constants';

export function useAnnotationTools() {
    const { tool } = useCanvasStore();
    const { addAnnotation } = useAnnotationStore();

    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
    const [tempRect, setTempRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

    const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (tool !== 'rectangle') return;

        const stage = e.target.getStage();
        if (!stage) return;

        const pos = stage.getPointerPosition();
        if (!pos) return;

        // Convert screen coordinates to stage coordinates (accounting for zoom/pan)
        const transform = stage.getAbsoluteTransform().copy().invert();
        const stagePos = transform.point(pos);

        setIsDrawing(true);
        setDrawStart(stagePos);
        setTempRect({ x: stagePos.x, y: stagePos.y, width: 0, height: 0 });
    }, [tool]);

    const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (!isDrawing || !drawStart) return;

        const stage = e.target.getStage();
        if (!stage) return;

        const pos = stage.getPointerPosition();
        if (!pos) return;

        const transform = stage.getAbsoluteTransform().copy().invert();
        const stagePos = transform.point(pos);

        const newRect = {
            x: Math.min(drawStart.x, stagePos.x),
            y: Math.min(drawStart.y, stagePos.y),
            width: Math.abs(stagePos.x - drawStart.x),
            height: Math.abs(stagePos.y - drawStart.y),
        };

        setTempRect(newRect);
    }, [isDrawing, drawStart]);

    const handleMouseUp = useCallback(() => {
        if (!isDrawing || !tempRect || tempRect.width < 10 || tempRect.height < 10) {
            setIsDrawing(false);
            setDrawStart(null);
            setTempRect(null);
            return;
        }

        const newAnnotation: Annotation = {
            id: generateId(),
            label: availableLabels[0], // Default to first label
            type: 'rectangle',
            x: tempRect.x,
            y: tempRect.y,
            width: tempRect.width,
            height: tempRect.height,
            visible: true,
            createdAt: new Date(),
        };

        addAnnotation(newAnnotation);

        setIsDrawing(false);
        setDrawStart(null);
        setTempRect(null);
    }, [isDrawing, tempRect, addAnnotation]);

    return {
        isDrawing,
        tempRect,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
    };
}
