import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { TaskTimeline } from '../../../components/TaskTimeline';
import { Badge } from '../../../components/ui/badge';
import { Calendar, Image as ImageIcon, User } from 'lucide-react';
import { format } from 'date-fns';

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    image?: {
      storageUrl?: string;
      originalFilename?: string | null;
    } | null;
    status?: string;
    deadline?: string | null;
    assignments?: Array<{
      status?: string;
      annotator?: {
        fullName?: string | null;
        email?: string;
      };
    }>;
  } | null;
}

const statusColors: Record<string, string> = {
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  SUBMITTED: 'bg-purple-100 text-purple-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  UNASSIGNED: 'bg-gray-100 text-gray-700',
};

export function TaskDetailDialog({ open, onOpenChange, task }: TaskDetailDialogProps) {
  if (!task) return null;

  const assignment = task.assignments?.[0];
  const annotator = assignment?.annotator;
  const status = assignment?.status || 'UNASSIGNED';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Task Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Preview */}
          {task.image?.storageUrl && (
            <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={task.image.storageUrl}
                alt={task.image.originalFilename || 'Task image'}
                className="w-full h-full object-contain"
              />
            </div>
          )}

          {/* Task Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {task.image?.originalFilename || 'Untitled Task'}
              </h3>
              <Badge className={statusColors[status] || 'bg-gray-100 text-gray-700'}>
                {status.replace('_', ' ')}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              {annotator && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{annotator.fullName || annotator.email}</span>
                </div>
              )}
              {task.deadline && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(task.deadline), 'MMM dd, yyyy')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Activity Timeline */}
          <TaskTimeline taskId={task.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
