import { useState, useEffect, useCallback } from "react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { Clock, RefreshCw, Inbox, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { reviewerApi } from "../../../services/reviewer.api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../../components/ui/utils";



interface ReviewerQueueProps {
  onOpenWorkspace: (taskId: string, mode: "review") => void;
}

export function ReviewerQueue({ onOpenWorkspace }: ReviewerQueueProps) {
  const [queueTasks, setQueueTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchQueue = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const result = await reviewerApi.getReviewQueue({
        page: 1,
        limit: 50,
      });
      setQueueTasks(result.data);
      setStats(result.meta?.reviewCounts);
      
      if (silent) {
        toast.success("Queue updated successfully");
      }
    } catch (error) {
      console.error("Failed to fetch review queue:", error);
      toast.error("Failed to load review queue");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-muted-foreground animate-pulse">Fetching your review queue...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1 text-gray-900">Review Pipeline</h1>
            <p className="text-muted-foreground">Manage and verify annotation quality across your projects</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 bg-white hover:bg-gray-50 transition-all duration-200"
            onClick={() => fetchQueue(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing..." : "Refresh Queue"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-6 border-none shadow-sm bg-blue-50/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 mb-1 tracking-wide">PENDING REVIEW</p>
                  <h3 className="text-3xl font-bold text-blue-900">{stats?.pending || 0}</h3>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shadow-inner">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-6 border-none shadow-sm bg-emerald-50/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600 mb-1 tracking-wide">REVIEWED TODAY</p>
                  <h3 className="text-3xl font-bold text-emerald-900">{stats?.approved || 0}</h3>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-6 border-none shadow-sm bg-purple-50/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 mb-1 tracking-wide">REJECT RATE</p>
                  <h3 className="text-3xl font-bold text-purple-900">
                    {stats?.total > 0 ? ((stats?.rejected / stats?.total) * 100).toFixed(1) : "0"}%
                  </h3>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shadow-inner">
                  <XCircle className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="p-6 border-none shadow-sm bg-orange-50/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 mb-1 tracking-wide">TOTAL COMPLETED</p>
                  <h3 className="text-3xl font-bold text-orange-900">{stats?.total || 0}</h3>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Review Queue */}
        <Card className="border-none shadow-sm overflow-hidden bg-white">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Active Queue</h2>
              <p className="text-sm text-muted-foreground">High priority tasks assigned for your review</p>
            </div>
            {queueTasks.length > 0 && (
              <Badge variant="secondary" className="px-3 py-1 bg-gray-100 text-gray-700">
                {queueTasks.length} tasks needing action
              </Badge>
            )}
          </div>

          <div className="overflow-x-auto">
            {queueTasks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-transparent">
                    <TableHead className="w-[80px] font-bold">Image</TableHead>
                    <TableHead className="font-bold">Content Info</TableHead>
                    <TableHead className="font-bold">Annotator</TableHead>
                    <TableHead className="font-bold">Submitted</TableHead>
                    <TableHead className="font-bold">Context</TableHead>
                    <TableHead className="text-right font-bold">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {queueTasks.map((assignment, index) => (
                      <motion.tr 
                        key={assignment.id} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="group hover:bg-gray-50/80 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <TableCell>
                          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden border border-gray-200 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                            {assignment.task.image ? (
                              <img
                                src={assignment.task.image.storageUrl}
                                alt={assignment.task.image.originalFilename}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              "🖼️"
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="font-bold text-gray-900 truncate">
                              {assignment.task.image?.originalFilename || `Task ${assignment.id.slice(0, 8)}`}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              ID: {assignment.id.slice(0, 8)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9 border-2 border-white shadow-sm ring-1 ring-gray-100">
                              <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                                {assignment.annotator.fullName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="overflow-hidden">
                              <p className="font-semibold text-sm text-gray-900 truncate">{assignment.annotator.fullName}</p>
                              <div className="flex items-center gap-1.5">

                                <p className="text-[10px] text-muted-foreground truncate italic">
                                  {assignment.annotator.email}
                                </p>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="text-xs font-semibold">
                                {formatDistanceToNow(parseISO(assignment.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground pl-5 uppercase tracking-tighter">
                              TIMESTAMP: {new Date(assignment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {assignment.task.project && (
                              <Badge
                                variant="outline"
                                className="bg-white text-gray-700 border-gray-200 shadow-sm font-medium"
                              >
                                {assignment.task.project.name}
                              </Badge>
                            )}
                            {assignment.rejectionCount > 0 && (
                              <Badge
                                variant="destructive"
                                className="animate-pulse shadow-sm"
                              >
                                REJECTED {assignment.rejectionCount}X
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            className="bg-gray-900 hover:bg-black text-white px-6 shadow-sm hover:shadow-md transition-all group-hover:px-8"
                            onClick={() => onOpenWorkspace(assignment.id, "review")}
                          >
                            Review Now
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center p-24 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                  <Inbox className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Queue and Inbox Clear</h3>
                <p className="text-muted-foreground max-w-sm">
                  There are no tasks currently awaiting your review. New submissions from annotators will appear here automatically.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-6 gap-2"
                  onClick={() => fetchQueue()}
                >
                  <RefreshCw className="w-4 h-4" />
                  Check for Updates
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
