import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { LogOut, Clock, Star, Sparkles, Tag } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface QueueTask {
  id: string;
  thumbnail: string;
  title: string;
  annotator: {
    name: string;
    initials: string;
  };
  submittedAt: string;
  isAiGenerated: boolean;
  priority: 'high' | 'normal';
  projectId: string;
  projectName: string;
  labelIds: string[];
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface ReviewerQueueProps {
  onLogout: () => void;
  onOpenWorkspace: (taskId: string, mode: 'review') => void;
}

export function ReviewerQueue({ onLogout, onOpenWorkspace }: ReviewerQueueProps) {
  const [queueTasks] = useState<QueueTask[]>([
    {
      id: 'T-003',
      thumbnail: '🖼️',
      title: 'Medical Scan - Lung CT',
      annotator: { name: 'Lisa Chen', initials: 'LC' },
      submittedAt: '2026-01-14T10:30:00',
      isAiGenerated: false,
      priority: 'high',
      projectId: 'P-001',
      projectName: 'Lung Cancer Study',
      labelIds: ['L-001', 'L-002'],
    },
    {
      id: 'T-015',
      thumbnail: '🖼️',
      title: 'Medical Scan - Cardiac MRI',
      annotator: { name: 'Nguyen Van A', initials: 'NV' },
      submittedAt: '2026-01-14T09:15:00',
      isAiGenerated: true,
      priority: 'normal',
      projectId: 'P-002',
      projectName: 'Heart Disease Research',
      labelIds: ['L-003'],
    },
    {
      id: 'T-021',
      thumbnail: '🖼️',
      title: 'Medical Scan - Brain CT',
      annotator: { name: 'David Kim', initials: 'DK' },
      submittedAt: '2026-01-14T08:45:00',
      isAiGenerated: false,
      priority: 'normal',
      projectId: 'P-003',
      projectName: 'Neurological Disorders',
      labelIds: ['L-004'],
    },
    {
      id: 'T-018',
      thumbnail: '🖼️',
      title: 'Medical Scan - Abdominal Ultrasound',
      annotator: { name: 'Lisa Chen', initials: 'LC' },
      submittedAt: '2026-01-14T07:20:00',
      isAiGenerated: true,
      priority: 'high',
      projectId: 'P-004',
      projectName: 'Gastrointestinal Conditions',
      labelIds: ['L-005'],
    },
    {
      id: 'T-012',
      thumbnail: '🖼️',
      title: 'Medical Scan - Chest X-Ray',
      annotator: { name: 'Nguyen Van A', initials: 'NV' },
      submittedAt: '2026-01-13T16:30:00',
      isAiGenerated: false,
      priority: 'normal',
      projectId: 'P-005',
      projectName: 'Respiratory Health',
      labelIds: ['L-006'],
    },
  ]);

  const [labels] = useState<Label[]>([
    { id: 'L-001', name: 'Tumor', color: 'red' },
    { id: 'L-002', name: 'Nodule', color: 'orange' },
    { id: 'L-003', name: 'Heart Valve', color: 'blue' },
    { id: 'L-004', name: 'Brain Lesion', color: 'purple' },
    { id: 'L-005', name: 'Liver Mass', color: 'green' },
    { id: 'L-006', name: 'Pleural Effusion', color: 'pink' },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold">VLabel</h1>
                <p className="text-xs text-muted-foreground">Quality Assurance Dashboard</p>
              </div>
            </div>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending Review</p>
                <h3 className="text-3xl font-semibold">{queueTasks.length}</h3>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Reviewed Today</p>
                <h3 className="text-3xl font-semibold">12</h3>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Approval Rate</p>
                <h3 className="text-3xl font-semibold">87%</h3>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <div className="text-purple-600">✓</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg. Review Time</p>
                <h3 className="text-3xl font-semibold">4.2m</h3>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Review Queue */}
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-1">Review Queue</h2>
            <p className="text-sm text-muted-foreground">Tasks awaiting quality assurance review</p>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[80px]">Preview</TableHead>
                  <TableHead>Task ID / Title</TableHead>
                  <TableHead>Annotator</TableHead>
                  <TableHead>Time Submitted</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueTasks.map((task) => (
                  <TableRow key={task.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center text-2xl">
                        {task.thumbnail}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium mb-1">{task.id}</p>
                        <p className="text-sm text-muted-foreground">{task.title}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                            {task.annotator.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{task.annotator.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs text-muted-foreground">
                              {task.annotator.name.includes('Nguyen') ? '98%' : 
                               task.annotator.name.includes('Lisa') ? '92%' : '85%'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">
                          {formatDistanceToNow(parseISO(task.submittedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        {task.isAiGenerated && (
                          <Badge variant="outline" className="w-fit bg-purple-50 text-purple-700 border-purple-300">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                        {task.priority === 'high' && (
                          <Badge variant="outline" className="w-fit bg-red-50 text-red-700 border-red-300">
                            High Priority
                          </Badge>
                        )}
                        {task.labelIds.map((labelId) => {
                          const label = labels.find((l) => l.id === labelId);
                          if (label) {
                            return (
                              <Badge
                                key={labelId}
                                variant="outline"
                                className={`w-fit bg-${label.color}-50 text-${label.color}-700 border-${label.color}-300`}
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                {label.name}
                              </Badge>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => onOpenWorkspace(task.id, 'review')}
                      >
                        Review Now
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}