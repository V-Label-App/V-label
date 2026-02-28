import { useState, useEffect } from 'react';
import { taskActivityApi, TaskAction, type TaskActivity } from '../../../services/task-activity.api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { ScrollArea } from '../../../components/ui/scroll-area';
import {
  Activity, UserPlus, UserMinus, Trash2, CheckCircle, XCircle,
  CalendarClock, ArrowRightLeft, FileText, Users, ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ActivityFeedProps {
  projectId: string;
  limit?: number;
  onViewAllActivity?: () => void;
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
  [TaskAction.CREATED]: 'text-blue-600 bg-blue-50',
  [TaskAction.ASSIGNED]: 'text-green-600 bg-green-50',
  [TaskAction.UNASSIGNED]: 'text-orange-600 bg-orange-50',
  [TaskAction.REASSIGNED]: 'text-purple-600 bg-purple-50',
  [TaskAction.DEADLINE_UPDATED]: 'text-yellow-600 bg-yellow-50',
  [TaskAction.STATUS_CHANGED]: 'text-indigo-600 bg-indigo-50',
  [TaskAction.SUBMITTED]: 'text-cyan-600 bg-cyan-50',
  [TaskAction.APPROVED]: 'text-emerald-600 bg-emerald-50',
  [TaskAction.REJECTED]: 'text-red-600 bg-red-50',
  [TaskAction.DELETED]: 'text-gray-600 bg-gray-50',
  [TaskAction.RESTORED]: 'text-teal-600 bg-teal-50',
  [TaskAction.BULK_ASSIGNED]: 'text-green-600 bg-green-50',
  [TaskAction.BULK_UNASSIGNED]: 'text-orange-600 bg-orange-50',
  [TaskAction.BULK_DELETED]: 'text-gray-600 bg-gray-50',
};

const actionBorderColors: Record<TaskAction, string> = {
  [TaskAction.CREATED]: 'border-l-blue-500',
  [TaskAction.ASSIGNED]: 'border-l-green-500',
  [TaskAction.UNASSIGNED]: 'border-l-orange-500',
  [TaskAction.REASSIGNED]: 'border-l-purple-500',
  [TaskAction.DEADLINE_UPDATED]: 'border-l-yellow-500',
  [TaskAction.STATUS_CHANGED]: 'border-l-indigo-500',
  [TaskAction.SUBMITTED]: 'border-l-cyan-500',
  [TaskAction.APPROVED]: 'border-l-emerald-500',
  [TaskAction.REJECTED]: 'border-l-red-500',
  [TaskAction.DELETED]: 'border-l-gray-500',
  [TaskAction.RESTORED]: 'border-l-teal-500',
  [TaskAction.BULK_ASSIGNED]: 'border-l-green-500',
  [TaskAction.BULK_UNASSIGNED]: 'border-l-orange-500',
  [TaskAction.BULK_DELETED]: 'border-l-gray-500',
};

function getActivityMessage(activity: TaskActivity): { title: string; description: string } {
  const userName = activity.user.fullName || activity.user.email.split('@')[0];
  const taskName = activity.task?.image?.originalFilename || `Task #${activity.taskId.substring(0, 6)}`;
  const metadata = activity.metadata || {};

  switch (activity.action) {
    case TaskAction.ASSIGNED:
      return {
        title: `${userName} assigned a task`,
        description: `${taskName} → ${metadata.targetUserName || 'Annotator'}`
      };
    case TaskAction.UNASSIGNED:
      return {
        title: `${userName} unassigned a task`,
        description: `${taskName} from ${metadata.targetUserName || 'Annotator'}`
      };
    case TaskAction.REASSIGNED:
      return {
        title: `${userName} reassigned a task`,
        description: `${taskName}: ${metadata.oldAssignee} → ${metadata.newAssignee}`
      };
    case TaskAction.SUBMITTED:
      return {
        title: `${userName} submitted a task`,
        description: taskName
      };
    case TaskAction.APPROVED:
      return {
        title: `${userName} approved a task`,
        description: taskName
      };
    case TaskAction.REJECTED:
      return {
        title: `${userName} rejected a task`,
        description: taskName
      };
    case TaskAction.BULK_ASSIGNED:
      return {
        title: `${userName} assigned tasks to ${metadata.targetUserName || 'annotator'}`,
        description: metadata.taskNames?.join(', ') || `${metadata.count || 0} tasks`
      };
    case TaskAction.BULK_UNASSIGNED:
      return {
        title: `${userName} unassigned from ${metadata.targetUserName || 'annotator'}`,
        description: metadata.taskNames?.join(', ') || `${metadata.count || 0} tasks`
      };
    case TaskAction.BULK_DELETED:
      return {
        title: `${userName} deleted tasks`,
        description: metadata.taskNames?.join(', ') || `${metadata.count || 0} tasks`
      };
    case TaskAction.DELETED:
      return {
        title: `${userName} deleted a task`,
        description: taskName
      };
    default:
      return {
        title: `${userName} performed an action`,
        description: taskName
      };
  }
}

export function ActivityFeed({ projectId, limit = 10, onViewAllActivity }: ActivityFeedProps) {
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadActivities = async () => {
      if (!projectId) return;
      setIsLoading(true);
      try {
        const data = await taskActivityApi.getRecentActivities(projectId, limit);
        setActivities(data);
      } catch (error) {
        console.error('Failed to load recent activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadActivities();
  }, [projectId, limit]);

  const handleViewAll = () => {
    if (onViewAllActivity) {
      onViewAllActivity();
    } else {
      navigate(`/manager/projects/${projectId}?tab=activity`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-500">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleViewAll} className="text-xs">
            View All
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-3">
          <div className="space-y-2">
            {activities.map((activity) => {
              const Icon = actionIcons[activity.action];
              const { title, description } = getActivityMessage(activity);

              return (
                <div
                  key={activity.id}
                  className={`flex items-start gap-3 p-3 rounded-lg hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all border-l-4 ${actionBorderColors[activity.action]} bg-white shadow-sm`}
                >
                  {/* Icon */}
                  <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${actionColors[activity.action]} shadow-sm`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {title}
                        </p>
                        <p className="text-xs text-gray-600 truncate mt-0.5">
                          {description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-xs text-gray-500 font-medium">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {/* User Avatar */}
                      <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-white shadow-sm">
                        <AvatarImage src={activity.user.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {activity.user.fullName?.charAt(0).toUpperCase() || activity.user.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
