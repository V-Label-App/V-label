import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Grid3x3, ThumbsUp, ThumbsDown
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../../components/ui/dialog";
import { Slider } from "../../../components/ui/slider";
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { annotatorApi } from '../../../services/annotator.api';
import { reviewerApi } from '../../../services/reviewer.api';
import { cn } from "../../../components/ui/utils";

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
  taskId?: string;
  mode?: 'annotate' | 'review';
  onClose?: () => void;
  taskStatus?: 'assigned' | 'in_progress' | 'submitted' | 'rejected' | 'approved';
}

// Labels will be loaded from assignment data

export function Workspace({
  taskId,
  mode = 'annotate',
  onClose = () => window.history.back(),
  taskStatus = 'assigned'
}: WorkspaceProps) {
  const { taskId: paramTaskId } = useParams();
  const [searchParams] = useSearchParams();
  const activeTaskId = taskId || paramTaskId;
  const activeMode = (searchParams.get('mode') as 'annotate' | 'review') || mode;

  const [assignment, setAssignment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projectImages, setProjectImages] = useState<ImageTask[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageList, setShowImageList] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // States
  const [tool, setTool] = useState<'select' | 'rectangle' | 'hand'>('select');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [annotatorNote, setAnnotatorNote] = useState('');
  const [history, setHistory] = useState<Annotation[][]>([[]]);
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
  
  // Review Modal States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewScore, setReviewScore] = useState(100);
  const [reviewType, setReviewType] = useState<'approve' | 'reject'>('approve');
  const [reviewLoading, setReviewLoading] = useState(false);

  const isReadOnly = assignment?.status === 'APPROVED' || activeMode === 'review';
  const effectiveTaskStatus = assignment?.status?.toLowerCase() || taskStatus;

  // Derived labels from assignment
  const availableLabels = useMemo(() => assignment?.task?.project?.projectLabels || [], [assignment]);

  // Function declarations (using useCallback for performance and to satisfy effects)
  const addToHistory = useCallback((newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setAnnotations(newAnnotations);
  }, [history, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const handleDeleteAnnotation = useCallback((id: string) => {
    const newAnnotations = annotations.filter(a => a.id !== id);
    addToHistory(newAnnotations);
    setSelectedAnnotation(null);
  }, [annotations, addToHistory]);

  const handleLabelChange = useCallback((id: string, label: string) => {
    const newAnnotations = annotations.map(a =>
      a.id === id ? { ...a, label } : a
    );
    addToHistory(newAnnotations);
  }, [annotations, addToHistory]);

  const handlePreviousImage = useCallback(() => {
    toast.info("Previous task feature coming soon");
  }, []);

  const handleNextImage = useCallback(() => {
    toast.info("Next task feature coming soon");
  }, []);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!activeTaskId) return;

      setIsLoading(true);
      try {
        let data;
        if (activeMode === 'review') {
          data = await reviewerApi.getAssignmentDetail(activeTaskId);
        } else {
          data = await annotatorApi.getTaskAssignment(activeTaskId);
        }
        
        setAssignment(data);
        setAnnotatorNote(data.annotatorNote || '');
        
        if (data.annotations) {
          const loadedAnnotations = Array.isArray(data.annotations) ? data.annotations : [];
          setAnnotations(loadedAnnotations);
          setHistory([loadedAnnotations]);
          setHistoryIndex(0);
        }

        setProjectImages([{
          id: data.id,
          filename: data.task.image?.originalFilename || 'unnamed-image.jpg',
          status: data.status.toLowerCase() as any,
          thumbnail: '🖼️',
          annotationCount: data.annotations?.length || 0
        }]);
      } catch (error) {
        console.error("Failed to fetch task details:", error);
        toast.error("Failed to load task details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeTaskId, activeMode]);

  // Auto-save logic
  useEffect(() => {
    let timer: any;
    if (autoSaveStatus === 'unsaved' && !isReadOnly && activeTaskId) {
      setAutoSaveStatus('saving');
      timer = window.setTimeout(async () => {
        try {
          await annotatorApi.saveDraft(activeTaskId, {
            annotations,
            annotatorNote
          });
          setAutoSaveStatus('saved');
        } catch (error) {
          console.error("[Workspace] Auto-save failed:", error);
          setAutoSaveStatus('unsaved');
        }
      }, 3000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [autoSaveStatus, annotations, annotatorNote, activeTaskId, isReadOnly]);

  // Mark status as unsaved when data changes
  useEffect(() => {
    if (!isReadOnly && (annotations.length > 0 || annotatorNote !== '')) {
      if (assignment) {
         setAutoSaveStatus('unsaved');
      }
    }
  }, [annotations, annotatorNote, isReadOnly, assignment]);

  // Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isReadOnly) return;

      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleRedo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotation) {
        e.preventDefault();
        handleDeleteAnnotation(selectedAnnotation);
      }
      if (e.key === 'v' || e.key === 'V') {
        setTool('select');
      }
      if (e.key === 'r' || e.key === 'R') {
        setTool('rectangle');
      }
      if (e.key === 'h' || e.key === 'H') {
        setTool('hand');
      }
      if (selectedAnnotation && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (index < availableLabels.length) {
          handleLabelChange(selectedAnnotation, availableLabels[index]);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
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
  }, [selectedAnnotation, annotations, historyIndex, isPanning, tool, isReadOnly, handleUndo, handleRedo, handleDeleteAnnotation, handleLabelChange, availableLabels]);

  const hasPrevious = projectImages.length > 0 && currentImageIndex > 0;
  const hasNext = projectImages.length > 0 && currentImageIndex < projectImages.length - 1;
  const currentImage = projectImages[currentImageIndex];

  // Canvas handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isReadOnly && tool !== 'hand' && !isPanning) return;

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

    if (isDrawing && tempBox && tempBox.width > 2 && tempBox.height > 2) {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        label: availableLabels[0]?.label.name || 'Default',
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

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom(prev => Math.max(50, Math.min(500, prev + delta)));
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(500, prev + 25));
  const handleZoomOut = () => setZoom(prev => Math.max(50, prev - 25));

  const handleToggleVisibility = useCallback((id: string) => {
    const newAnnotations = annotations.map(a =>
      a.id === id ? { ...a, visible: !a.visible } : a
    );
    setAnnotations(newAnnotations);
  }, [annotations]);

  const handleJumpToImage = (index: number) => {
    if (index === currentImageIndex) return;
    if (autoSaveStatus === 'unsaved') {
      if (!confirm('You have unsaved changes. Do you want to continue?')) {
        return;
      }
    }
    setCurrentImageIndex(index);
    setAnnotations([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setZoom(100);
    setPan({ x: 0, y: 0 });
    setSelectedAnnotation(null);
    setShowImageList(false);
  };

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
  }, [currentImageIndex, autoSaveStatus, handlePreviousImage, handleNextImage]);

  const handleSkip = async () => {
    if (!activeTaskId) return;
    if (confirm('Are you sure you want to skip this task?')) {
      try {
        await annotatorApi.updateTaskAssignment(activeTaskId, {
          status: 'SKIPPED'
        });
        toast.success('Task skipped');
        onClose();
      } catch (error) {
        toast.error('Failed to skip task');
      }
    }
  };

  const handleSubmit = async () => {
    if (!activeTaskId) return;
    if (annotations.length === 0) {
      toast.error('Please add at least one annotation before submitting.');
      return;
    }
    
    try {
      await annotatorApi.updateTaskAssignment(activeTaskId, {
        status: 'SUBMITTED',
        annotations,
        annotatorNote
      });
      toast.success('Task submitted successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to submit task');
    }
  };

  const handleApprove = () => {
    setReviewType('approve');
    setReviewScore(100);
    setShowReviewModal(true);
  };

  const handleReject = () => {
    setReviewType('reject');
    setReviewScore(0);
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!activeTaskId) return;
    
    setReviewLoading(true);
    try {
      if (reviewType === 'approve') {
        await reviewerApi.approveTask(activeTaskId, { 
          reviewComment: annotatorNote, // Reuse note or add new field
          reviewScore: reviewScore 
        });
        toast.success(`Task approved with score: ${reviewScore}`);
      } else {
        if (!annotatorNote.trim()) {
          toast.error("Please provide a rejection reason in the notes.");
          setReviewLoading(false);
          return;
        }
        await reviewerApi.rejectTask(activeTaskId, { 
          reviewComment: annotatorNote,
          reviewScore: reviewScore 
        });
        toast.success(`Task rejected with score: ${reviewScore}`);
      }
      setShowReviewModal(false);
      onClose();
    } catch (error) {
      toast.error(`Failed to ${reviewType} task`);
    } finally {
      setReviewLoading(false);
    }
  };

  if (isLoading || !assignment) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-50 flex items-center justify-center text-white font-medium">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <div className="flex flex-col items-center">
            <p className="text-lg">Initializing Workspace</p>
            <p className="text-sm text-slate-400">Loading task data and image assets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 bg-slate-900 z-50 overflow-hidden"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 sticky top-0 z-10"
      >
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span>Projects</span>
          <ChevronRight className="w-4 h-4" />
          <span>Medical Imaging</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white font-medium">{currentImage?.filename || `Task_${activeTaskId}.jpg`}</span>

          {taskStatus === 'rejected' && (
            <Badge className="ml-3 bg-red-600 text-white">REJECTED</Badge>
          )}
          {taskStatus === 'approved' && (
            <Badge className="ml-3 bg-green-600 text-white">APPROVED (Read-Only)</Badge>
          )}
        </div>

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
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 gap-1 z-10"
        >
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

          <div className="flex-1"></div>
          <div className="text-xs text-slate-400 text-center">
            <div className="font-mono">{zoom}%</div>
          </div>
        </motion.div>

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
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center select-none pointer-events-none">
                <div className="text-[200px] opacity-10">🫁</div>
              </div>

              {annotations.filter(a => a.visible).map(annotation => {
                const labelConfig = availableLabels.find((pl: any) => pl.label.name === annotation.label)?.label;
                const colors = {
                   border: labelConfig?.color || '#3B82F6',
                   fill: `${labelConfig?.color || '#3B82F6'}33`,
                };
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
                    <div
                      className="absolute -top-7 left-0 px-2 py-1 text-xs font-medium text-white rounded shadow-lg whitespace-nowrap"
                      style={{ backgroundColor: colors.border }}
                    >
                      {annotation.label}
                    </div>

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

            {crosshair && tool !== 'hand' && !isPanning && (
              <>
                <div
                  className="absolute top-0 bottom-0 w-px bg-blue-400 pointer-events-none opacity-50 z-20"
                  style={{ left: `${crosshair.x}px` }}
                ></div>
                <div
                  className="absolute left-0 right-0 h-px bg-blue-400 pointer-events-none opacity-50 z-20"
                  style={{ top: `${crosshair.y}px` }}
                ></div>
              </>
            )}

            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
              <Button size="sm" onClick={handleZoomIn} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white">
                +
              </Button>
              <Button size="sm" onClick={handleZoomOut} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-white">
                −
              </Button>
            </div>

            <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur text-white px-3 py-2 rounded text-sm font-mono z-20">
              {zoom}% • 800×600px • {annotations.length} regions
            </div>

            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-800/95 backdrop-blur rounded-lg px-3 py-2 shadow-lg border border-slate-700 z-20">
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

            <AnimatePresence>
              {showImageList && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-16 left-1/2 -translate-x-1/2 w-96 max-h-96 overflow-y-auto bg-slate-800 rounded-lg shadow-2xl border border-slate-700 z-50"
                  onClick={(e) => e.stopPropagation()}
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

        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col z-10 shadow-xl"
        >
          <Tabs defaultValue={taskStatus === 'rejected' ? 'discussion' : 'regions'} className="flex-1 flex flex-col h-full max-h-[calc(100vh-3.5rem)]">
            <TabsList className="w-full rounded-none bg-slate-900 border-b border-slate-700 grid grid-cols-2 p-0 h-10">
              <TabsTrigger value="regions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
                Regions ({annotations.length})
              </TabsTrigger>
              <TabsTrigger value="discussion" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">
                Discussion
              </TabsTrigger>
            </TabsList>

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
                    const labelConfig = availableLabels.find((pl: any) => pl.label.name === annotation.label)?.label;
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
                                  onValueChange={(value: string) => handleLabelChange(annotation.id, value)}
                                >
                                  <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableLabels.map((pl: any) => (
                                      <SelectItem key={pl.label.id} value={pl.label.name}>{pl.label.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge 
                                  style={{ 
                                    backgroundColor: `${labelConfig?.color || '#3B82F6'}20`, 
                                    borderColor: labelConfig?.color || '#3B82F6', 
                                    color: labelConfig?.color || '#3B82F6' 
                                  }}
                                  variant="outline"
                                >
                                  {annotation.label}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {!isReadOnly && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-8 h-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                                onClick={(e: React.MouseEvent) => {
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
                                onClick={(e: React.MouseEvent) => {
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

            <TabsContent value="discussion" className="flex-1 p-4 space-y-4 overflow-y-auto">
              {assignment?.reviewComment && (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="p-4 bg-red-900/30 border-2 border-red-500 rounded-lg"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-300 mb-1">Reviewer Feedback</p>
                      <p className="text-sm text-red-200">{assignment?.reviewComment}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Annotator Note</Label>
                <Textarea
                  value={annotatorNote}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnnotatorNote(e.target.value)}
                  placeholder={activeMode === 'annotate' ? 'Add notes about your annotation approach...' : 'Annotator\'s notes'}
                  className="min-h-[120px] bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 resize-none"
                  disabled={activeMode === 'review'}
                />
                <p className="text-xs text-slate-500">
                  {activeMode === 'annotate'
                    ? 'Describe any uncertainties or special considerations'
                    : 'Read-only: Notes from the annotator'
                  }
                </p>
              </div>

              <Card className="p-4 bg-slate-900 border-slate-700 space-y-3">
                <h4 className="text-sm font-semibold text-slate-300">Task Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Task ID</span>
                    <span className="text-white font-mono">{activeTaskId?.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Project</span>
                    <span className="text-white truncate max-w-[150px]">{assignment?.task?.project?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status</span>
                    <Badge className={
                      effectiveTaskStatus === 'approved' ? 'bg-green-600' :
                        effectiveTaskStatus === 'rejected' ? 'bg-red-600' :
                          effectiveTaskStatus === 'submitted' ? 'bg-blue-600' :
                            'bg-gray-600'
                    }>
                      {effectiveTaskStatus?.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </Card>

              {assignment?.task?.project?.projectLabels && (
                <Card className="p-4 bg-slate-900 border-slate-700">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Available Labels</h4>
                  <div className="flex flex-wrap gap-2">
                    {assignment.task.project.projectLabels.map((pl: any, index: number) => (
                      <Badge 
                        key={pl.label.id} 
                        style={{ backgroundColor: `${pl.label.color}20`, borderColor: pl.label.color, color: pl.label.color }}
                        variant="outline"
                      >
                        <kbd className="mr-1.5 px-1 py-0.5 bg-white/10 rounded text-xs">{index + 1}</kbd>
                        {pl.label.name}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </motion.div>
    
    <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            {reviewType === 'approve' ? (
              <ThumbsUp className="w-6 h-6 text-green-500" />
            ) : (
              <ThumbsDown className="w-6 h-6 text-red-500" />
            )}
            {reviewType === 'approve' ? 'Approve Task' : 'Reject Task'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {reviewType === 'approve' 
              ? "Rate the quality and provide feedback to the annotator." 
              : "Explain why this work was rejected and adjust the score."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-8 py-6">
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <Label className="text-sm font-semibold text-slate-300">Work Quality Score</Label>
              <div className="text-2xl font-black text-blue-400 font-mono">{reviewScore}%</div>
            </div>
            <Slider
              value={[reviewScore]}
              max={100}
              step={1}
              onValueChange={(val) => setReviewScore(val[0])}
              className="py-4 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              <span>Poor</span>
              <span>Fair</span>
              <span>Excellent</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-300">
              {reviewType === 'approve' ? 'Review Comments (Optional)' : 'Rejection Reason (Required)'}
            </Label>
            <Textarea
              value={annotatorNote}
              onChange={(e) => setAnnotatorNote(e.target.value)}
              placeholder={reviewType === 'approve' ? "Add a note of appreciation or guidance..." : "Explain exactly what needs improvement..."}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px] focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <DialogFooter className="gap-3 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => setShowReviewModal(false)}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={submitReview}
            disabled={reviewLoading || (reviewType === 'reject' && !annotatorNote.trim())}
            className={cn(
              "min-w-[120px] font-bold shadow-lg shadow-black/20",
              reviewType === 'approve' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            )}
          >
            {reviewLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              reviewType === 'approve' ? 'Finalize Approval' : 'Submit Rejection'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

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