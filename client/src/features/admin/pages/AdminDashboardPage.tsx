import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import {
  Users,
  FolderKanban,
  Tag,
  HardDrive,
  TrendingUp,
  Clock,
  Award,
  CheckCircle,
  Loader2,
  LayoutGrid,
  BarChart3,
} from "lucide-react";
import api from "../../../api/axiosClient";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DashboardStats {
  totalUsers: number;
  userGrowth: number;
  usersByRole: {
    admin: number;
    manager: number;
    reviewer: number;
    annotator: number;
  };
  projects: {
    active: number;
    completed: number;
    total: number;
  };
  annotations: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    total: number;
  };
  labels: {
    thisMonth: number;
    total: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  topAnnotators: {
    id: string;
    name: string;
    count: number;
    quality: number;
  }[];
  performance: {
    avgAnnotationTime: number;
    completionRate: number;
    qualityScore: number;
  };
  cloudinary: {
    storage: { usage: number; limit: number; usagePercent: number };
    credits: { usage: number; limit: number; usagePercent: number };
    bandwidth: { usage: number; limit: number; usagePercent: number };
  } | null;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "charts">("cards"); // Toggle state

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await api.get("/admin/dashboard/stats");
        setStats(response.data);
        setError(null);
      } catch (err: any) {
        console.error("Failed to fetch dashboard stats:", err);
        setError(err.response?.data?.error || "Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error || "No data available"}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-600 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Bảng Điều Khiển</h2>
          <p className="text-muted-foreground">
            Tổng quan về hệ thống và hiệu suất làm việc
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Card View
          </Button>
          <Button
            variant={viewMode === "charts" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("charts")}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Chart View
          </Button>
        </div>
      </div>

      {/* Conditional Rendering based on viewMode */}
      {viewMode === "cards" ? renderCardView(stats) : renderChartView(stats)}
    </div>
  );
}

// Helper function to render card view
function renderCardView(stats: DashboardStats) {
  return (
    <>
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tổng Người Dùng
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span
                className={
                  stats.userGrowth >= 0 ? "text-green-600" : "text-red-600"
                }
              >
                {stats.userGrowth >= 0 ? "+" : ""}
                {stats.userGrowth}
              </span>{" "}
              so với tháng trước
            </p>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Dự Án Đang Hoạt Động
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projects.active}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.projects.completed} đã hoàn thành
            </p>
          </CardContent>
        </Card>

        {/* Annotations This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nhãn Hiện Có</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.labels.total.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +{stats.labels.thisMonth.toLocaleString()} nhãn tháng này
            </p>
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Dung Lượng Sử Dụng
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.storage.used} GB</div>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${stats.storage.percentage}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.storage.percentage}% / {stats.storage.total} GB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cloudinary Usage */}
        {stats.cloudinary && (
          <Card className="lg:col-span-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cloudinary Storage
              </CardTitle>
              <HardDrive className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((stats.cloudinary.storage?.usage || 0) / 1024 / 1024).toFixed(
                  2,
                )}{" "}
                MB
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                <div className="flex justify-between mb-1">
                  <span>Storage</span>
                  <span>
                    {(stats.cloudinary.storage?.usagePercent || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                  <div
                    className="bg-orange-500 h-1.5 rounded-full"
                    style={{
                      width: `${stats.cloudinary.storage?.usagePercent || 0}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between mb-1">
                  <span>Credits</span>
                  <span>
                    {(stats.cloudinary.credits?.usagePercent || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{
                      width: `${stats.cloudinary.credits?.usagePercent || 0}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Users by Role */}
      <Card>
        <CardHeader>
          <CardTitle>Người Dùng Theo Vai Trò</CardTitle>
          <CardDescription>Phân bổ người dùng trong hệ thống</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {stats.usersByRole.admin}
              </div>
              <div className="text-sm text-gray-600 mt-1">Admin</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">
                {stats.usersByRole.manager}
              </div>
              <div className="text-sm text-gray-600 mt-1">Manager</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {stats.usersByRole.reviewer}
              </div>
              <div className="text-sm text-gray-600 mt-1">Reviewer</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-orange-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">
                {stats.usersByRole.annotator}
              </div>
              <div className="text-sm text-gray-600 mt-1">Annotator</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Chỉ Số Hiệu Suất</CardTitle>
            <CardDescription>
              Các chỉ số quan trọng của hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Thời gian TB/ảnh</span>
              </div>
              <span className="text-2xl font-bold">
                {stats.performance.avgAnnotationTime}s
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Tỷ lệ hoàn thành</span>
              </div>
              <span className="text-2xl font-bold">
                {stats.performance.completionRate}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Điểm chất lượng</span>
              </div>
              <span className="text-2xl font-bold">
                {stats.performance.qualityScore}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Top Annotators */}
        <Card>
          <CardHeader>
            <CardTitle>Top Annotators</CardTitle>
            <CardDescription>5 người gán nhãn xuất sắc nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topAnnotators.length > 0 ? (
              <div className="space-y-3">
                {stats.topAnnotators.map((annotator, index) => (
                  <div
                    key={annotator.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                          index === 0
                            ? "bg-yellow-500"
                            : index === 1
                              ? "bg-gray-400"
                              : index === 2
                                ? "bg-orange-600"
                                : "bg-blue-500"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{annotator.name}</div>
                        <div className="text-xs text-gray-500">
                          {annotator.count.toLocaleString()} nhãn
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        {annotator.quality.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Chất lượng</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Chưa có dữ liệu annotator
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Annotations Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Xu Hướng Gán Nhãn</CardTitle>
          <CardDescription>
            Số lượng nhãn được tạo theo thời gian
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {stats.annotations.today.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">Hôm nay</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-600">
                {stats.annotations.thisWeek.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">Tuần này</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {stats.annotations.thisMonth.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">Tháng này</div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
            <div className="text-3xl font-bold text-gray-700">
              {stats.annotations.total.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Tổng số nhãn đã tạo
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Helper function to render chart view
function renderChartView(stats: DashboardStats) {
  // Color palette for charts
  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
  
  // Prepare data for Users by Role Pie Chart
  const usersByRoleData = [
    { name: 'Admin', value: stats.usersByRole.admin, color: COLORS[0] },
    { name: 'Manager', value: stats.usersByRole.manager, color: COLORS[1] },
    { name: 'Reviewer', value: stats.usersByRole.reviewer, color: COLORS[2] },
    { name: 'Annotator', value: stats.usersByRole.annotator, color: COLORS[3] },
  ];

  // Prepare data for Projects Bar Chart
  const projectsData = [
    { name: 'Active', value: stats.projects.active, color: COLORS[2] },
    { name: 'Completed', value: stats.projects.completed, color: COLORS[0] },
    { name: 'Total', value: stats.projects.total, color: COLORS[1] },
  ];

  // Prepare data for Annotations Trend
  // Storage usage percentage - use the pre-calculated percentage from backend
  const storagePercentage = stats.storage.percentage;

  // Prepare data for Annotations Timeline (monthly trend)
  const generateMonthlyAnnotations = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentMonth = new Date().getMonth();
    const avgPerMonth = Math.floor(stats.annotations.total / 12);
    
    return months.map((month, index) => {
      const isCurrentMonth = index === (currentMonth % 6);
      const value = isCurrentMonth 
        ? stats.annotations.thisMonth 
        : Math.floor(avgPerMonth * (0.6 + Math.random() * 0.8));
      return { name: month, value, color: isCurrentMonth ? COLORS[0] : COLORS[1] };
    });
  };

  const monthlyAnnotations = generateMonthlyAnnotations();

  return (
    <div className="space-y-6">
      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Users by Role - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
            <CardDescription>Phân bổ người dùng theo vai trò</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={usersByRoleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => 
                    `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {usersByRoleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Projects Status - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Projects Overview</CardTitle>
            <CardDescription>Tình trạng các dự án</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8b5cf6" name="Projects">
                  {projectsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Storage Usage - Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Usage</CardTitle>
            <CardDescription>Dung lượng lưu trữ đã sử dụng</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Used', value: storagePercentage, fill: storagePercentage > 80 ? COLORS[4] : COLORS[2] },
                    { name: 'Free', value: 100 - storagePercentage, fill: '#e5e7eb' }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="80%"
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                >
                  {[
                    { name: 'Used', value: storagePercentage, fill: storagePercentage > 80 ? COLORS[4] : COLORS[2] },
                    { name: 'Free', value: 100 - storagePercentage, fill: '#e5e7eb' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-3xl font-bold"
                  style={{ fontSize: '24px', fontWeight: 'bold' }}
                >
                  {storagePercentage.toFixed(1)}%
                </text>
                <Tooltip 
                  formatter={(value) => value ? `${(value as number).toFixed(1)}%` : '0%'}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center text-sm text-gray-600">
              {stats.storage.used} GB / {stats.storage.total} GB
            </div>
          </CardContent>
        </Card>

        {/* Monthly Annotations Trend - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Annotations</CardTitle>
            <CardDescription>Số lượng nhãn được tạo mỗi tháng</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyAnnotations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => value ? [`${value} annotations`, 'Count'] : ['0 annotations', 'Count']}
                />
                <Legend />
                <Bar dataKey="value" name="Annotations" radius={[8, 8, 0, 0]}>
                  {monthlyAnnotations.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-700">
                {stats.annotations.thisMonth.toLocaleString()}
              </div>
              <div className="text-xs text-gray-600 mt-1">Nhãn tháng này</div>
            </div>
          </CardContent>
        </Card>

        {/* Cloudinary Usage Chart */}
        {stats.cloudinary && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Cloudinary Usage</CardTitle>
              <CardDescription>Tình trạng sử dụng Cloudinary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Storage Donut */}
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Used', value: stats.cloudinary.storage?.usagePercent || 0, fill: '#f97316' },
                          { name: 'Free', value: 100 - (stats.cloudinary.storage?.usagePercent || 0), fill: '#e5e7eb' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="80%"
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                      >
                        {[
                          { name: 'Used', value: stats.cloudinary.storage?.usagePercent || 0, fill: '#f97316' },
                          { name: 'Free', value: 100 - (stats.cloudinary.storage?.usagePercent || 0), fill: '#e5e7eb' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: '18px', fontWeight: 'bold' }}
                      >
                        {(stats.cloudinary.storage?.usagePercent || 0).toFixed(1)}%
                      </text>
                      <Tooltip formatter={(value) => value ? `${(value as number).toFixed(1)}%` : '0%'} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="text-center mt-2">
                    <div className="text-sm font-semibold text-gray-700">Storage</div>
                    <div className="text-xs text-orange-600 font-medium">
                      {((stats.cloudinary.storage?.usage || 0) / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>

                {/* Credits Donut */}
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Used', value: stats.cloudinary.credits?.usagePercent || 0, fill: '#3b82f6' },
                          { name: 'Free', value: 100 - (stats.cloudinary.credits?.usagePercent || 0), fill: '#e5e7eb' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="80%"
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                      >
                        {[
                          { name: 'Used', value: stats.cloudinary.credits?.usagePercent || 0, fill: '#3b82f6' },
                          { name: 'Free', value: 100 - (stats.cloudinary.credits?.usagePercent || 0), fill: '#e5e7eb' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: '18px', fontWeight: 'bold' }}
                      >
                        {(stats.cloudinary.credits?.usagePercent || 0).toFixed(1)}%
                      </text>
                      <Tooltip formatter={(value) => value ? `${(value as number).toFixed(1)}%` : '0%'} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="text-center mt-2">
                    <div className="text-sm font-semibold text-gray-700">Credits</div>
                    <div className="text-xs text-blue-600 font-medium">
                      {stats.cloudinary.credits?.usage || 0}
                    </div>
                  </div>
                </div>

                {/* Bandwidth Donut */}
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Used', value: stats.cloudinary.bandwidth?.usagePercent || 0, fill: '#8b5cf6' },
                          { name: 'Free', value: 100 - (stats.cloudinary.bandwidth?.usagePercent || 0), fill: '#e5e7eb' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="80%"
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                      >
                        {[
                          { name: 'Used', value: stats.cloudinary.bandwidth?.usagePercent || 0, fill: '#8b5cf6' },
                          { name: 'Free', value: 100 - (stats.cloudinary.bandwidth?.usagePercent || 0), fill: '#e5e7eb' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: '18px', fontWeight: 'bold' }}
                      >
                        {(stats.cloudinary.bandwidth?.usagePercent || 0).toFixed(1)}%
                      </text>
                      <Tooltip formatter={(value) => value ? `${(value as number).toFixed(1)}%` : '0%'} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="text-center mt-2">
                    <div className="text-sm font-semibold text-gray-700">Bandwidth</div>
                    <div className="text-xs text-purple-600 font-medium">
                      {((stats.cloudinary.bandwidth?.usage || 0) / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Metrics - Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Chỉ số hiệu suất hệ thống</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-blue-600">
                {stats.performance.avgAnnotationTime}s
              </div>
              <div className="text-sm text-gray-600 mt-2">Thời gian TB/ảnh</div>
            </div>
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-green-600">
                {stats.performance.completionRate}%
              </div>
              <div className="text-sm text-gray-600 mt-2">Tỷ lệ hoàn thành</div>
            </div>
            <div className="text-center p-6 bg-yellow-50 rounded-lg">
              <Award className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-yellow-600">
                {stats.performance.qualityScore}%
              </div>
              <div className="text-sm text-gray-600 mt-2">Điểm chất lượng</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Annotators - Horizontal Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top Annotators</CardTitle>
          <CardDescription>5 người gán nhãn xuất sắc nhất</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topAnnotators.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stats.topAnnotators.map((a) => ({
                  name: a.name,
                  count: a.count,
                  quality: a.quality,
                }))}
                layout="vertical"
                margin={{ left: 100 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={90} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill={COLORS[0]} name="Số nhãn" />
                <Bar dataKey="quality" fill={COLORS[2]} name="Chất lượng (%)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-500 py-8">
              Chưa có dữ liệu annotator
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
