import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Users, FolderKanban, Tag, HardDrive, TrendingUp, Clock, Award, CheckCircle } from 'lucide-react';

// Mock data - sẽ thay bằng API call sau
const MOCK_STATS = {
    totalUsers: 156,
    usersByRole: {
        admin: 3,
        manager: 12,
        reviewer: 28,
        annotator: 113
    },
    projects: {
        active: 24,
        completed: 87,
        total: 111
    },
    annotations: {
        today: 1247,
        thisWeek: 8932,
        thisMonth: 34521,
        total: 245678
    },
    storage: {
        used: 45.2, // GB
        total: 100, // GB
        percentage: 45.2
    },
    topAnnotators: [
        { id: '1', name: 'Nguyễn Văn A', count: 2341, quality: 98.5 },
        { id: '2', name: 'Trần Thị B', count: 2156, quality: 97.8 },
        { id: '3', name: 'Lê Văn C', count: 1987, quality: 96.2 },
        { id: '4', name: 'Phạm Thị D', count: 1823, quality: 95.9 },
        { id: '5', name: 'Hoàng Văn E', count: 1654, quality: 94.7 }
    ],
    performance: {
        avgAnnotationTime: 45, // seconds
        completionRate: 87.3, // percentage
        qualityScore: 96.8 // percentage
    }
};

export function AdminDashboardPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Bảng Điều Khiển</h2>
                <p className="text-muted-foreground">Tổng quan về hệ thống và hiệu suất làm việc</p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Users */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng Người Dùng</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{MOCK_STATS.totalUsers}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <span className="text-green-600">+12</span> so với tháng trước
                        </p>
                    </CardContent>
                </Card>

                {/* Active Projects */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dự Án Đang Hoạt Động</CardTitle>
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{MOCK_STATS.projects.active}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {MOCK_STATS.projects.completed} đã hoàn thành
                        </p>
                    </CardContent>
                </Card>

                {/* Annotations This Month */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nhãn Tháng Này</CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{MOCK_STATS.annotations.thisMonth.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <span className="text-green-600">+23%</span> so với tháng trước
                        </p>
                    </CardContent>
                </Card>

                {/* Storage Usage */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dung Lượng Sử Dụng</CardTitle>
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{MOCK_STATS.storage.used} GB</div>
                        <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${MOCK_STATS.storage.percentage}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {MOCK_STATS.storage.percentage}% / {MOCK_STATS.storage.total} GB
                            </p>
                        </div>
                    </CardContent>
                </Card>
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
                            <div className="text-3xl font-bold text-blue-600">{MOCK_STATS.usersByRole.admin}</div>
                            <div className="text-sm text-gray-600 mt-1">Admin</div>
                        </div>
                        <div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-3xl font-bold text-purple-600">{MOCK_STATS.usersByRole.manager}</div>
                            <div className="text-sm text-gray-600 mt-1">Manager</div>
                        </div>
                        <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg">
                            <div className="text-3xl font-bold text-green-600">{MOCK_STATS.usersByRole.reviewer}</div>
                            <div className="text-sm text-gray-600 mt-1">Reviewer</div>
                        </div>
                        <div className="flex flex-col items-center p-4 bg-orange-50 rounded-lg">
                            <div className="text-3xl font-bold text-orange-600">{MOCK_STATS.usersByRole.annotator}</div>
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
                        <CardDescription>Các chỉ số quan trọng của hệ thống</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium">Thời gian TB/ảnh</span>
                            </div>
                            <span className="text-2xl font-bold">{MOCK_STATS.performance.avgAnnotationTime}s</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">Tỷ lệ hoàn thành</span>
                            </div>
                            <span className="text-2xl font-bold">{MOCK_STATS.performance.completionRate}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-medium">Điểm chất lượng</span>
                            </div>
                            <span className="text-2xl font-bold">{MOCK_STATS.performance.qualityScore}%</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Annotators */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Annotators</CardTitle>
                        <CardDescription>5 người gán nhãn xuất sắc nhất tháng này</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {MOCK_STATS.topAnnotators.map((annotator, index) => (
                                <div key={annotator.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${index === 0 ? 'bg-yellow-500' :
                                            index === 1 ? 'bg-gray-400' :
                                                index === 2 ? 'bg-orange-600' :
                                                    'bg-blue-500'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-medium">{annotator.name}</div>
                                            <div className="text-xs text-gray-500">{annotator.count.toLocaleString()} nhãn</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-green-600">{annotator.quality}%</div>
                                        <div className="text-xs text-gray-500">Chất lượng</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Annotations Trend */}
            <Card>
                <CardHeader>
                    <CardTitle>Xu Hướng Gán Nhãn</CardTitle>
                    <CardDescription>Số lượng nhãn được tạo theo thời gian</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-blue-600">{MOCK_STATS.annotations.today.toLocaleString()}</div>
                            <div className="text-sm text-gray-600 mt-1">Hôm nay</div>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-purple-600">{MOCK_STATS.annotations.thisWeek.toLocaleString()}</div>
                            <div className="text-sm text-gray-600 mt-1">Tuần này</div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-green-600">{MOCK_STATS.annotations.thisMonth.toLocaleString()}</div>
                            <div className="text-sm text-gray-600 mt-1">Tháng này</div>
                        </div>
                    </div>
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
                        <div className="text-3xl font-bold text-gray-700">{MOCK_STATS.annotations.total.toLocaleString()}</div>
                        <div className="text-sm text-gray-600 mt-1">Tổng số nhãn đã tạo</div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
