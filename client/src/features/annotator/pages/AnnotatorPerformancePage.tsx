import { useState, useEffect } from "react";
import { Card } from "../../../components/ui/card";
import { Loader2, TrendingUp, Award, CheckCircle2, XCircle } from "lucide-react";
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
} from "recharts";
import { performanceApi } from "../../../services/performance.api";
import type { WeeklyActivity, TaskDistribution } from "../../../services/performance.api";

export function AnnotatorPerformancePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([]);
  const [taskDistribution, setTaskDistribution] = useState<TaskDistribution[]>([]);
  const [, setTodayProgress] = useState<unknown[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [weekly, distribution, today] = await Promise.all([
          performanceApi.getWeeklyActivity(),
          performanceApi.getTaskDistribution(),
          performanceApi.getTodayProgress(),
        ]);
        setWeeklyActivity(weekly);
        setTaskDistribution(distribution);
        setTodayProgress(today);
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
  const totalTasks = taskDistribution.reduce((sum, item) => sum + item.value, 0);
  const submittedTasks = taskDistribution.find((item) => item.name === "Submitted")?.value || 0;
  const rejectedTasks = taskDistribution.find((item) => item.name === "Rejected")?.value || 0;
  const accuracyRate = totalTasks > 0 ? ((submittedTasks / totalTasks) * 100).toFixed(1) : "0";

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
          <h2 className="text-3xl font-semibold mb-2">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Track your annotation performance and productivity
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{totalTasks}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-2xl font-bold">{submittedTasks}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
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

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Accuracy Rate</p>
                <p className="text-2xl font-bold">{accuracyRate}%</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Weekly Activity Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Weekly Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  allowDecimals={false}
                  domain={[0, 'auto']}
                  tickFormatter={(value) => String(Math.floor(value))}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#10B981" name="Completed" />
                <Bar dataKey="rejected" fill="#EF4444" name="Rejected" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Task Distribution Pie Chart */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Task Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taskDistribution as any}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => {
                    const percent = entry.percent || 0;
                    return `${entry.name}: ${(percent * 100).toFixed(0)}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </div>
  );
}
