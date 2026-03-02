import { useState, useEffect } from 'react';
import { taskActivityApi, TaskAction, type TaskActivity } from '../../../services/task-activity.api';
import { projectApi } from '../../../services/project.api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  Clock, User, UserPlus, UserMinus, Trash2, CheckCircle, XCircle,
  CalendarClock, ArrowRightLeft, FileText, Users, ChevronLeft, ChevronRight, Minus, UserX, Plus
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ActivityTabProps {
  projectId: string;
}

const actionIcons: Record<TaskAction, any> = {
  [TaskAction.CREATED]: Plus,
  [TaskAction.ASSIGNED]: UserPlus,
  [TaskAction.UNASSIGNED]: UserX,
  [TaskAction.REASSIGNED]: ArrowRightLeft,
  [TaskAction.DEADLINE_UPDATED]: CalendarClock,
  [TaskAction.STATUS_CHANGED]: ArrowRightLeft,
  [TaskAction.SUBMITTED]: FileText,
  [TaskAction.APPROVED]: CheckCircle,
  [TaskAction.REJECTED]: XCircle,
  [TaskAction.DELETED]: Minus,
  [TaskAction.RESTORED]: ArrowRightLeft,
  [TaskAction.BULK_ASSIGNED]: UserPlus,
  [TaskAction.BULK_UNASSIGNED]: UserX,
  [TaskAction.BULK_DELETED]: Minus,
};

const actionColors: Record<TaskAction, string> = {
  [TaskAction.CREATED]: 'bg-blue-100 text-blue-700',
  [TaskAction.ASSIGNED]: 'bg-green-100 text-green-700',
  [TaskAction.UNASSIGNED]: 'bg-orange-100 text-orange-700',
  [TaskAction.REASSIGNED]: 'bg-purple-100 text-purple-700',
  [TaskAction.DEADLINE_UPDATED]: 'bg-yellow-100 text-yellow-700',
  [TaskAction.STATUS_CHANGED]: 'bg-indigo-100 text-indigo-700',
  [TaskAction.SUBMITTED]: 'bg-cyan-100 text-cyan-700',
  [TaskAction.APPROVED]: 'bg-emerald-100 text-emerald-700',
  [TaskAction.REJECTED]: 'bg-red-100 text-red-700',
  [TaskAction.DELETED]: 'bg-red-100 text-red-700',
  [TaskAction.RESTORED]: 'bg-teal-100 text-teal-700',
  [TaskAction.BULK_ASSIGNED]: 'bg-green-100 text-green-700',
  [TaskAction.BULK_UNASSIGNED]: 'bg-orange-100 text-orange-700',
  [TaskAction.BULK_DELETED]: 'bg-red-100 text-red-700',
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

function formatTaskList(taskNames: string[] | undefined, count: number, maxDisplay: number = 4): string {
  if (!taskNames || taskNames.length === 0) {
    return `${count} tasks`;
  }

  if (taskNames.length <= maxDisplay) {
    return taskNames.join(', ');
  }

  const displayed = taskNames.slice(0, maxDisplay);
  const remaining = taskNames.length - maxDisplay;
  return `${displayed.join(', ')}, +${remaining} more`;
}

function getActivityMessage(activity: TaskActivity): { title: string; details: string } {
  const metadata = activity.metadata || {};
  // Use task name from metadata if task was deleted, otherwise from task relation
  const taskName = metadata.taskName || activity.task?.image?.originalFilename ||
    (activity.taskId ? `Task #${activity.taskId.substring(0, 6)}` : 'Unknown task');

  switch (activity.action) {
    case TaskAction.ASSIGNED:
      return {
        title: `Assigned task to ${metadata.targetUserName || 'annotator'}`,
        details: taskName
      };
    case TaskAction.UNASSIGNED:
      return {
        title: `Unassigned from ${metadata.targetUserName || 'annotator'}`,
        details: taskName
      };
    case TaskAction.REASSIGNED:
      return {
        title: `Reassigned: ${metadata.oldAssignee} → ${metadata.newAssignee}`,
        details: taskName
      };
    case TaskAction.DEADLINE_UPDATED:
      return {
        title: 'Updated deadline',
        details: taskName
      };
    case TaskAction.SUBMITTED:
      return {
        title: 'Submitted task',
        details: taskName
      };
    case TaskAction.APPROVED:
      return {
        title: 'Approved task',
        details: taskName
      };
    case TaskAction.REJECTED:
      return {
        title: 'Rejected task',
        details: taskName
      };
    case TaskAction.CREATED:
      // Check if it's a bulk operation (has count in metadata)
      if (metadata.count && metadata.count > 1) {
        return {
          title: 'Created tasks',
          details: formatTaskList(metadata.taskNames, metadata.count)
        };
      }
      return {
        title: 'Created task',
        details: taskName
      };
    case TaskAction.BULK_ASSIGNED:
      return {
        title: `Assigned tasks to ${metadata.targetUserName || 'annotator'}`,
        details: formatTaskList(metadata.taskNames, metadata.count || 0)
      };
    case TaskAction.BULK_UNASSIGNED:
      return {
        title: `Unassigned from ${metadata.targetUserName || 'annotator'}`,
        details: formatTaskList(metadata.taskNames, metadata.count || 0)
      };
    case TaskAction.BULK_DELETED:
      return {
        title: 'Deleted tasks',
        details: formatTaskList(metadata.taskNames, metadata.count || 0)
      };
    case TaskAction.DELETED:
      return {
        title: 'Deleted task',
        details: taskName
      };
    default:
      return {
        title: activity.action.toLowerCase().replace('_', ' '),
        details: taskName
      };
  }
}

export function ActivityTab({ projectId }: ActivityTabProps) {
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterAction, setFilterAction] = useState<TaskAction | 'ALL'>('ALL');
  const [filterUserId, setFilterUserId] = useState<string>('ALL');
  const [members, setMembers] = useState<any[]>([]);
  const limit = 20;

  // Fetch project members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = await projectApi.getMembers(projectId);
        setMembers(data || []);
      } catch (error) {
        console.error('Failed to fetch members:', error);
      }
    };

    if (projectId) {
      fetchMembers();
    }
  }, [projectId]);

  const loadActivities = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const response = await taskActivityApi.getProjectActivities(projectId, {
        page,
        limit,
        action: filterAction === 'ALL' ? undefined : filterAction,
        userId: filterUserId === 'ALL' ? undefined : filterUserId,
      });
      setActivities(response.data);
      setTotalPages(response.meta.totalPages);
    } catch (error) {
      console.error('Failed to load activities:', error);
      toast.error('Failed to load activity history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [projectId, page, filterAction, filterUserId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activity History
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* Action Filter */}
              <Select value={filterAction} onValueChange={(value) => {
                setFilterAction(value as TaskAction | 'ALL');
                setPage(1);
              }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Actions</SelectItem>
                  <SelectItem value={TaskAction.CREATED}>Created</SelectItem>
                  <SelectItem value={TaskAction.ASSIGNED}>Assigned (includes bulk)</SelectItem>
                  <SelectItem value={TaskAction.UNASSIGNED}>Unassigned (includes bulk)</SelectItem>
                  <SelectItem value={TaskAction.DELETED}>Deleted (includes bulk)</SelectItem>
                  <SelectItem value={TaskAction.SUBMITTED}>Submitted</SelectItem>
                  <SelectItem value={TaskAction.APPROVED}>Approved</SelectItem>
                  <SelectItem value={TaskAction.REJECTED}>Rejected</SelectItem>
                </SelectContent>
              </Select>

              {/* Member Filter */}
              <Select value={filterUserId} onValueChange={(value) => {
                setFilterUserId(value);
                setPage(1);
              }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Members</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.user.fullName || member.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Activity Timeline */}
      <div className="space-y-3">
        {activities.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No activities found</p>
            </CardContent>
          </Card>
        ) : (
          activities.map((activity, index) => {
            const Icon = actionIcons[activity.action];
            const isLastItem = index === activities.length - 1;
            const { title, details } = getActivityMessage(activity);

            return (
              <div key={activity.id} className="relative flex gap-4 items-start mb-3">
                {/* Icon */}
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${actionColors[activity.action]} shadow-sm flex-shrink-0`}>
                  <Icon className="h-5 w-5" />
                </div>

                {/* Card content */}
                <Card className="flex-1 hover:shadow-md transition-shadow bg-white">
                  <CardContent className="p-4">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs font-semibold">
                                {actionLabels[activity.action]}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mb-1">
                              {title}
                            </p>
                            <p className="text-xs text-gray-600">
                              {details}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <User className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-600">
                                {activity.user.fullName || activity.user.email.split('@')[0]}
                              </span>
                            </div>
                          </div>

                          {/* User Avatar */}
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={activity.user.avatarUrl || undefined} />
                            <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                              {activity.user.fullName?.charAt(0) || activity.user.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Metadata details */}
                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <div className="mt-3 p-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg text-xs">
                            {activity.metadata.deadline && (
                              <div className="flex items-center gap-1.5 text-gray-700">
                                <CalendarClock className="h-3.5 w-3.5 text-blue-600" />
                                <span className="font-medium">Deadline:</span>
                                <span>{format(new Date(activity.metadata.deadline), 'MMM dd, yyyy HH:mm')}</span>
                              </div>
                            )}
                            {activity.metadata.reason && (
                              <div className="mt-1.5 text-gray-700">
                                <span className="font-semibold">Reason:</span> {activity.metadata.reason}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
