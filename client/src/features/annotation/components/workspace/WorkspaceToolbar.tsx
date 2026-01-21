import { Button } from '../../../../components/ui/button';
import { MousePointer, Square, Move, Undo, Redo } from 'lucide-react';
import { useCanvasStore, useAnnotationStore } from '../../stores';
import type { Tool } from '../../stores';
import { cn } from '../../../../components/ui/utils';

interface ToolButtonProps {
    icon: React.ElementType;
    active?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    tooltip?: string;
}

function ToolButton({ icon: Icon, active, disabled, onClick, tooltip }: ToolButtonProps) {
    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn(
                "w-10 h-10 rounded-lg transition-colors",
                active ? "bg-blue-600 text-white hover:bg-blue-700" : "text-slate-400 hover:text-white hover:bg-slate-700",
                disabled && "opacity-30 cursor-not-allowed"
            )}
            onClick={onClick}
            disabled={disabled}
            title={tooltip}
        >
            <Icon className="w-5 h-5" />
        </Button>
    );
}

interface WorkspaceToolbarProps {
    isReadOnly?: boolean;
}

export function WorkspaceToolbar({ isReadOnly = false }: WorkspaceToolbarProps) {
    const { tool, setTool, zoom, zoomIn, zoomOut } = useCanvasStore();
    const { undo, redo, canUndo, canRedo } = useAnnotationStore();

    const handleToolChange = (newTool: Tool) => {
        if (!isReadOnly) setTool(newTool);
    };

    return (
        <div className="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 gap-1">
            {/* Tools */}
            <ToolButton
                icon={MousePointer}
                active={tool === 'select'}
                onClick={() => handleToolChange('select')}
                tooltip="Select (V)"
                disabled={isReadOnly}
            />
            <ToolButton
                icon={Square}
                active={tool === 'rectangle'}
                onClick={() => handleToolChange('rectangle')}
                tooltip="Rectangle (R)"
                disabled={isReadOnly}
            />
            <ToolButton
                icon={Move}
                active={tool === 'hand'}
                onClick={() => handleToolChange('hand')}
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
