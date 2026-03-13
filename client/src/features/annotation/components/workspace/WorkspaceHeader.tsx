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
  onClose?: () => void;
  actualTimeSeconds?: number;
  projectName?: string;
}

export function WorkspaceHeader({
  mode = "annotate",
  taskStatus = "assigned",
  onSubmit,
  onSkip,
  onApprove,
  onReject,
  onResume,
  onClose,
  actualTimeSeconds = 0,
  projectName,
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
          <Badge className="ml-3 bg-blue-500 text-white">ASSIGNED</Badge>
        )}
        {taskStatus === "rejected" && (
          <Badge className="ml-3 bg-red-600 text-white">REJECTED</Badge>
        )}
        {taskStatus === "approved" && (
          <Badge className="ml-3 bg-green-600 text-white">
            APPROVED (Read-Only)
          </Badge>
        )}
        {taskStatus === "submitted" && (
          <Badge className="ml-3 bg-blue-600 text-white">SUBMITTED</Badge>
        )}
        {isSkipped && (
          <Badge className="ml-3 bg-indigo-600 text-white">SKIPPED</Badge>
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
