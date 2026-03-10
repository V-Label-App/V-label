import { useState } from "react";
import { Button } from "../../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";
import { labelRequestApi } from "../../../../services/label.api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface LabelRequestModelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function LabelRequestModel({
  isOpen,
  onClose,
  projectId,
}: LabelRequestModelProps) {
  const [labelName, setLabelName] = useState("");
  const [suggestedColor, setSuggestedColor] = useState("#3b82f6");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!labelName.trim()) {
      toast.error("Label name is required");
      return;
    }

    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    setIsLoading(true);

    try {
      await labelRequestApi.createRequest(projectId, {
        labelName: labelName.trim(),
        suggestedColor,
        reason: reason.trim(),
      });
      toast.success("Label request created successfully!");

      // Reset form
      setLabelName("");
      setSuggestedColor("#3b82f6");
      setReason("");

      onClose();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err.response?.data?.message || "Failed to create label request",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 text-white border-slate-700">
        <DialogHeader>
          <DialogTitle>Request New Label</DialogTitle>
          <DialogDescription className="text-slate-400">
            Submit a request to add a new label to this project. A project
            manager will review it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="labelName" className="text-slate-200">
              Label Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="labelName"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              placeholder="e.g., Damaged, Out of bounds..."
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggestedColor" className="text-slate-200">
              Suggested Color
            </Label>
            <div className="flex gap-3 items-center">
              <Input
                id="suggestedColor"
                type="color"
                value={suggestedColor}
                onChange={(e) => setSuggestedColor(e.target.value)}
                className="w-14 h-10 p-1 bg-slate-800 border-slate-700 cursor-pointer"
                disabled={isLoading}
              />
              <Input
                type="text"
                value={suggestedColor.toUpperCase()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                    setSuggestedColor(val);
                  }
                }}
                className="flex-1 bg-slate-800 border-slate-700 text-white font-mono"
                placeholder="#000000"
                maxLength={7}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-slate-200">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this label needed?"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px]"
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
