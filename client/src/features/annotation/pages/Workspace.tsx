import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import {
  X, Send, CheckCircle, XCircle, MousePointer, Square,
  Move, Undo, Redo, AlertTriangle, Eye, EyeOff, Trash2,
  ChevronRight, Check, Loader2, SkipForward, ChevronLeft,
  Grid3x3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Annotation {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

interface ImageTask {
  id: string;
  filename: string;
  status: 'assigned' | 'in_progress' | 'submitted' | 'rejected' | 'approved' | 'skipped';
  thumbnail: string;
  annotationCount: number;
}

interface WorkspaceProps {
  taskId: string;
  mode: 'annotate' | 'review';
  onClose: () => void;
  taskStatus?: 'assigned' | 'in_progress' | 'submitted' | 'rejected' | 'approved';
  existingAnnotatorNote?: string;
  existingReviewComment?: string;
}

const labelColors: Record<string, { border: string; fill: string; bg: string }> = {
  'Normal': { border: '#3B82F6', fill: 'rgba(59, 130, 246, 0.2)', bg: 'bg-blue-100 text-blue-700' },
  'Abnormal': { border: '#EF4444', fill: 'rgba(239, 68, 68, 0.2)', bg: 'bg-red-100 text-red-700' },
  'Uncertain': { border: '#F59E0B', fill: 'rgba(245, 158, 11, 0.2)', bg: 'bg-amber-100 text-amber-700' },
};

const availableLabels = ['Normal', 'Abnormal', 'Uncertain'];

export function Workspace({
  taskId,
  mode,
  onClose,
  taskStatus = 'assigned',
  existingAnnotatorNote,
  existingReviewComment
}: WorkspaceProps) {
  // Image navigation states
  const [projectImages] = useState<ImageTask[]>([
    { id: 'T-001', filename: 'chest_xray_001.jpg', status: 'approved', thumbnail: '🫁', annotationCount: 5 },
    { id: 'T-002', filename: 'chest_xray_002.jpg', status: 'in_progress', thumbnail: '🫁', annotationCount: 2 },
    { id: 'T-003', filename: 'chest_xray_003.jpg', status: 'assigned', thumbnail: '🫁', annotationCount: 0 },
    { id: 'T-004', filename: 'chest_xray_004.jpg', status: 'rejected', thumbnail: '🫁', annotationCount: 3 },
    { id: 'T-005', filename: 'chest_xray_005.jpg', status: 'submitted', thumbnail: '🫁', annotationCount: 4 },
    { id: 'T-006', filename: 'chest_xray_006.jpg', status: 'assigned', thumbnail: '🫁', annotationCount: 0 },
    { id: 'T-007', filename: 'chest_xray_007.jpg', status: 'assigned', thumbnail: '🫁', annotationCount: 0 },
  ]);
  const [currentImageIndex, setCurrentImageIndex] = useState(() => {
    return projectImages.findIndex(img => img.id === taskId);
  });
  const [showImageList, setShowImageList] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const isReadOnly = taskStatus === 'approved' || mode === 'review';

  const currentImage = projectImages[currentImageIndex];
  const hasPrevious = currentImageIndex > 0;
  const hasNext = currentImageIndex < projectImages.length - 1;

  // States
  const [tool, setTool] = useState<'select' | 'rectangle' | 'hand'>('select');
  const [annotations, setAnnotations] = useState<Annotation[]>([
    { id: '1', label: 'Normal', x: 100, y: 80, width: 200, height: 150, visible: true },
    { id: '2', label: 'Abnormal', x: 350, y: 200, width: 180, height: 120, visible: true },
  ]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [annotatorNote, setAnnotatorNote] = useState(existingAnnotatorNote || '');
  const [history, setHistory] = useState<Annotation[][]>([annotations]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [tempBox, setTempBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);

  // Auto-save with debounce
  useEffect(() => {
    if (autoSaveStatus === 'unsaved') {
      setAutoSaveStatus('saving');
      const timer = setTimeout(() => {
        // Simulate API call
        setAutoSaveStatus('saved');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [autoSaveStatus, annotations, annotatorNote]);

  // Mark as unsaved when data changes
  useEffect(() => {
    if (historyIndex > 0) {
      setAutoSaveStatus('unsaved');
    }
  }, [annotations, annotatorNote]);

  // Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReadOnly) return;

      // Ctrl + Z: Undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl + Shift + Z: Redo
      if (e.ctrlKey && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleRedo();
      }
      // Delete / Backspace: Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotation) {
        e.preventDefault();
        handleDeleteAnnotation(selectedAnnotation);
      }
      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') {
        setTool('select');
      }
      if (e.key === 'r' || e.key === 'R') {
        setTool('rectangle');
      }
      if (e.key === 'h' || e.key === 'H') {
        setTool('hand');
      }
      // Number keys for quick label selection
      if (selectedAnnotation && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (index < availableLabels.length) {
          handleLabelChange(selectedAnnotation, availableLabels[index]);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Space key for panning
      if (e.key === ' ' && isPanning) {
        setIsPanning(false);
        setTool('select');
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isPanning && tool !== 'hand') {
        e.preventDefault();
        setIsPanning(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keypress', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [selectedAnnotation, annotations, historyIndex, isPanning, tool, isReadOnly]);

  // History management
  const addToHistory = useCallback((newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setAnnotations(newAnnotations);
  }, [history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  };

  // Annotation actions
  const handleDeleteAnnotation = (id: string) => {
    const newAnnotations = annotations.filter(a => a.id !== id);
    addToHistory(newAnnotations);
    setSelectedAnnotation(null);
  };

  const handleToggleVisibility = (id: string) => {
    const newAnnotations = annotations.map(a =>
      a.id === id ? { ...a, visible: !a.visible } : a
    );
    setAnnotations(newAnnotations);
  };

  const handleLabelChange = (id: string, label: string) => {
    const newAnnotations = annotations.map(a =>
      a.id === id ? { ...a, label } : a
    );
    addToHistory(newAnnotations);
  };

  // Canvas interactions
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isReadOnly) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left - pan.x) / zoom) * 100;
    const y = ((e.clientY - rect.top - pan.y) / zoom) * 100;

    if (tool === 'hand' || isPanning) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    } else if (tool === 'rectangle') {
      setIsDrawing(true);
      setDrawStart({ x, y });
      setTempBox({ x, y, width: 0, height: 0 });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Update crosshair
    const crosshairX = e.clientX - rect.left;
    const crosshairY = e.clientY - rect.top;
    setCrosshair({ x: crosshairX, y: crosshairY });

    if (isPanning && (tool === 'hand' || e.buttons === 1)) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (isDrawing && tool === 'rectangle') {
      const x = ((e.clientX - rect.left - pan.x) / zoom) * 100;
      const y = ((e.clientY - rect.top - pan.y) / zoom) * 100;
      setTempBox({
        x: Math.min(drawStart.x, x),
        y: Math.min(drawStart.y, y),
        width: Math.abs(x - drawStart.x),
        height: Math.abs(y - drawStart.y),
      });
    }
  };

  const handleCanvasMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (isDrawing && tempBox && tempBox.width > 10 && tempBox.height > 10) {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        label: availableLabels[0],
        x: tempBox.x,
        y: tempBox.y,
        width: tempBox.width,
        height: tempBox.height,
        visible: true,
      };
      addToHistory([...annotations, newAnnotation]);
      setSelectedAnnotation(newAnnotation.id);
    }

    setIsDrawing(false);
    setTempBox(null);
  };

  const handleCanvasMouseLeave = () => {
    setCrosshair(null);
  };

  // Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom(prev => Math.max(50, Math.min(500, prev + delta)));
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(500, prev + 25));
  const handleZoomOut = () => setZoom(prev => Math.max(50, prev - 25));

  // Image navigation
  const handlePreviousImage = () => {
    if (hasPrevious) {
      if (autoSaveStatus === 'unsaved') {
        if (!confirm('You have unsaved changes. Do you want to continue?')) {
          return;
        }
      }
      setCurrentImageIndex(prev => prev - 1);
      // Reset state for new image
      setAnnotations([]);
      setHistory([[]]);
      setHistoryIndex(0);
      setZoom(100);
      setPan({ x: 0, y: 0 });
      setSelectedAnnotation(null);
    }
  };

  const handleNextImage = () => {
    if (hasNext) {
      if (autoSaveStatus === 'unsaved') {
        if (!confirm('You have unsaved changes. Do you want to continue?')) {
          return;
        }
      }
      setCurrentImageIndex(prev => prev + 1);
      // Reset state for new image
      setAnnotations([]);
      setHistory([[]]);
      setHistoryIndex(0);
      setZoom(100);
      setPan({ x: 0, y: 0 });
      setSelectedAnnotation(null);
    }
  };

  const handleJumpToImage = (index: number) => {
    if (index === currentImageIndex) return;
    if (autoSaveStatus === 'unsaved') {
      if (!confirm('You have unsaved changes. Do you want to continue?')) {
        return;
      }
    }
    setCurrentImageIndex(index);
    // Reset state for new image
    setAnnotations([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setZoom(100);
    setPan({ x: 0, y: 0 });
    setSelectedAnnotation(null);
    setShowImageList(false);
  };

  // Arrow keys for image navigation
  useEffect(() => {
    const handleArrowKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && e.altKey) {
        e.preventDefault();
        handlePreviousImage();
      }
      if (e.key === 'ArrowRight' && e.altKey) {
        e.preventDefault();
        handleNextImage();
      }
    };

    window.addEventListener('keydown', handleArrowKeys);
    return () => window.removeEventListener('keydown', handleArrowKeys);
  }, [currentImageIndex, autoSaveStatus]);

  // Submit actions
  const handleSkip = () => {
    if (confirm('Are you sure you want to skip this task?')) {
      alert('Task skipped!');
      onClose();
    }
  };

  const handleSubmit = () => {
    if (annotations.length === 0) {
      alert('Please add at least one annotation before submitting.');
      return;
    }
    alert('Task submitted successfully!');
    onClose();
  };

  const handleApprove = () => {
    alert('Task approved!');
    onClose();
  };

  const handleReject = () => {
    const reason = prompt('Please provide a rejection reason:');
    if (reason && reason.trim()) {
      alert(`Task rejected. Reason: ${reason}`);
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-slate-900 z-50"
    >
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4"
      >
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span>Projects</span>
          <ChevronRight className="w-4 h-4" />
          <span>Medical Imaging</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white font-medium">{currentImage?.filename || `Task_${taskId}.jpg`}</span>

          {/* Status Badge */}
          {taskStatus === 'rejected' && (
            <Badge className="ml-3 bg-red-600 text-white">REJECTED</Badge>
          )}
          {taskStatus === 'approved' && (
            <Badge className="ml-3 bg-green-600 text-white">APPROVED (Read-Only)</Badge>
          )}
        </div>

        {/* Center: Auto-save Status */}
        <div className="flex items-center gap-2 text-sm">
          {autoSaveStatus === 'saving' && (
            <>
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-slate-400">Saving...</span>
            </>
          )}
          {autoSaveStatus === 'saved' && (
            <>
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-slate-400">Saved</span>
            </>
          )}
          {autoSaveStatus === 'unsaved' && (
            <span className="text-orange-400">Unsaved changes</span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {mode === 'annotate' && !isReadOnly && (
            <>
              <Button variant="outline" size="sm" onClick={handleSkip} className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600">
                <SkipForward className="w-4 h-4 mr-2" />
                Skip
              </Button>
              <Button size="sm" onClick={handleSubmit} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Send className="w-4 h-4 mr-2" />
                {taskStatus === 'rejected' ? 'Re-Submit' : 'Submit'}
              </Button>
            </>
          )}
          {mode === 'review' && (
            <>
              <Button variant="outline" size="sm" onClick={handleReject} className="bg-red-900 border-red-700 text-red-200 hover:bg-red-800">
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
              <Button size="sm" onClick={handleApprove} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-700">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Left Toolbar */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 gap-1"
        >
          {/* Drawing Tools */}
          <ToolButton
            icon={MousePointer}
            active={tool === 'select'}
            onClick={() => setTool('select')}
            tooltip="Select (V)"
            disabled={isReadOnly}
          />
          <ToolButton
            icon={Square}
            active={tool === 'rectangle'}
            onClick={() => setTool('rectangle')}
            tooltip="Rectangle (R)"
            disabled={isReadOnly}
          />
          <ToolButton
            icon={Move}
            active={tool === 'hand'}
            onClick={() => setTool('hand')}
            tooltip="Hand (H)"
            disabled={isReadOnly}
          />

          <div className="w-10 h-px bg-slate-700 my-2"></div>

          {/* History */}
          <ToolButton
            icon={Undo}
            onClick={handleUndo}
            tooltip="Undo (Ctrl+Z)"
            disabled={historyIndex === 0 || isReadOnly}
          />
          <ToolButton
            icon={Redo}
            onClick={handleRedo}
            tooltip="Redo (Ctrl+Shift+Z)"
            disabled={historyIndex === history.length - 1 || isReadOnly}
          />

          {/* Zoom Info */}
          <div className="flex-1"></div>
          <div className="text-xs text-slate-400 text-center">
            <div className="font-mono">{zoom}%</div>
          </div>
        </motion.div>

        {/* Center Canvas */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex-1 overflow-hidden relative bg-slate-900"
        >
          <div
            ref={canvasRef}
            className="w-full h-full flex items-center justify-center overflow-auto cursor-crosshair relative"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseLeave}
            onWheel={handleWheel}
            style={{ cursor: tool === 'hand' || isPanning ? 'grab' : 'crosshair' }}
          >
            <div
              className="relative bg-slate-100 shadow-2xl"
              style={{
                width: '800px',
                height: '600px',
                transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
                transformOrigin: 'center center',
              }}
            >
              {/* Mock Medical Image */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
                <div className="text-[200px] opacity-10">🫁</div>
              </div>

              {/* Render Annotations */}
              {annotations.filter(a => a.visible).map(annotation => {
                const colors = labelColors[annotation.label];
                const isSelected = selectedAnnotation === annotation.id;
                return (
                  <div
                    key={annotation.id}
                    className={`absolute cursor-pointer ${isReadOnly ? 'pointer-events-none' : ''}`}
                    style={{
                      left: `${annotation.x}px`,
                      top: `${annotation.y}px`,
                      width: `${annotation.width}px`,
                      height: `${annotation.height}px`,
                      border: `3px solid ${colors.border}`,
                      backgroundColor: colors.fill,
                      boxShadow: isSelected ? `0 0 0 2px white, 0 0 20px ${colors.border}` : 'none',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isReadOnly) setSelectedAnnotation(annotation.id);
                    }}
                  >
                    {/* Label */}
                    <div
                      className="absolute -top-7 left-0 px-2 py-1 text-xs font-medium text-white rounded shadow-lg"
                      style={{ backgroundColor: colors.border }}
                    >
                      {annotation.label}
                    </div>

                    {/* Resize Handles */}
                    {isSelected && !isReadOnly && (
                      <>
                        <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 rounded-full" style={{ borderColor: colors.border }}></div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 rounded-full" style={{ borderColor: colors.border }}></div>
                        <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 rounded-full" style={{ borderColor: colors.border }}></div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 rounded-full" style={{ borderColor: colors.border }}></div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Temp Drawing Box */}
              {tempBox && (
                <div
                  className="absolute border-2 border-dashed border-blue-500"
                  style={{
                    left: `${tempBox.x}px`,
                    top: `${tempBox.y}px`,
                    width: `${tempBox.width}px`,
                    height: `${tempBox.height}px`,
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  }}
                ></div>
              )}
            </div>

            {/* Crosshair Cursor */}
            {crosshair && tool !== 'hand' && !isPanning && (
              <>
                <div
                  className="absolute top-0 bottom-0 w-px bg-blue-400 pointer-events-none opacity-50"
                  style={{ left: `${crosshair.x}px` }}
                ></div>
                <div
                  className="absolute left-0 right-0 h-px bg-blue-400 pointer-events-none opacity-50"
                  style={{ top: `${crosshair.y}px` }}
                ></div>
              </>
            )}

            {/* Zoom Controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
              <Button size="sm" onClick={handleZoomIn} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white">
                +
              </Button>
              <Button size="sm" onClick={handleZoomOut} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white">
                −
              </Button>
            </div>

            {/* Info Overlay */}
            <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur text-white px-3 py-2 rounded text-sm font-mono">
              {zoom}% • 800×600px • {annotations.length} regions
            </div>

            {/* Image Navigation Bar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-800/95 backdrop-blur rounded-lg px-3 py-2 shadow-lg border border-slate-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousImage}
                disabled={!hasPrevious}
                className="text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed h-8 w-8 p-0"
                title="Previous Image (Alt+←)"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-2 text-sm px-2">
                <span className="text-slate-400">{currentImageIndex + 1}</span>
                <span className="text-slate-600">/</span>
                <span className="text-white">{projectImages.length}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImageList(!showImageList)}
                  className="ml-2 text-white hover:bg-slate-700 h-7 px-2"
                  title="Show all images"
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextImage}
                disabled={!hasNext}
                className="text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed h-8 w-8 p-0"
                title="Next Image (Alt+→)"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Image List Dropdown */}
            <AnimatePresence>
              {showImageList && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-16 left-1/2 -translate-x-1/2 w-96 max-h-96 overflow-y-auto bg-slate-800 rounded-lg shadow-2xl border border-slate-700 z-50"
                >
                  <div className="p-3 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800">
                    <h3 className="text-sm font-semibold text-white">Project Images ({projectImages.length})</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowImageList(false)}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="p-2 space-y-1">
                    {projectImages.map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => handleJumpToImage(index)}
                        className={`w-full flex items-center gap-3 p-2 rounded hover:bg-slate-700 transition-colors ${index === currentImageIndex ? 'bg-slate-700 ring-2 ring-blue-500' : ''
                          }`}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded flex items-center justify-center text-2xl flex-shrink-0">
                          {image.thumbnail}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-white">{image.filename}</div>
                          <div className="text-xs text-slate-400">
                            {image.annotationCount} annotations • {
                              image.status === 'approved' ? <span className="text-green-400">Approved</span> :
                                image.status === 'rejected' ? <span className="text-red-400">Rejected</span> :
                                  image.status === 'submitted' ? <span className="text-blue-400">Submitted</span> :
                                    image.status === 'in_progress' ? <span className="text-yellow-400">In Progress</span> :
                                      image.status === 'skipped' ? <span className="text-slate-400">Skipped</span> :
                                        <span className="text-slate-400">Assigned</span>
                            }
                          </div>
                        </div>
                        {index === currentImageIndex && (
                          <Check className="w-5 h-5 text-blue-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right Inspector Panel */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col"
        >
          <Tabs defaultValue={taskStatus === 'rejected' ? 'discussion' : 'regions'} className="flex-1 flex flex-col">
            <TabsList className="w-full rounded-none bg-slate-900 border-b border-slate-700">
              <TabsTrigger value="regions" className="flex-1 data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                Regions ({annotations.length})
              </TabsTrigger>
              <TabsTrigger value="discussion" className="flex-1 data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                Discussion
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Regions */}
            <TabsContent value="regions" className="flex-1 p-4 space-y-4 overflow-y-auto">
              {annotations.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Square className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No annotations yet</p>
                  <p className="text-xs mt-1">Press R to start drawing</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {annotations.map((annotation, index) => {
                    const colors = labelColors[annotation.label];
                    const isSelected = selectedAnnotation === annotation.id;
                    return (
                      <Card
                        key={annotation.id}
                        className={`p-3 cursor-pointer transition-all ${isSelected
                          ? 'bg-slate-700 border-blue-500 border-2'
                          : 'bg-slate-900 border-slate-700 hover:bg-slate-700'
                          } ${isReadOnly ? 'pointer-events-none opacity-60' : ''}`}
                        onClick={() => !isReadOnly && setSelectedAnnotation(annotation.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-slate-400 text-sm font-mono">#{index + 1}</span>
                            <div className="flex-1 min-w-0">
                              {isSelected && !isReadOnly ? (
                                <Select
                                  value={annotation.label}
                                  onValueChange={(value) => handleLabelChange(annotation.id, value)}
                                >
                                  <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableLabels.map(label => (
                                      <SelectItem key={label} value={label}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge className={colors.bg}>{annotation.label}</Badge>
                              )}
                            </div>
                          </div>

                          {!isReadOnly && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-8 h-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleVisibility(annotation.id);
                                }}
                              >
                                {annotation.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-8 h-8 p-0 text-slate-400 hover:text-red-400 hover:bg-slate-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAnnotation(annotation.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 mt-2 font-mono">
                          {Math.round(annotation.width)}×{Math.round(annotation.height)}px
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Quick Tips */}
              <Card className="p-3 bg-slate-900 border-slate-700 mt-4">
                <h4 className="text-xs font-semibold text-slate-300 mb-2">Keyboard Shortcuts</h4>
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Select Tool</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">V</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Rectangle</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">R</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Delete</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">Del</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Quick Label</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">1-9</kbd>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Tab 2: Discussion */}
            <TabsContent value="discussion" className="flex-1 p-4 space-y-4 overflow-y-auto">
              {/* Rejection Alert */}
              {existingReviewComment && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-4 bg-red-900/30 border-2 border-red-500 rounded-lg"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-300 mb-1">Reviewer Feedback</p>
                      <p className="text-sm text-red-200">{existingReviewComment}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Annotator Note */}
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Annotator Note</Label>
                <Textarea
                  value={annotatorNote}
                  onChange={(e) => setAnnotatorNote(e.target.value)}
                  placeholder={mode === 'annotate' ? 'Add notes about your annotation approach...' : 'Annotator\'s notes'}
                  className="min-h-[120px] bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 resize-none"
                  disabled={mode === 'review'}
                />
                <p className="text-xs text-slate-500">
                  {mode === 'annotate'
                    ? 'Describe any uncertainties or special considerations'
                    : 'Read-only: Notes from the annotator'
                  }
                </p>
              </div>

              {/* Task Metadata */}
              <Card className="p-4 bg-slate-900 border-slate-700 space-y-3">
                <h4 className="text-sm font-semibold text-slate-300">Task Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Task ID</span>
                    <span className="text-white font-mono">{taskId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type</span>
                    <span className="text-white">Bounding Box</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Dataset</span>
                    <span className="text-white">Medical - Chest</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status</span>
                    <Badge className={
                      taskStatus === 'approved' ? 'bg-green-600' :
                        taskStatus === 'rejected' ? 'bg-red-600' :
                          taskStatus === 'submitted' ? 'bg-blue-600' :
                            'bg-gray-600'
                    }>
                      {taskStatus?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Available Labels */}
              <Card className="p-4 bg-slate-900 border-slate-700">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Available Labels</h4>
                <div className="flex flex-wrap gap-2">
                  {availableLabels.map((label, index) => (
                    <Badge key={label} className={labelColors[label].bg}>
                      <kbd className="mr-1.5 px-1 py-0.5 bg-white/20 rounded text-xs">{index + 1}</kbd>
                      {label}
                    </Badge>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Helper Component: Tool Button
function ToolButton({
  icon: Icon,
  active = false,
  onClick,
  tooltip,
  disabled = false
}: {
  icon: any;
  active?: boolean;
  onClick?: () => void;
  tooltip?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`
        w-12 h-12 rounded-lg flex items-center justify-center transition-colors
        ${active
          ? 'bg-blue-500 text-white shadow-lg'
          : disabled
            ? 'text-slate-600 cursor-not-allowed'
            : 'text-slate-400 hover:text-white hover:bg-slate-700'
        }
      `}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}