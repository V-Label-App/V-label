import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Rect } from "react-konva";
import Konva from "konva";
import { useCanvasStore } from "../../stores";
import { AnnotationLayer } from "./AnnotationLayer";
import { useAnnotationTools } from "../../hooks/useAnnotationTools";

interface WorkspaceCanvasProps {
  imageUrl: string;
  isReadOnly?: boolean;
}

export function WorkspaceCanvas({
  imageUrl,
  isReadOnly = false,
}: WorkspaceCanvasProps) {
  const { pan, setPan } = useCanvasStore();
  const stageRef = useRef<Konva.Stage>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Drawing tool
  const { tempRect, handleMouseDown, handleMouseMove, handleMouseUp } =
    useAnnotationTools();

  // Load image
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);

    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
      setImage(img);
      setImageSize({ width: img.width, height: img.height });
      setImageLoading(false);
      console.log("Image loaded:", img.width, "x", img.height);
    };

    img.onerror = () => {
      console.error("Failed to load image:", imageUrl);
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
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate scale to fit image in stage
  const calculateFitScale = () => {
    if (!image || imageSize.width === 0 || stageSize.width === 0) return 1;

    // Add some padding (e.g., 40px)
    const padding = 40;
    const availableWidth = stageSize.width - padding;
    const availableHeight = stageSize.height - padding;

    const scaleX = availableWidth / imageSize.width;
    const scaleY = availableHeight / imageSize.height;

    // Use the smaller scale to ensure the image fits both ways
    return Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
  };

  const scale = calculateFitScale();

  // Center image on load or stage resize
  useEffect(() => {
    if (image && imageSize.width > 0 && stageSize.width > 0) {
      const x = (stageSize.width - imageSize.width * scale) / 2;
      const y = (stageSize.height - imageSize.height * scale) / 2;
      setPan({ x, y });
    }
  }, [image, imageSize, stageSize, scale, setPan]);

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
              <p className="text-slate-500 text-sm">
                External placeholder unavailable
              </p>
              <p className="text-slate-600 text-xs mt-4">
                Canvas and annotation tools are ready
              </p>
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
        draggable={false}
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
              width={imageSize.width}
              height={imageSize.height}
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
              opacity={0.5}
              dash={[4 / scale, 4 / scale]}
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
