import React, { useState } from "react";
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

interface SkipReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function SkipReasonModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: SkipReasonModalProps) {
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
            Skip Task
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Please provide a reason for skipping this task.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            id="skip-reason"
            placeholder="E.g. Image is blurry, incorrect labels, etc."
            className="bg-slate-950 border-slate-700 text-white min-h-[120px] focus-visible:ring-blue-500"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
            autoFocus
          />
          {isInvalid && (
            <p className="text-xs text-red-400">
              * Reason is required to skip this task.
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
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
          >
            {isLoading ? "Skipping..." : "Confirm Skip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
