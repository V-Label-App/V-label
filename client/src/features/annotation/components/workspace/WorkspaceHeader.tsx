import { Button } from "../../../../components/ui/button";
import {
  ChevronRight,
  Check,
  Loader2,
  SkipForward,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
} from "lucide-react";
import { Badge } from "../../../../components/ui/badge";
import { useImageStore } from "../../stores";

interface WorkspaceHeaderProps {
  mode?: "annotate" | "review";
  taskStatus?:
    | "assigned"
    | "in_progress"
    | "submitted"
    | "rejected"
    | "approved"
    | "skipped";
  onSubmit?: () => void;
  onSkip?: () => void;
  onApprove?: () => void;

  onReject?: () => void;
  onResume?: () => void;
  onSave?: () => void;
  onClose?: () => void;
  actualTimeSeconds?: number;
  projectName?: string;
  annotator?: {
    fullName: string;
    email?: string;
    reputationScore?: number;
  };
  isTaskReassigned?: boolean;
  rejectionCount?: number;
}

export function WorkspaceHeader({
  mode = "annotate",
  taskStatus = "assigned",
  onSubmit,
  onSkip,
  onApprove,

  onReject,
  onResume,
  onSave,
  onClose,
  actualTimeSeconds = 0,
  projectName,
  annotator,
  isTaskReassigned,
  rejectionCount = 0,
}: WorkspaceHeaderProps) {
  const { getCurrentImage, autoSaveStatus } = useImageStore();
  const currentImage = getCurrentImage();
  const isReadOnly =
    taskStatus.toLowerCase() === "approved" || // Ensure case-insensitive comparison
    taskStatus.toLowerCase() === "submitted" || // Ensure case-insensitive comparison
    mode === "review";

  const isSkipped = taskStatus.toLowerCase() === "skipped";
  // We trust the taskStatus prop more as it's directly sync'd with taskData in the page

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-300">
        <span>{projectName || "Loading..."}</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-white font-medium">
          {currentImage?.filename || "Loading..."}
        </span>

        {taskStatus.toLowerCase() === "assigned" && (
          <Badge className="ml-3 bg-blue-500 text-white animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.3)]">
            ASSIGNED
          </Badge>
        )}
        {taskStatus.toLowerCase() === "in_progress" && (
          <Badge className="ml-3 bg-yellow-500 text-white font-semibold animate-pulse shadow-[0_0_10px_rgba(234,179,8,0.3)]">
            IN PROGRESS
          </Badge>
        )}
        {taskStatus === "rejected" && (
          <Badge className="ml-3 bg-red-600 text-white animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.3)]">
            {mode === "review" ? "REJECTED (Read-Only)" : "REJECTED"}
          </Badge>
        )}
        {taskStatus === "approved" && (
          <Badge className="ml-3 bg-green-600 text-white animate-pulse shadow-[0_0_10px_rgba(22,163,74,0.3)]">
            APPROVED (Read-Only)
          </Badge>
        )}
        {taskStatus === "submitted" && (
          <Badge className="ml-3 bg-blue-600 text-white animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.3)]">
            {mode === "review" ? "PENDING REVIEW" : "SUBMITTED"}
          </Badge>
        )}
        {isSkipped && (
          <Badge
            className={`ml-3 text-white animate-pulse ${isTaskReassigned || taskStatus === "skipped" ? "bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)]" : "bg-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.3)]"}`}
          >
            {isTaskReassigned || taskStatus === "skipped"
              ? "REASSIGNED"
              : "REASSIGNING"}
          </Badge>
        )}

        {rejectionCount > 0 && (
          <div className="ml-3 flex items-center gap-1.5 px-2.5 py-1 bg-red-950/40 border border-red-500/30 rounded-full text-red-400">
            <RotateCcw className="w-3 h-3" />
            <span className="text-[11px] font-bold uppercase tracking-wide">
              {rejectionCount} {rejectionCount === 1 ? "REJECTION" : "REJECTIONS"}
            </span>
          </div>
        )}

        {mode === "review" && annotator && (
          <div className="ml-4 flex items-center gap-2 px-3 py-1 bg-purple-900/30 border border-purple-500/30 rounded-full text-purple-200">
            <span className="text-[10px] font-bold uppercase text-purple-400 tracking-wider">
              Reviewing
            </span>
            <span className="font-semibold">{annotator.fullName}</span>
          </div>
        )}
      </div>

      {/* Auto-save Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          {/* Work Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-700/50 rounded-md border border-slate-600 mr-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-200 font-mono tracking-wider">
              {formatTime(actualTimeSeconds)}
            </span>
          </div>

          {autoSaveStatus === "saving" && (
            <>
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-slate-400">Saving...</span>
            </>
          )}
          {autoSaveStatus === "saved" && (
            <>
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-slate-400">Saved</span>
            </>
          )}
          {autoSaveStatus === "unsaved" && (
            <span className="text-orange-400">Unsaved changes</span>
          )}

          {/* Manual Save Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            disabled={taskStatus.toLowerCase() !== "in_progress" || autoSaveStatus === "saving"}
            className="ml-2 flex items-center gap-1.5 px-3 h-8 bg-slate-700/50 border border-slate-600 text-slate-300 hover:bg-blue-600/20 hover:text-blue-400 hover:border-blue-500/50 transition-all rounded-md disabled:opacity-40 disabled:cursor-not-allowed group"
            title={taskStatus.toLowerCase() === "in_progress" ? "Manual Save (Ctrl+S)" : "Cannot save in current status"}
          >
            {autoSaveStatus === "saving" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span className="text-[11px] font-bold uppercase tracking-widest hidden sm:inline">Save</span>
          </Button>
        </div>

        {/* Actions */}
        {mode === "annotate" && !isReadOnly && (
          <>
            {isSkipped ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onResume}
                className="bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700"
              >
                <Clock className="w-4 h-4 mr-2" />
                Resume Annotation
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSkip}
                  className="bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Skip
                </Button>
                <Button
                  size="sm"
                  onClick={onSubmit}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {taskStatus === "rejected" ? "Re-Submit" : "Submit"}
                </Button>
              </>
            )}
          </>
        )}
        {mode === "review" && taskStatus === "submitted" && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onReject}
              className="bg-red-900 border-red-700 text-red-200 hover:bg-red-800"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-slate-400 hover:text-white hover:bg-slate-700"
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
