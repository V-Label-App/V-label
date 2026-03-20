import React, { useMemo } from "react";
import type { Project } from "../../../types/project.types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../../../components/ui/card";
import { Progress } from "../../../components/ui/progress";
import {
  Activity,
  Users,
  Target,
  TrendingUp,
  CheckCircle,
  Zap,
} from "lucide-react";

interface ProjectAnalyticsProps {
  tasks: any[];
  project: Project;
  workloads: Record<string, any>;
}

export const ProjectAnalytics: React.FC<ProjectAnalyticsProps> = ({
  tasks,
  project,
  workloads,
}) => {
  // 1. Status Distribution Data
  const statusData = useMemo(() => {
    const counts = tasks.reduce((acc: Record<string, number>, task) => {
      const status = task.status as string;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return [
      { name: "To Do", value: counts["TODO"] || 0, color: "#94a3b8" },
      {
        name: "In Progress",
        value: counts["IN_PROGRESS"] || 0,
        color: "#3b82f6",
      },
      { name: "Done", value: counts["DONE"] || 0, color: "#10b981" },
    ].filter((d) => d.value > 0);
  }, [tasks]);

  // 2. Annotator Performance Data
  const annotatorData = useMemo(() => {
    const stats: Record<
      string,
      {
        name: string;
        completed: number;
        pending: number;
        rejected: number;
        avgRejection: number;
        totalRejections: number;
      }
    > = {};

    tasks.forEach((task) => {
      task.assignments?.forEach(
        (assignment: {
          annotatorId?: string;
          status: string;
          rejectionCount?: number;
        }) => {
          if (!assignment.annotatorId) return;

          const userId = assignment.annotatorId;
          if (!stats[userId]) {
            const workload = workloads[userId];
            stats[userId] = {
              name:
                workload?.user?.fullName || workload?.user?.email || "Unknown",
              completed: 0,
              pending: 0,
              rejected: 0,
              avgRejection: 0,
              totalRejections: 0,
            };
          }

          if (
            assignment.status === "APPROVED" ||
            assignment.status === "DONE"
          ) {
            stats[userId].completed++;
          } else if (assignment.status === "REJECTED") {
            stats[userId].rejected++;
          } else if (
            ["ASSIGNED", "IN_PROGRESS", "SUBMITTED"].includes(assignment.status)
          ) {
            stats[userId].pending++;
          }

          stats[userId].totalRejections += assignment.rejectionCount || 0;
        },
      );
    });

    return Object.values(stats)
      .map((s) => ({
        ...s,
        avgRejection:
          s.completed > 0
            ? Number((s.totalRejections / s.completed).toFixed(2))
            : s.totalRejections,
      }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 10);
  }, [tasks, workloads]);

  // 3. Timeline Data (Tasks approved per day)
  const timelineData = useMemo(() => {
    const dailyCounts: Record<string, number> = {};
    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      return d.toISOString().split("T")[0];
    });

    last14Days.forEach((date) => (dailyCounts[date] = 0));

    tasks.forEach((task) => {
      const approvedAssignment = task.assignments?.find(
        (a: any) => a.status === "APPROVED",
      );
      if (approvedAssignment?.updatedAt) {
        const date = new Date(approvedAssignment.updatedAt)
          .toISOString()
          .split("T")[0];
        if (dailyCounts[date] !== undefined) {
          dailyCounts[date]++;
        }
      }
    });

    return Object.entries(dailyCounts).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      count,
    }));
  }, [tasks]);

  // Overall Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "DONE").length;
  const completionProgress =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  const pendingReviewTasks = tasks.filter(
    (t) =>
      t.status !== "DONE" &&
      t.assignments?.some((a: any) => a.status === "SUBMITTED"),
  ).length;

  return (
    <div className="space-y-8 p-1 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* Stats Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <Target className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-100 font-medium uppercase text-[10px] tracking-wider flex items-center gap-1">
              Total Tasks
              <span
                className="w-4 h-4 rounded-full bg-blue-400/30 flex items-center justify-center text-[10px] cursor-help"
                title="Total images/tasks in this project"
              >
                ?
              </span>
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{totalTasks}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-blue-100 text-xs gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>Full data volume</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500 font-medium uppercase text-[10px] tracking-wider flex items-center gap-1">
              Approved Tasks
              <span
                className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] cursor-help"
                title="Successfully labeled and reviewed tasks"
              >
                ?
              </span>
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-slate-900">
              {completedTasks}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-emerald-600 text-xs font-bold gap-1 mt-1">
              <CheckCircle className="w-3 h-3" />
              <span>{Math.round(completionProgress)}% Progress</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border-l-4 border-l-blue-400">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500 font-medium uppercase text-[10px] tracking-wider flex items-center gap-1">
              Overall Progress
              <span
                className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] cursor-help"
                title="Average completion progress for this project"
              >
                ?
              </span>
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-slate-900">
              {Math.round(completionProgress)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <Progress value={completionProgress} className="h-2 bg-slate-100" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500 font-medium uppercase text-[10px] tracking-wider flex items-center gap-1">
              Needs Review
              <span
                className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] cursor-help"
                title="Tasks submitted by annotators waiting for your approval"
              >
                ?
              </span>
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-amber-600">
              {pendingReviewTasks}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-amber-600 text-xs font-bold gap-1 mt-1">
              <Zap className="w-3 h-3" />
              <span>Pending your action</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Productivity Chart */}
        <Card className="lg:col-span-2 shadow-md border-slate-100 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between bg-white z-10">
            <div>
              <CardTitle className="text-lg font-bold">
                {project?.name || "Task"} Completed
              </CardTitle>
              <CardDescription>
                Daily completed tasks over last 14 days
              </CardDescription>
            </div>
            <div className="bg-slate-50 px-3 py-1 rounded-full text-xs font-bold text-slate-500 border border-slate-100 flex items-center gap-2">
              <Activity className="w-3 h-3 text-blue-500" />
              Velocity
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    name="Tasks Completed"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="shadow-md border-slate-100 flex flex-col">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-bold">Distribution</CardTitle>
            <CardDescription>Pipeline share of project</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-4 w-full px-4">
              {statusData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs font-medium text-slate-500">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Productivity Table Style */}
      <Card className="shadow-md border-slate-100">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">
              Team Productivity & Quality
            </CardTitle>
            <CardDescription>
              Detailed contribution metrics per member
            </CardDescription>
          </div>
          <Users className="w-4 h-4 text-slate-400" />
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={annotatorData}
              layout="vertical"
              margin={{ left: 20, right: 30 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="#f1f5f9"
              />
              <XAxis
                type="number"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={100}
                tick={{ fill: "#64748b" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                }}
                cursor={{ fill: "#f8fafc" }}
              />
              <Legend />
              <Bar
                name="Completed"
                dataKey="completed"
                fill="#10b981"
                radius={[0, 4, 4, 0]}
                barSize={16}
              />
              <Bar
                name="Pending"
                dataKey="pending"
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
                barSize={16}
              />
              <Bar
                name="Avg Rejections"
                dataKey="avgRejection"
                fill="#f59e0b"
                radius={[0, 4, 4, 0]}
                barSize={10}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
