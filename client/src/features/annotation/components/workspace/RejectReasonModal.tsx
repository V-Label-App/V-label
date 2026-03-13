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

interface RejectReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function RejectReasonModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: RejectReasonModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason(""); // Reset for next time
    }
  };

  const isInvalid = !reason.trim();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            Reject Task
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Please provide a specific reason for rejecting this annotation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            id="reject-reason"
            placeholder="E.g. Incorrect label for object #2, missing bounding boxes..."
            className="bg-slate-950 border-slate-700 text-white min-h-[120px] focus-visible:ring-red-500"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
            autoFocus
          />
          {isInvalid && (
            <p className="text-xs text-red-400">
              * Reason is required to reject this task.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
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
            disabled={isInvalid || isLoading}
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 shadow-[0_0_15px_rgba(220,38,38,0.4)]"
          >
            {isLoading ? "Rejecting..." : "Confirm Rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
