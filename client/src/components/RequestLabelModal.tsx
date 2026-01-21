import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { labelRequestApi } from '../services/label.api';

const DEFAULT_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

interface RequestLabelModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: () => void;
}

export function RequestLabelModal({ open, onClose, projectId, onSuccess }: RequestLabelModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [labelName, setLabelName] = useState('');
  const [suggestedColor, setSuggestedColor] = useState(DEFAULT_COLORS[0]);
  const [reason, setReason] = useState('');

  const resetForm = () => {
    setLabelName('');
    setSuggestedColor(DEFAULT_COLORS[0]);
    setReason('');
  };

  const handleSubmit = async () => {
    if (!labelName.trim()) {
      toast.error('Label name is required');
      return;
    }

    setIsLoading(true);
    try {
      await labelRequestApi.createRequest(projectId, {
        labelName: labelName.trim(),
        suggestedColor,
        reason: reason.trim() || undefined,
      });
      toast.success('Label request submitted successfully! A manager will review it.');
      resetForm();
      onClose();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit label request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request New Label</DialogTitle>
          <DialogDescription>
            Submit a request for a new label to be added to this project. A manager will review your request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Label Name *</Label>
            <Input
              placeholder="e.g. Traffic Light, Road Sign"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Suggested Color</Label>
            <div className="flex gap-2 flex-wrap">
              {DEFAULT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  disabled={isLoading}
                  className={`w-8 h-8 rounded-md border-2 transition-all ${suggestedColor === color ? 'border-gray-900 scale-110' : 'border-gray-200'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSuggestedColor(color)}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              This is a suggestion. The manager may choose a different color.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Reason (Optional)</Label>
            <Textarea
              placeholder="Explain why this label is needed..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !labelName.trim()}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
