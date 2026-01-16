import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import {
  Play, AlertTriangle, Calendar, LogOut, Star, CheckCircle2,
  Clock, Target, Trophy, Tag
} from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

interface Task {
  id: string;
  thumbnail: string;
  title: string;
  status: 'assigned' | 'submitted' | 'rejected';
  deadline: string;
  rejectionReason?: string;
  annotatorNote?: string;
  projectId: string;
  projectName: string;
  labelIds: string[];
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface AnnotatorTasksProps {
  onLogout: () => void;
  onOpenWorkspace: (taskId: string, mode: 'annotate') => void;
}

export function AnnotatorTasks({ onLogout, onOpenWorkspace }: AnnotatorTasksProps) {
  // Mock labels data
  const [labels] = useState<Label[]>([
    { id: 'L-001', name: 'Tumor', color: '#EF4444' },
    { id: 'L-002', name: 'Fracture', color: '#F59E0B' },
    { id: 'L-003', name: 'Brain Lesion', color: '#8B5CF6' },
    { id: 'L-004', name: 'Hemorrhage', color: '#EC4899' },
  ]);

  const [tasks] = useState<Task[]>([
    {
      id: 'T-002',
      thumbnail: '🖼️',
      title: 'Medical Scan - Chest X-Ray',
      status: 'assigned',
      deadline: '2026-01-15',
      projectId: 'PRJ-001',
      projectName: 'Medical Imaging Classification',
      labelIds: ['L-001', 'L-002'],
    },
    {
      id: 'T-007',
      thumbnail: '🖼️',
      title: 'Medical Scan - Brain MRI',
      status: 'assigned',
      deadline: '2026-01-16',
      projectId: 'PRJ-002',
      projectName: 'Neurology Diagnosis',
      labelIds: ['L-003', 'L-004'],
    },
    {
      id: 'T-003',
      thumbnail: '🖼️',
      title: 'Medical Scan - Lung CT',
      status: 'submitted',
      deadline: '2026-01-14',
      projectId: 'PRJ-001',
      projectName: 'Medical Imaging Classification',
      labelIds: ['L-001', 'L-002'],
    },
    {
      id: 'T-008',
      thumbnail: '🖼️',
      title: 'Medical Scan - Cardiac Echo',
      status: 'rejected',
      deadline: '2026-01-12',
      rejectionReason: 'Bounding box boundaries are not precise. The annotation extends beyond the actual region of interest. Please ensure all edges align with the target structure.',
      annotatorNote: 'Initial attempt - need refinement',
      projectId: 'PRJ-001',
      projectName: 'Medical Imaging Classification',
      labelIds: ['L-001', 'L-002'],
    },
    {
      id: 'T-009',
      thumbnail: '🖼️',
      title: 'Medical Scan - Spine X-Ray',
      status: 'rejected',
      deadline: '2026-01-10',
      rejectionReason: 'Missing labels for secondary findings. Please annotate all visible abnormalities.',
      annotatorNote: 'Focused on primary finding only',
      projectId: 'PRJ-001',
      projectName: 'Medical Imaging Classification',
      labelIds: ['L-001', 'L-002'],
    },
  ]);

  const userReputation = 98;

  const getStatusBadge = (status: string) => {
    const styles = {
      assigned: { className: 'bg-gray-100 text-gray-700 border-gray-300', label: 'Assigned' },
      submitted: { className: 'bg-blue-100 text-blue-700 border-blue-300', label: 'Submitted' },
      rejected: { className: 'bg-red-100 text-red-700 border-red-300', label: 'REJECTED' },
    };
    return styles[status as keyof typeof styles];
  };

  const isDeadlineClose = (deadline: string) => {
    const deadlineDate = parseISO(deadline);
    const today = new Date('2026-01-14');
    const daysUntil = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 2 && daysUntil >= 0;
  };

  const isDeadlinePassed = (deadline: string) => {
    return isPast(parseISO(deadline));
  };

  const assignedTasks = tasks.filter(t => t.status === 'assigned');
  const submittedTasks = tasks.filter(t => t.status === 'submitted');
  const rejectedTasks = tasks.filter(t => t.status === 'rejected');

  const TaskCard = ({ task, index }: { task: Task; index?: number }) => {
    const statusBadge = getStatusBadge(task.status);
    const urgentDeadline = isDeadlineClose(task.deadline);
    const overdueDeadline = isDeadlinePassed(task.deadline);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: (index || 0) * 0.1 }}
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      >
        <Card className="p-5 hover:shadow-lg transition-shadow">
          <div className="flex gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
              {task.thumbnail}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{task.title}</h3>
                    <Badge variant="outline" className={statusBadge.className}>
                      {statusBadge.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Task ID: {task.id}</p>
                  <p className="text-sm text-muted-foreground">Project: {task.projectName}</p>

                  {/* Project Labels */}
                  {task.labelIds && task.labelIds.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <Tag className="w-3 h-3 text-muted-foreground" />
                      <div className="flex flex-wrap gap-1">
                        {task.labelIds.map(labelId => {
                          const label = labels.find(l => l.id === labelId);
                          if (!label) return null;
                          return (
                            <Badge
                              key={labelId}
                              className="text-xs"
                              style={{ backgroundColor: label.color, color: 'white', borderColor: label.color }}
                            >
                              {label.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm mb-3">
                <div className={`flex items-center gap-1 ${overdueDeadline ? 'text-red-600 font-medium' :
                  urgentDeadline ? 'text-orange-600 font-medium' :
                    'text-muted-foreground'
                  }`}>
                  <Calendar className="w-4 h-4" />
                  <span>Due: {format(parseISO(task.deadline), 'MMM dd, yyyy')}</span>
                  {urgentDeadline && !overdueDeadline && (
                    <AlertTriangle className="w-4 h-4 ml-1 text-orange-500" />
                  )}
                  {overdueDeadline && (
                    <AlertTriangle className="w-4 h-4 ml-1 text-red-500" />
                  )}
                </div>
              </div>

              {task.status === 'rejected' && task.rejectionReason && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-medium text-red-800 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Rejection Reason:
                  </p>
                  <p className="text-sm text-red-700">{task.rejectionReason}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => onOpenWorkspace(task.id, 'annotate')}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {task.status === 'rejected' ? 'Fix & Resubmit' : task.status === 'assigned' ? 'Start Labeling' : 'View Submission'}
                </Button>
                {task.status === 'rejected' && (
                  <Button variant="outline">View Details</Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50"
    >
      {/* Header with Profile */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-white border-b border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">V</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold">VLabel</h1>
                <p className="text-sm text-muted-foreground">Annotator Workspace</p>
              </div>
            </div>
            <Button variant="outline" onClick={onLogout} className="gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>

          {/* Profile Section */}
          <div className="flex items-start gap-6">
            {/* Avatar and Info */}
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20 border-4 border-blue-100">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-2xl font-bold">
                  JS
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold mb-1">John Smith</h2>
                <p className="text-sm text-muted-foreground mb-2">Senior Annotator • Medical Imaging</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-semibold text-yellow-700">{userReputation}%</span>
                    <span className="text-xs text-muted-foreground ml-1">Reputation</span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                    <Trophy className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">Top 5%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="flex-1 grid grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <span className="text-xs font-medium text-blue-600">ACTIVE</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">{assignedTasks.length}</div>
                  <div className="text-xs text-blue-700 mt-1">Assigned</div>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span className="text-xs font-medium text-purple-600">PENDING</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900">{submittedTasks.length}</div>
                  <div className="text-xs text-purple-700 mt-1">Submitted</div>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-xs font-medium text-red-600">URGENT</span>
                  </div>
                  <div className="text-2xl font-bold text-red-900">{rejectedTasks.length}</div>
                  <div className="text-xs text-red-700 mt-1">Rejected</div>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-xs font-medium text-green-600">THIS MONTH</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900">127</div>
                  <div className="text-xs text-green-700 mt-1">Completed</div>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-6"
        >
          <h2 className="text-2xl font-semibold mb-2">My Tasks</h2>
          <p className="text-muted-foreground">Manage your assigned labeling tasks and submissions</p>
        </motion.div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">
              All Tasks ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="assigned">
              Assigned ({assignedTasks.length})
            </TabsTrigger>
            <TabsTrigger value="submitted">
              Submitted ({submittedTasks.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="data-[state=active]:text-red-600">
              Rejected ({rejectedTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {rejectedTasks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Action Required: {rejectedTasks.length} Rejected Task{rejectedTasks.length !== 1 ? 's' : ''}</p>
                    <p className="text-sm text-red-700 mt-1">Please review and fix the rejected tasks to maintain your reputation score.</p>
                  </div>
                </div>
              </motion.div>
            )}
            {tasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} />)}
          </TabsContent>

          <TabsContent value="assigned" className="space-y-4">
            {assignedTasks.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No assigned tasks at the moment</p>
              </Card>
            ) : (
              assignedTasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} />)
            )}
          </TabsContent>

          <TabsContent value="submitted" className="space-y-4">
            {submittedTasks.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No submitted tasks</p>
              </Card>
            ) : (
              submittedTasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} />)
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedTasks.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No rejected tasks</p>
              </Card>
            ) : (
              rejectedTasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}