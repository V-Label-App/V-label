import { useState, useEffect } from 'react';
import { taskActivityApi, TaskAction, type TaskActivity } from '../services/task-activity.api';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';
import {
  Clock, UserPlus, UserMinus, Trash2, CheckCircle, XCircle,
  CalendarClock, ArrowRightLeft, FileText, Users
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface TaskTimelineProps {
  taskId: string;
}

const actionIcons: Record<TaskAction, any> = {
  [TaskAction.CREATED]: FileText,
  [TaskAction.ASSIGNED]: UserPlus,
  [TaskAction.UNASSIGNED]: UserMinus,
  [TaskAction.REASSIGNED]: ArrowRightLeft,
  [TaskAction.DEADLINE_UPDATED]: CalendarClock,
  [TaskAction.STATUS_CHANGED]: ArrowRightLeft,
  [TaskAction.SUBMITTED]: FileText,
  [TaskAction.APPROVED]: CheckCircle,
  [TaskAction.REJECTED]: XCircle,
  [TaskAction.DELETED]: Trash2,
  [TaskAction.RESTORED]: ArrowRightLeft,
  [TaskAction.BULK_ASSIGNED]: Users,
  [TaskAction.BULK_UNASSIGNED]: Users,
  [TaskAction.BULK_DELETED]: Trash2,
};

const actionColors: Record<TaskAction, string> = {
  [TaskAction.CREATED]: 'bg-blue-500',
  [TaskAction.ASSIGNED]: 'bg-green-500',
  [TaskAction.UNASSIGNED]: 'bg-orange-500',
  [TaskAction.REASSIGNED]: 'bg-purple-500',
  [TaskAction.DEADLINE_UPDATED]: 'bg-yellow-500',
  [TaskAction.STATUS_CHANGED]: 'bg-indigo-500',
  [TaskAction.SUBMITTED]: 'bg-cyan-500',
  [TaskAction.APPROVED]: 'bg-emerald-500',
  [TaskAction.REJECTED]: 'bg-red-500',
  [TaskAction.DELETED]: 'bg-gray-500',
  [TaskAction.RESTORED]: 'bg-teal-500',
  [TaskAction.BULK_ASSIGNED]: 'bg-green-500',
  [TaskAction.BULK_UNASSIGNED]: 'bg-orange-500',
  [TaskAction.BULK_DELETED]: 'bg-gray-500',
};

const actionLabels: Record<TaskAction, string> = {
  [TaskAction.CREATED]: 'Created',
  [TaskAction.ASSIGNED]: 'Assigned',
  [TaskAction.UNASSIGNED]: 'Unassigned',
  [TaskAction.REASSIGNED]: 'Reassigned',
  [TaskAction.DEADLINE_UPDATED]: 'Deadline Updated',
  [TaskAction.STATUS_CHANGED]: 'Status Changed',
  [TaskAction.SUBMITTED]: 'Submitted',
  [TaskAction.APPROVED]: 'Approved',
  [TaskAction.REJECTED]: 'Rejected',
  [TaskAction.DELETED]: 'Deleted',
  [TaskAction.RESTORED]: 'Restored',
  [TaskAction.BULK_ASSIGNED]: 'Assigned',
  [TaskAction.BULK_UNASSIGNED]: 'Unassigned',
  [TaskAction.BULK_DELETED]: 'Deleted',
};

function getActivityDescription(activity: TaskActivity): string {
  const userName = activity.user.fullName || activity.user.email;
  const metadata = activity.metadata || {};

  switch (activity.action) {
    case TaskAction.ASSIGNED:
      return `Assigned to ${metadata.targetUserName || 'an annotator'} by ${userName}`;
    case TaskAction.UNASSIGNED:
      return `Unassigned from ${metadata.targetUserName || 'an annotator'} by ${userName}`;
    case TaskAction.REASSIGNED:
      return `Reassigned from ${metadata.oldAssignee} to ${metadata.newAssignee} by ${userName}`;
    case TaskAction.DEADLINE_UPDATED:
      return `Deadline updated by ${userName}`;
    case TaskAction.SUBMITTED:
      return `Submitted by ${userName}`;
    case TaskAction.APPROVED:
      return `Approved by ${userName}`;
    case TaskAction.REJECTED:
      return `Rejected by ${userName}`;
    case TaskAction.DELETED:
      return `Deleted by ${userName}`;
    case TaskAction.BULK_ASSIGNED:
      return `Assigned to ${metadata.targetUserName || 'annotator'} by ${userName} - ${metadata.taskNames?.join(', ') || `${metadata.count || 0} tasks`}`;
    case TaskAction.BULK_UNASSIGNED:
      return `Unassigned from ${metadata.targetUserName || 'annotator'} by ${userName} - ${metadata.taskNames?.join(', ') || `${metadata.count || 0} tasks`}`;
    case TaskAction.BULK_DELETED:
      return `Deleted by ${userName} - ${metadata.taskNames?.join(', ') || `${metadata.count || 0} tasks`}`;
    default:
      return `${actionLabels[activity.action]} by ${userName}`;
  }
}

export function TaskTimeline({ taskId }: TaskTimelineProps) {
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadActivities = async () => {
      if (!taskId) return;
      setIsLoading(true);
      try {
        const data = await taskActivityApi.getTaskActivities(taskId, 20);
        setActivities(data);
      } catch (error) {
        console.error('Failed to load task activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadActivities();
  }, [taskId]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-gray-500" />
          <h4 className="text-sm font-semibold">Activity Timeline</h4>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-gray-500" />
          <h4 className="text-sm font-semibold">Activity Timeline</h4>
        </div>
        <div className="text-center py-8 text-sm text-gray-500">
          No activity history yet
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-gray-500" />
        <h4 className="text-sm font-semibold">Activity Timeline</h4>
        <Badge variant="secondary" className="ml-auto text-xs">
          {activities.length} {activities.length === 1 ? 'event' : 'events'}
        </Badge>
      </div>

      <ScrollArea className="h-[300px] pr-4">
        <div className="relative">
          {/* Timeline vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

          <div className="space-y-3">
            {activities.map((activity, index) => {
              const Icon = actionIcons[activity.action];
              const isFirst = index === 0;

              return (
                <div key={activity.id} className="relative pl-10 group">
                  {/* Timeline dot */}
                  <div className={`absolute left-0 top-1 h-8 w-8 rounded-full ${actionColors[activity.action]} flex items-center justify-center ring-4 ring-white shadow-md transition-transform group-hover:scale-110`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>

                  {/* Content */}
                  <div className={`pb-3 ${!isFirst && 'pt-1'}`}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold text-gray-900">
                            {actionLabels[activity.action]}
                          </p>
                          {isFirst && <Badge variant="outline" className="text-[10px] py-0 h-4 bg-green-50 text-green-700 border-green-300">Latest</Badge>}
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {getActivityDescription(activity)}
                        </p>
                      </div>
                      <Avatar className="h-7 w-7 flex-shrink-0 ring-2 ring-white shadow-sm">
                        <AvatarImage src={activity.user.avatarUrl || undefined} />
                        <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {activity.user.fullName?.charAt(0).toUpperCase() || activity.user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium">{formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}</span>
                    </div>

                    {/* Metadata */}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2.5 text-xs">
                        {activity.metadata.deadline && (
                          <div className="flex items-center gap-1.5 text-gray-700 bg-blue-50 p-2 rounded-lg">
                            <CalendarClock className="h-3.5 w-3.5 text-blue-600" />
                            <span className="font-medium">Deadline:</span>
                            <span>{format(new Date(activity.metadata.deadline), 'MMM dd, yyyy HH:mm')}</span>
                          </div>
                        )}
                        {activity.metadata.reason && (
                          <div className="mt-1.5 p-2.5 bg-amber-50 rounded-lg text-gray-700 border border-amber-200">
                            <span className="font-bold text-amber-800">Reason:</span> {activity.metadata.reason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
