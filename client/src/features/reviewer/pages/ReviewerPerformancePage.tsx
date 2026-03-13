import { useState, useEffect } from "react";
import { Card } from "../../../components/ui/card";
import { Loader2, TrendingUp, Award, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
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
import { reviewerApi } from "../../../services/reviewer.api";
import type { WeeklyActivity, TaskDistribution, TodayProgress } from "../../../services/performance.api";

export function ReviewerPerformancePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([]);
  const [taskDistribution, setTaskDistribution] = useState<TaskDistribution[]>([]);
  const [todayProgress, setTodayProgress] = useState<TodayProgress[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch queue metadata for the donut chart
        const queueResponse = await reviewerApi.getReviewQueue({ limit: 1 });
        const { reviewCounts } = queueResponse.meta;
        
        setTaskDistribution([
          { name: "Approved", value: reviewCounts.approved, color: "#10B981" },
          { name: "Rejected", value: reviewCounts.rejected, color: "#EF4444" },
          { name: "Pending Review", value: reviewCounts.pending, color: "#3B82F6" },
        ]);

        // Fetch recent history for charts (Frontend Aggregation)
        // We fetch the most recent approved and rejected tasks to build the activity charts
        const [approvedHistory, rejectedHistory] = await Promise.all([
          reviewerApi.getReviewQueue({ status: "APPROVED", limit: 500 }),
          reviewerApi.getReviewQueue({ status: "REJECTED", limit: 500 }),
        ]);

        const allFinishedTasks = [
          ...approvedHistory.data.map(t => ({ ...t, type: 'completed' })),
          ...rejectedHistory.data.map(t => ({ ...t, type: 'rejected' }))
        ];

        // --- Aggregated Weekly Activity ---
        const today = new Date();
        const activityMap = new Map();
        for (let i = 0; i < 7; i++) {
          const d = new Date();
          d.setDate(today.getDate() - (6 - i));
          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
          activityMap.set(dayName, { name: dayName, completed: 0, rejected: 0, date: d.toDateString() });
        }

        allFinishedTasks.forEach(task => {
          if (!task.reviewedAt) return;
          const reviewDate = new Date(task.reviewedAt);
          const dayName = reviewDate.toLocaleDateString('en-US', { weekday: 'short' });
          const entry = activityMap.get(dayName);
          // Check if this task actually belongs to this specific date in the map
          if (entry && reviewDate.toDateString() === entry.date) {
            if (task.type === 'completed') entry.completed++;
            else entry.rejected++;
          }
        });
        setWeeklyActivity(Array.from(activityMap.values()));

        // --- Aggregated Today Progress ---
        const todayStr = today.toDateString();
        const todayTasks = allFinishedTasks
          .filter(t => t.reviewedAt && new Date(t.reviewedAt).toDateString() === todayStr)
          .sort((a, b) => new Date(a.reviewedAt!).getTime() - new Date(b.reviewedAt!).getTime());

        const hourlyCounts = new Map();
        todayTasks.forEach(t => {
          const hour = new Date(t.reviewedAt!).getHours();
          hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1);
        });

        const progressData = [];
        let cumulative = 0;
        for (let hour = 7; hour <= 20; hour++) {
          cumulative += hourlyCounts.get(hour) || 0;
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 || 12;
          progressData.push({
            time: `${displayHour} ${ampm}`,
            tasks: cumulative
          });
        }
        setTodayProgress(progressData);

      } catch (error) {
        console.error("Failed to fetch performance data:", error);
        toast.error("Failed to load performance data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate stats from distribution
  const totalReviewed = taskDistribution.reduce((sum, item) => sum + item.value, 0);
  const approvedTasks = taskDistribution.find((item) => item.name === "Approved")?.value || 0;
  const rejectedTasks = taskDistribution.find((item) => item.name === "Rejected")?.value || 0;
  const approvalRate = totalReviewed > 0 ? (((approvedTasks + rejectedTasks) > 0 ? (approvedTasks / (approvedTasks + rejectedTasks)) : 0) * 100).toFixed(1) : "0";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-semibold mb-2">Reviewer Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor your reviewing speed and quality metrics
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reviewed</p>
                <p className="text-2xl font-bold">{approvedTasks + rejectedTasks}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedTasks}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{rejectedTasks}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approval Rate</p>
                <p className="text-2xl font-bold">{approvalRate}%</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Weekly Activity Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Reviewing Activity (7 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  domain={[0, 'auto']}
                  tickFormatter={(value) => String(Math.floor(value))}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="completed" fill="#10B981" name="Approved" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" fill="#EF4444" name="Rejected" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

                  {/* Task Distribution Donut Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-1">Queue Distribution</h3>
            <p className="text-sm text-muted-foreground mb-4">Distribution of tasks in your workflow</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={taskDistribution.filter((d) => d.value > 0) as any[]}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  animationBegin={200}
                >
                  {taskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="grid grid-cols-3 gap-2 mt-4">
              {taskDistribution.map((item, index) => (
                <div key={`legend-${index}`} className="flex flex-col items-center p-2 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-lg font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Today's Progress Chart */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Today's Review Progress</h3>
              <p className="text-sm text-muted-foreground">Cumulative reviews completed throughout the day</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
              <Clock className="w-4 h-4" />
              Live Updates
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={todayProgress}>
              <defs>
                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area 
                type="monotone" 
                dataKey="tasks" 
                stroke="#3B82F6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorTasks)" 
                name="Reviewed Tasks"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
