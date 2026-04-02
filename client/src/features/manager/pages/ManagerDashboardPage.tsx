import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Progress } from "../../../components/ui/progress";
import { Badge } from "../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  FolderKanban,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  Loader2,
  Briefcase,
  Activity,
  Tag,
  BarChart as BarChartIcon
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { projectApi, type ProjectHealthStats } from "../../../services/project.api";
import { labelCategoryApi } from "../../../services/label.api";
import { taskActivityApi, type TaskActivity } from "../../../services/task-activity.api";
import { useAuth } from "../../../context/AuthContext";
import { ProjectStatus, type Project } from "../../../types/project.types";
import { cn } from "../../../components/ui/utils";
import { format, subDays, isSameDay } from "date-fns";
import { toast } from "sonner";

interface DashboardData {
  projects: Project[];
  healthStats: Record<string, ProjectHealthStats>;
  recentActivities: TaskActivity[];
  activityTrends: { date: string; count: number }[];
  labelStats: { name: string; count: number; fill: string }[];
}

export function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        // 1. Fetch all projects managed by user
        const projectsResponse = await projectApi.getAll({ limit: 40 });
        const projects = projectsResponse.data || [];

        // 2. Fetch health stats for top 5 active projects
        const activeProjects = projects
          .filter(p => p.status === ProjectStatus.ACTIVE)
          .slice(0, 5);
        
        const healthStats: Record<string, any> = {};
        const healthPromises = activeProjects.map(async (p) => {
          try {
            const stats = await projectApi.getHealthStats(p.id);
            healthStats[p.id] = stats;
          } catch (err) {
            console.error(`Failed to fetch health stats for ${p.id}`, err);
          }
        });

        // 3. Fetch activities for the chart (Aggregate from active projects)
        // For simplicity in this demo, we'll fetch from the first 3 projects
        const activityPromises = activeProjects.slice(0, 3).map(p => 
          taskActivityApi.getProjectActivities(p.id, { limit: 50 })
        );

        const [activitiesResults] = await Promise.all([
          Promise.all(activityPromises),
          Promise.all(healthPromises)
        ]);

        const allActivities = activitiesResults.flatMap(r => r.data || []);
        
        // 4. Fetch Label Category Data (Portfolio Idea)
        const categories = await labelCategoryApi.getAll();
        const categoryStats = categories
          .sort((a, b) => (b._count?.labels || 0) - (a._count?.labels || 0))
          .slice(0, 6)
          .map(c => ({
            name: c.name,
            count: c._count?.labels || 0,
            fill: c.color || "#3b82f6"
          }));

        // 5. Process Activity Trends (Last 7 days)
        const trends = [];
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dayActivities = allActivities.filter(a => 
            isSameDay(new Date(a.createdAt), date)
          );
          trends.push({
            date: format(date, "MMM dd"),
            count: dayActivities.length,
          });
        }

        setData({
          projects,
          healthStats,
          recentActivities: allActivities.slice(0, 10),
          activityTrends: trends,
          labelStats: categoryStats
        });
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const activeCount = data.projects.filter(p => p.status === ProjectStatus.ACTIVE).length;
    const completedCount = data.projects.filter(p => p.status === ProjectStatus.COMPLETED).length;
    const totalImages = data.projects.reduce((acc, p) => acc + (p._count?.images || 0), 0);
    const avgProgress = data.projects.length > 0 
      ? data.projects.reduce((acc, p) => acc + (p.progress || 0), 0) / data.projects.length 
      : 0;

    return {
      activeProjects: activeCount,
      completedProjects: completedCount,
      totalImages,
      avgProgress: Math.round(avgProgress),
      projectStatusData: [
        { name: 'Active', value: activeCount, color: '#3b82f6' },
        { name: 'Completed', value: completedCount, color: '#10b981' },
        { name: 'Other', value: data.projects.length - activeCount - completedCount, color: '#94a3b8' }
      ].filter(d => d.value > 0)
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-slate-500 font-medium animate-pulse">Preparing your dashboard...</p>
      </div>
    );
  }

  if (!data || !stats) return null;

  return (
    <div className="p-8 space-y-8 w-full animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.fullName || "Manager"} 👋
          </h1>
          <p className="text-slate-500 mt-1">
            Here's what's happening with your projects today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="flex gap-2"
            onClick={() => navigate("/manager/projects")}
          >
            <Briefcase className="w-4 h-4" />
            View Projects
          </Button>
        </div>
      </div>

      {/* Stats Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <FolderKanban className="w-12 h-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-100 font-medium uppercase text-xs tracking-wider flex items-center gap-1">
              Active Projects
              <span className="w-4 h-4 rounded-full bg-blue-400/30 flex items-center justify-center text-[10px] cursor-help" title="Number of projects currently in progress">?</span>
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{stats.activeProjects}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-blue-100 text-xs gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>{stats.completedProjects} projects finished</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500 font-medium uppercase text-xs tracking-wider flex items-center gap-1">
              Total Images
              <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] cursor-help" title="Total number of images across all your projects">?</span>
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-slate-900">{stats.totalImages.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-green-600 text-xs font-bold gap-1 mt-1">
              <CheckCircle className="w-3 h-3" />
              <span>Across all libraries</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border-l-4 border-l-blue-400">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500 font-medium uppercase text-xs tracking-wider flex items-center gap-1">
              Overall Progress
              <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] cursor-help" title="Average completion progress across all projects">?</span>
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-slate-900">{stats.avgProgress}%</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <Progress value={stats.avgProgress} className="h-2 bg-slate-100" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500 font-medium uppercase text-xs tracking-wider flex items-center gap-1">
              Stuck Tasks
              <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px] cursor-help" title="Number of tasks that are stuck and require manager intervention">?</span>
            </CardDescription>
            <CardTitle className="text-3xl font-bold text-red-600">
              {Object.values(data.healthStats).reduce((acc, s) => acc + (s.stuck || 0), 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-amber-600 text-xs font-bold gap-1 mt-1">
              <AlertCircle className="w-3 h-3" />
              <span>Needs your attention</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Productivity Chart */}
        <Card className="lg:col-span-2 shadow-md border-slate-100 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between bg-white z-10">
            <div>
              <CardTitle className="text-lg">Weekly Productivity</CardTitle>
              <CardDescription>Annotation and review activity trend</CardDescription>
            </div>
            <div className="bg-slate-50 px-3 py-1 rounded-full text-xs font-bold text-slate-500 border border-slate-100 flex items-center gap-2">
              <Activity className="w-3 h-3 text-blue-500" />
              Last 7 Days
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.activityTrends}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorCount)" 
                    name="Activities"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Project Distribution */}
        <Card className="shadow-md border-slate-100 flex flex-col">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Distribution</CardTitle>
            <CardDescription>Status share of your workspace</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.projectStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.projectStatusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-slate-600">
                You are managing <span className="text-blue-600 font-bold">{data.projects.length}</span> total projects.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Project Health Table */}
        <Card className="shadow-md border-slate-100">
          <CardHeader>
            <CardTitle className="text-lg">Project Health Monitor</CardTitle>
            <CardDescription>Current issues needing priority review</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="pl-6 text-xs font-bold uppercase tracking-wider text-slate-400">Project</TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase tracking-wider text-slate-400">Status</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-400">Issues</TableHead>
                    <TableHead className="pr-6 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Action</TableHead>
                  </TableRow>
                </TableHeader>
                  <TableBody>
                    {data.projects.slice(0, 5).map((project) => {
                      const health = data.healthStats[project.id];
                      return (
                        <TableRow key={project.id} className="hover:bg-slate-50/50 group">
                          <TableCell className="pl-6 font-medium text-slate-900 max-w-[150px] truncate">
                            {project.name}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "border-none shadow-none text-[10px] uppercase font-bold px-2",
                                project.status === 'PAUSED' ? "text-slate-600 bg-slate-100" :
                                health?.status === 'HEALTHY' ? "text-green-600 bg-green-50" :
                                health?.status === 'WARNING' ? "text-amber-600 bg-amber-50" :
                                "text-red-600 bg-red-50"
                              )}
                            >
                              {project.status === 'PAUSED' ? 'PAUSED' : health?.status || 'HEALTHY'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "text-sm font-bold",
                              (health?.totalIssues || 0) > 0 ? "text-red-500" : "text-slate-400"
                            )}>
                              {health?.totalIssues || 0}
                            </span>
                          </TableCell>
                          <TableCell className="pr-6 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-[10px] font-bold uppercase tracking-tight text-blue-600 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => navigate(`/manager/projects/${project.id}`)}
                            >
                              Schedule Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
              </Table>
            </div>
            <div className="p-4 pt-2">
              <Button variant="ghost" className="w-full text-slate-400 text-xs hover:text-blue-600 group" onClick={() => navigate("/manager/projects")}>
                Managed Projects Catalog
                <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Tag className="w-5 h-5 text-blue-600" />
                Label Portfolio
              </CardTitle>
              <CardDescription className="text-xs">Label distribution across categories</CardDescription>
            </div>
            <BarChartIcon className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.labelStats} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={80} 
                    fontSize={12}
                    tick={{ fill: '#64748b' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[0, 4, 4, 0]} 
                    barSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity Section - Moved up and made balanced */}
        <Card className="shadow-md border-slate-100 h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Activities</CardTitle>
              <CardDescription>Latest team updates</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold border-slate-200">Live</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
              {data.recentActivities.length > 0 ? (
                data.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white shadow-sm font-bold text-xs",
                    activity.user.fullName?.charAt(0) === 'A' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                  )}>
                    {activity.user.fullName?.charAt(0) || activity.user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-600 leading-normal">
                      <span className="font-bold text-slate-900">{activity.user.fullName || "Someone"}</span>
                      {" "}{activity.action.toLowerCase().replace(/_/g, ' ')}{" "}
                      {activity.taskId ? (
                        <span
                          className="font-medium text-blue-600 cursor-pointer hover:underline"
                          onClick={() => navigate(`/workspace/${activity.taskId}?projectId=${activity.projectId}&isTaskId=true`)}
                        >
                          Task #{activity.taskId.substring(0, 8)}
                        </span>
                      ) : (
                        <span className="font-medium text-slate-400">a task</span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {format(new Date(activity.createdAt), "HH:mm")}
                      </span>
                      <span className="text-[11px] text-slate-300">•</span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {format(new Date(activity.createdAt), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] text-slate-400 bg-slate-50">
                    {activity.action}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">
                No recent activities found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
  );
}
