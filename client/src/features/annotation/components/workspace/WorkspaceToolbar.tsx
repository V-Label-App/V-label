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
import { motion } from "framer-motion";

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
    <motion.div
       whileHover={{ scale: 1.05 }}
       whileTap={{ scale: 0.95 }}
    >
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "w-10 h-10 rounded-xl transition-all duration-300",
          active
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-white hover:bg-white/10",
          disabled && "opacity-30 cursor-not-allowed",
        )}
        onClick={onClick}
        disabled={disabled}
        title={tooltip}
      >
        <Icon className="w-5 h-5" />
        {showIndicator && (
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-400 border border-slate-800 animate-pulse" />
        )}
      </Button>
    </motion.div>
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
    if (!isReadOnly || newTool === "hand") setTool(newTool);
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
    <motion.div 
      initial={{ y: 50, opacity: 0, x: "-50%" }}
      animate={{ y: 0, opacity: 1, x: "-50%" }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center p-2 gap-1 rounded-2xl bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl z-[100] transition-all hover:bg-slate-900/60 group"
    >
      {/* Subtle overlay removed to eliminate glow */}
      
      {/* Tools */}
      <div className="flex items-center gap-1 relative z-10">
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
              side="top"
              sideOffset={16}
              className="w-64 p-4 flex flex-col gap-6 bg-slate-900/90 backdrop-blur-xl border-white/10 text-slate-200 shadow-2xl"
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

        <div className="w-px h-8 bg-white/10 mx-1"></div>

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

        <div className="w-px h-8 bg-white/10 mx-1"></div>

        {/* Zoom Controls */}
        <ToolButton
          icon={ZoomIn}
          onClick={zoomIn}
          tooltip={`Zoom In (${zoom}%)`}
        />

        <div className="px-2 flex flex-col items-center justify-center min-w-[48px]">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter leading-none mb-0.5">Zoom</span>
          <span className="text-xs font-mono text-white font-black leading-none">
            {zoom}%
          </span>
        </div>

        <ToolButton icon={ZoomOut} onClick={zoomOut} tooltip="Zoom Out" />

        <ToolButton
          icon={Maximize2}
          onClick={() => triggerFit()}
          tooltip="Fit to Screen"
        />

        <div className="w-px h-8 bg-white/10 mx-1"></div>

        <ToolButton
          icon={isFullscreen ? Minimize : Maximize}
          onClick={toggleFullscreen}
          tooltip="Toggle Fullscreen"
        />

        {/* AI Suggest button — only shown when project enables AI */}
        {enableAiAssistance && !isReadOnly && (
          <>
            <div className="w-px h-8 bg-white/10 mx-1"></div>
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
    </motion.div>
  );
}
