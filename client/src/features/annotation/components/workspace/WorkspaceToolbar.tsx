import { Button } from "../../../../components/ui/button";
import {
  MousePointer,
  Square,
  Undo,
  Redo,
  Hand,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Maximize,
  Minimize,
  Sparkles,
} from "lucide-react";
import { useCanvasStore, useAnnotationStore } from "../../stores";
import type { Tool } from "../../stores";
import { useState, useEffect } from "react";
import { cn } from "../../../../components/ui/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover";
import { Slider } from "../../../../components/ui/slider";

interface ToolButtonProps {
  icon: React.ElementType;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  tooltip?: string;
  showIndicator?: boolean;
}

function ToolButton({
  icon: Icon,
  active,
  disabled,
  onClick,
  tooltip,
  showIndicator,
}: ToolButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "w-10 h-10 rounded-lg transition-colors",
        active
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "text-slate-400 hover:text-white hover:bg-slate-700",
        disabled && "opacity-30 cursor-not-allowed",
      )}
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
    >
      <Icon className="w-5 h-5" />
      {showIndicator && (
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-400 border border-slate-800" />
      )}
    </Button>
  );
}

interface WorkspaceToolbarProps {
  isReadOnly?: boolean;
  enableAiAssistance?: boolean;
  onAiSuggest?: () => void;
  isAiLoading?: boolean;
}

export function WorkspaceToolbar({
  isReadOnly = false,
  enableAiAssistance = false,
  onAiSuggest,
  isAiLoading = false,
}: WorkspaceToolbarProps) {
  const { tool, setTool, zoom, zoomIn, zoomOut, triggerFit } = useCanvasStore();
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    selectedAnnotationId,
    annotations,
    updateAnnotation,
    defaultOpacity,
    defaultStrokeWidth,
    setDefaultOpacity,
    setDefaultStrokeWidth,
  } = useAnnotationStore();

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleToolChange = (newTool: Tool) => {
    if (!isReadOnly) setTool(newTool);
  };

  const selectedAnnotation = annotations.find(
    (a) => a.id === selectedAnnotationId,
  );

  const currentOpacity = selectedAnnotation?.opacity ?? defaultOpacity;
  const currentStrokeWidth =
    selectedAnnotation?.strokeWidth ?? defaultStrokeWidth;

  const handleOpacityChange = (val: number) => {
    if (selectedAnnotationId) {
      updateAnnotation(selectedAnnotationId, { opacity: val });
    }
    setDefaultOpacity(val);
  };

  const handleStrokeWidthChange = (val: number) => {
    if (selectedAnnotationId) {
      updateAnnotation(selectedAnnotationId, { strokeWidth: val });
    }
    setDefaultStrokeWidth(val);
  };

  return (
    <div className="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 gap-1">
      {/* Tools */}
      <ToolButton
        icon={MousePointer}
        active={tool === "select"}
        onClick={() => handleToolChange("select")}
        tooltip="Select (V)"
        disabled={isReadOnly}
      />

      <Popover>
        <PopoverTrigger asChild>
          <div>
            <ToolButton
              icon={Square}
              active={tool === "rectangle"}
              onClick={() => handleToolChange("rectangle")}
              tooltip="Rectangle (R)"
              disabled={isReadOnly}
            />
          </div>
        </PopoverTrigger>
        {!isReadOnly && (
          <PopoverContent
            side="right"
            sideOffset={16}
            className="w-64 p-4 flex flex-col gap-6 ml-2 bg-slate-800 border-slate-700 text-slate-200"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fill Opacity</span>
                <span className="text-xs text-slate-400">
                  {Math.round(currentOpacity * 100)}%
                </span>
              </div>
              <Slider
                value={[currentOpacity]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([val]) => handleOpacityChange(val)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Border Width</span>
                <span className="text-xs text-slate-400">
                  {currentStrokeWidth}px
                </span>
              </div>
              <Slider
                value={[currentStrokeWidth]}
                min={1}
                max={10}
                step={1}
                onValueChange={([val]) => handleStrokeWidthChange(val)}
              />
            </div>
          </PopoverContent>
        )}
      </Popover>

      <ToolButton
        icon={Hand}
        active={tool === "hand"}
        onClick={() => handleToolChange("hand")}
        tooltip="Pan / Hand (H)"
      />

      <div className="w-10 h-px bg-slate-700 my-2"></div>

      {/* History */}
      <ToolButton
        icon={Undo}
        onClick={() => undo()}
        tooltip="Undo (Ctrl+Z)"
        disabled={!canUndo() || isReadOnly}
      />
      <ToolButton
        icon={Redo}
        onClick={() => redo()}
        tooltip="Redo (Ctrl+Shift+Z)"
        disabled={!canRedo() || isReadOnly}
      />

      <div className="w-10 h-px bg-slate-700 my-2"></div>

      {/* Zoom Controls */}
      <ToolButton
        icon={ZoomIn}
        onClick={zoomIn}
        tooltip={`Zoom In (${zoom}%)`}
      />

      <span className="text-xs text-slate-500 font-mono select-none leading-none py-1">
        {zoom}%
      </span>

      <ToolButton icon={ZoomOut} onClick={zoomOut} tooltip="Zoom Out" />

      <ToolButton
        icon={Maximize2}
        onClick={() => triggerFit()}
        tooltip="Fit to Screen"
      />

      <div className="w-10 h-px bg-slate-700 my-2"></div>

      <ToolButton
        icon={isFullscreen ? Minimize : Maximize}
        onClick={toggleFullscreen}
        tooltip="Toggle Fullscreen"
      />

      <div className="flex-1"></div>

      {/* AI Suggest button — only shown when project enables AI */}
      {enableAiAssistance && !isReadOnly && (
        <>
          <div className="w-10 h-px bg-slate-700 my-2"></div>
          <ToolButton
            icon={Sparkles}
            onClick={onAiSuggest}
            tooltip="AI Suggest"
            disabled={isAiLoading}
            showIndicator={isAiLoading}
          />
        </>
      )}
    </div>
  );
}
