import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../../../components/ui/dialog";
import { Button } from "../../../../components/ui/button";
import { Textarea } from "../../../../components/ui/textarea";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { cn } from "../../../../components/ui/utils";
import { Label } from "../../../../components/ui/label";

interface ReviewScoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
  type: "approve" | "reject";
  isLoading?: boolean;
  initialComment?: string;
}

export function ReviewScoringModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  isLoading = false,
  initialComment = "",
}: ReviewScoringModalProps) {
  const [comment, setComment] = useState(initialComment || "");

  const handleConfirm = () => {
    onConfirm(comment);
  };

  const isInvalid = type === "reject" && (!comment || !comment.trim());

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-white">
            {type === "approve" ? (
              <ThumbsUp className="w-7 h-7 text-green-400" />
            ) : (
              <ThumbsDown className="w-7 h-7 text-red-400" />
            )}
            {type === "approve" ? "Approve Task" : "Reject Task"}
          </DialogTitle>
          <DialogDescription className="text-slate-200 text-sm mt-1 font-medium">
            {type === "approve"
              ? "Rate the quality and provide feedback to the annotator."
              : "Explain why this work was rejected and adjust the score."}
          </DialogDescription>
        </DialogHeader>


        <div className="space-y-8 py-6">
          {type === "reject" && (
            <div className="space-y-3">
              <Label className="text-xs font-black text-slate-100 uppercase tracking-widest">
                Rejection Reason (Required)
              </Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Explain exactly what needs improvement..."
                className="bg-slate-950 border-slate-600 text-white placeholder:text-slate-500 min-h-[120px] focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-base shadow-inner"
                disabled={isLoading}
              />
              {isInvalid && (
                <p className="text-[11px] text-red-100 bg-red-600/20 px-2 py-1 rounded inline-block font-black animate-pulse">
                  ⚠ Reason is required to reject this task.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 sm:gap-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || isInvalid}
            className={cn(
              "min-w-[140px] font-bold shadow-lg shadow-black/20",
              type === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : type === "approve" ? (
              "Finalize Approval"
            ) : (
              "Submit Rejection"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
