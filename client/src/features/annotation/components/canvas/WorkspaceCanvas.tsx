import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Image as KonvaImage, Rect } from "react-konva";
import Konva from "konva";
import { useCanvasStore, useAnnotationStore } from "../../stores";
import { AnnotationLayer } from "./AnnotationLayer";
import { useAnnotationTools } from "../../hooks/useAnnotationTools";
import { Eye, RotateCcw } from "lucide-react";


interface WorkspaceCanvasProps {
  imageUrl: string;
  isReadOnly?: boolean;
  isPreviewMode?: boolean;
  previewSubmissionNumber?: number | null;
  onRestoreCurrent?: () => void;
}

export function WorkspaceCanvas({
  imageUrl,
  isReadOnly = false,
  isPreviewMode = false,
  previewSubmissionNumber = null,
  onRestoreCurrent,
}: WorkspaceCanvasProps) {
  const {
    pan,
    setPan,
    zoom,
    setZoom,
    tool,
    fitTrigger,
    imageSize,
    setImageSize,
  } = useCanvasStore();
  const { defaultOpacity, defaultStrokeWidth } = useAnnotationStore();
  const stageRef = useRef<Konva.Stage>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

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
  }, [imageUrl, setImageSize]);

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

  // Center image on load or stage resize or fitTrigger
  useEffect(() => {
    if (image && imageSize.width > 0 && stageSize.width > 0) {
      const x = (stageSize.width - imageSize.width * scale) / 2;
      const y = (stageSize.height - imageSize.height * scale) / 2;
      setPan({ x, y });
      setZoom(Math.round(scale * 100));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image, imageSize, stageSize, scale, fitTrigger]);

  // Scroll to zoom
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      // Only zoom if Ctrl key is pressed
      if (!e.evt.ctrlKey) return;

      e.evt.preventDefault();
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const step = 10;
      const oldZoom = zoom;
      const newZoom = Math.max(50, Math.min(500, zoom + direction * step));

      if (newZoom !== oldZoom) {
        setZoom(newZoom);

        // Keep centered: if we want to keep it centered on the stage center
        const newScale = newZoom / 100;
        const newX = (stageSize.width - imageSize.width * newScale) / 2;
        const newY = (stageSize.height - imageSize.height * newScale) / 2;
        setPan({ x: newX, y: newY });
      }
    },
    [zoom, setZoom, setPan, stageSize, imageSize],
  );

  // Drag end: sync pan store with stage position (only when Stage itself is dragged)
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if (e.target === stageRef.current) {
        setPan({ x: e.target.x(), y: e.target.y() });
      }
    },
    [setPan],
  );

  // Combined move handler: drawing only
  const handleMouseMoveOnStage = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isReadOnly && tool !== "hand") handleMouseMove(e);
    },
    [isReadOnly, tool, handleMouseMove],
  );

  const displayScale = zoom / 100;

  return (
    <div className="w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden relative">

      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-amber-500/90 backdrop-blur-sm text-white text-sm font-semibold px-4 py-1.5 rounded-full shadow-lg border border-amber-400/50">
          <Eye className="w-4 h-4" />
          Preview — Submission #{previewSubmissionNumber}
          {onRestoreCurrent && (
            <button
              onClick={onRestoreCurrent}
              className="ml-2 flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 transition-colors px-2 py-0.5 rounded-full"
            >
              <RotateCcw className="w-3 h-3" />
              Restore
            </button>
          )}
        </div>
      )}

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
        scaleX={displayScale}
        scaleY={displayScale}
        x={pan.x}
        y={pan.y}
        draggable={tool === "hand"}
        onDragEnd={handleDragEnd}
        onWheel={handleWheel}
        onMouseDown={
          !isReadOnly && tool !== "hand" ? handleMouseDown : undefined
        }
        onMouseMove={handleMouseMoveOnStage}
        onMouseUp={!isReadOnly && tool !== "hand" ? handleMouseUp : undefined}
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
          <AnnotationLayer isReadOnly={isReadOnly} isPreviewMode={isPreviewMode} />

          {/* Temporary drawing rectangle */}
          {tempRect && (
            <Rect
              x={tempRect.x}
              y={tempRect.y}
              width={tempRect.width}
              height={tempRect.height}
              stroke="#3b82f6"
              fill={`rgba(59, 130, 246, ${defaultOpacity})`}
              strokeWidth={defaultStrokeWidth / displayScale}
              dash={[4 / displayScale, 4 / displayScale]}
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
