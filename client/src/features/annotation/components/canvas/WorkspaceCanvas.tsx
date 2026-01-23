import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva';
import Konva from 'konva';
import { useCanvasStore } from '../../stores';
import { AnnotationLayer } from './AnnotationLayer';
import { useAnnotationTools } from '../../hooks/useAnnotationTools';

interface WorkspaceCanvasProps {
    imageUrl: string;
    isReadOnly?: boolean;
}

export function WorkspaceCanvas({ imageUrl, isReadOnly = false }: WorkspaceCanvasProps) {
    const { zoom, pan, tool, setPan } = useCanvasStore();
    const stageRef = useRef<Konva.Stage>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

    // Drawing tool
    const { tempRect, handleMouseDown, handleMouseMove, handleMouseUp } = useAnnotationTools();

    // Load image
    useEffect(() => {
        setImageLoading(true);
        setImageError(false);

        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        img.src = imageUrl;

        img.onload = () => {
            setImage(img);
            setImageLoading(false);
        };

        img.onerror = () => {
            console.error('Failed to load image:', imageUrl);
            setImageError(true);
            setImageLoading(false);
        };
    }, [imageUrl]);

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            const container = stageRef.current?.container();
            if (container) {
                const parent = container.parentElement;
                if (parent) {
                    setStageSize({
                        width: parent.offsetWidth,
                        height: parent.offsetHeight,
                    });
                }
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Handle wheel zoom
    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();

        if (!e.evt.ctrlKey && !e.evt.metaKey) return;

        const stage = stageRef.current;
        if (!stage) return;

        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1;
        const clampedScale = Math.max(0.5, Math.min(5, newScale));

        const newPos = {
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
        };

        stage.scale({ x: clampedScale, y: clampedScale });
        stage.position(newPos);
        setPan(newPos);
    };

    const scale = zoom / 100;

    return (
        <div className="w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden relative">
            {/* Loading/Error Overlay */}
            {(imageLoading || imageError) && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
                    {imageLoading && (
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <p className="text-slate-400">Loading image...</p>
                        </div>
                    )}
                    {imageError && (
                        <div className="text-center p-8 bg-slate-800 rounded-lg border border-slate-700">
                            <div className="text-6xl mb-4">🖼️</div>
                            <p className="text-slate-300 text-lg mb-2">Image Preview</p>
                            <p className="text-slate-500 text-sm">External placeholder unavailable</p>
                            <p className="text-slate-600 text-xs mt-4">Canvas and annotation tools are ready</p>
                        </div>
                    )}
                </div>
            )}

            <Stage
                ref={stageRef}
                width={stageSize.width}
                height={stageSize.height}
                scaleX={scale}
                scaleY={scale}
                x={pan.x}
                y={pan.y}
                draggable={tool === 'hand'}
                onWheel={handleWheel}
                onDragEnd={(e) => {
                    setPan({ x: e.target.x(), y: e.target.y() });
                }}
                onMouseDown={!isReadOnly ? handleMouseDown : undefined}
                onMouseMove={!isReadOnly ? handleMouseMove : undefined}
                onMouseUp={!isReadOnly ? handleMouseUp : undefined}
            >
                <Layer>
                    {/* Background Image */}
                    {image && (
                        <KonvaImage
                            image={image}
                            x={0}
                            y={0}
                            width={800}
                            height={600}
                        />
                    )}

                    {/* Annotations Layer */}
                    <AnnotationLayer isReadOnly={isReadOnly} />

                    {/* Temporary drawing rectangle */}
                    {tempRect && (
                        <Rect
                            x={tempRect.x}
                            y={tempRect.y}
                            width={tempRect.width}
                            height={tempRect.height}
                            stroke="#3b82f6"
                            strokeWidth={2 / scale}
                            dash={[4 / scale, 4 / scale]}
                            listening={false}
                        />
                    )}
                </Layer>
            </Stage>
        </div>
    );
}
