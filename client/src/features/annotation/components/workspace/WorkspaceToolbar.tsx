import { Button } from "../../../../components/ui/button";
import { MousePointer, Square, Move, Undo, Redo, Pencil } from "lucide-react";
import { useCanvasStore, useAnnotationStore } from "../../stores";
import type { Tool } from "../../stores";
import { cn } from "../../../../components/ui/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover";
import { Slider } from "../../../../components/ui/slider";
import { HexColorPicker } from "react-colorful";

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
}

// Drawing settings are now handled via HexColorPicker

export function WorkspaceToolbar({
  isReadOnly = false,
}: WorkspaceToolbarProps) {
  const {
    tool,
    setTool,
    zoom,
    zoomIn,
    zoomOut,
    drawingSettings,
    setDrawingSettings,
  } = useCanvasStore();
  const { undo, redo, canUndo, canRedo } = useAnnotationStore();

  const handleToolChange = (newTool: Tool) => {
    if (!isReadOnly) setTool(newTool);
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
              showIndicator={true}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          sideOffset={10}
          className="w-72 bg-slate-800 border-slate-700 text-white p-4 shadow-xl z-50"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-2 block uppercase tracking-wider">
                Drawing Color
              </label>
              <div className="flex justify-center py-2 bg-slate-900 rounded-lg">
                <HexColorPicker
                  color={drawingSettings.color}
                  onChange={(c) => setDrawingSettings({ color: c })}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="w-6 h-6 rounded border border-slate-600"
                  style={{ backgroundColor: drawingSettings.color }}
                />
                <span className="text-xs font-mono text-slate-300 uppercase">
                  {drawingSettings.color}
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs text-slate-400 uppercase tracking-wider">
                  Thickness
                </label>
                <span className="text-xs text-blue-400">
                  {drawingSettings.strokeWidth}px
                </span>
              </div>
              <Slider
                value={[drawingSettings.strokeWidth]}
                min={1}
                max={20}
                step={1}
                onValueChange={([v]) => setDrawingSettings({ strokeWidth: v })}
                className="cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs text-slate-400 uppercase tracking-wider">
                  Opacity
                </label>
                <span className="text-xs text-blue-400">
                  {Math.round(drawingSettings.opacity * 100)}%
                </span>
              </div>
              <Slider
                value={[drawingSettings.opacity * 100]}
                min={5}
                max={100}
                step={5}
                onValueChange={([v]) =>
                  setDrawingSettings({ opacity: v / 100 })
                }
                className="cursor-pointer"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <div>
            <ToolButton
              icon={Pencil}
              active={tool === "brush"}
              onClick={() => handleToolChange("brush")}
              tooltip="Brush (B)"
              disabled={isReadOnly}
              showIndicator={true}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          sideOffset={10}
          className="w-72 bg-slate-800 border-slate-700 text-white p-4 shadow-xl z-50"
        >
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-2 block uppercase tracking-wider">
                Drawing Color
              </label>
              <div className="flex justify-center py-2 bg-slate-900 rounded-lg">
                <HexColorPicker
                  color={drawingSettings.color}
                  onChange={(c) => setDrawingSettings({ color: c })}
                />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="w-6 h-6 rounded border border-slate-600"
                  style={{ backgroundColor: drawingSettings.color }}
                />
                <span className="text-xs font-mono text-slate-300 uppercase">
                  {drawingSettings.color}
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs text-slate-400 uppercase tracking-wider">
                  Thickness
                </label>
                <span className="text-xs text-blue-400">
                  {drawingSettings.strokeWidth}px
                </span>
              </div>
              <Slider
                value={[drawingSettings.strokeWidth]}
                min={1}
                max={20}
                step={1}
                onValueChange={([v]) => setDrawingSettings({ strokeWidth: v })}
                className="cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs text-slate-400 uppercase tracking-wider">
                  Opacity
                </label>
                <span className="text-xs text-blue-400">
                  {Math.round(drawingSettings.opacity * 100)}%
                </span>
              </div>
              <Slider
                value={[drawingSettings.opacity * 100]}
                min={5}
                max={100}
                step={5}
                onValueChange={([v]) =>
                  setDrawingSettings({ opacity: v / 100 })
                }
                className="cursor-pointer"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <ToolButton
        icon={Move}
        active={tool === "hand"}
        onClick={() => handleToolChange("hand")}
        tooltip="Hand (H)"
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

      <div className="flex-1"></div>

      {/* Zoom Controls */}
      <div className="flex flex-col gap-1 mb-2">
        <Button
          size="sm"
          onClick={zoomIn}
          className="w-10 h-8 bg-slate-700 hover:bg-slate-600 text-white p-0"
        >
          +
        </Button>
        <div className="text-xs text-slate-400 text-center font-mono px-1">
          {zoom}%
        </div>
        <Button
          size="sm"
          onClick={zoomOut}
          className="w-10 h-8 bg-slate-700 hover:bg-slate-600 text-white p-0"
        >
          −
        </Button>
      </div>
    </div>
  );
}
