import { useAuth } from "../../../context/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { CalendarDays, Mail, Shield, User as UserIcon, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import {
    BarChart, Bar, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Trophy } from "lucide-react";

export default function ProfilePage() {
    const { user } = useAuth()
    const navigate = useNavigate()

    if (!user) return <div className="p-8 text-center">Loading profile...</div>

    const initials = user.fullName
        ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
        : user.email.substring(0, 2).toUpperCase()

    // Role-specific colors or content
    const getRoleColor = (role: string) => {
        switch (role) {
            case 'ADMIN': return 'bg-red-500/10 text-red-500 border-red-500/20'
            case 'MANAGER': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            case 'REVIEWER': return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
            case 'ANNOTATOR': return 'bg-green-500/10 text-green-500 border-green-500/20'
            default: return 'bg-muted text-muted-foreground'
        }
    }

    // Mock Chart Data
    const weeklyActivityData = [
        { name: 'Mon', completed: 12, rejected: 2 },
        { name: 'Tue', completed: 19, rejected: 1 },
        { name: 'Wed', completed: 15, rejected: 0 },
        { name: 'Thu', completed: 22, rejected: 3 },
        { name: 'Fri', completed: 28, rejected: 1 },
        { name: 'Sat', completed: 10, rejected: 0 },
        { name: 'Sun', completed: 5, rejected: 0 },
    ];

    const taskDistributionData = [
        { name: 'Assigned', value: 12, color: '#3B82F6' },
        { name: 'Submitted', value: 45, color: '#8B5CF6' },
        { name: 'Rejected', value: 8, color: '#EF4444' },
    ];

    const dailyProgressData = [
        { time: '9 AM', tasks: 2 },
        { time: '10 AM', tasks: 5 },
        { time: '11 AM', tasks: 8 },
        { time: '12 PM', tasks: 12 },
        { time: '1 PM', tasks: 14 },
        { time: '2 PM', tasks: 19 },
        { time: '3 PM', tasks: 25 },
        { time: '4 PM', tasks: 28 },
    ];

    return (
        <div className="container max-w-4xl mx-auto py-10 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back
            </Button>

            {/* Header / Identity */}
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                <Avatar className="h-32 w-32 border-4 border-background ring-2 ring-primary/20 shadow-xl">
                    <AvatarImage src={user.avatarUrl || ""} alt={user.fullName || "Avatar"} className="object-cover" />
                    <AvatarFallback className="text-4xl font-bold bg-primary/5 text-primary">{initials}</AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center md:text-left space-y-4">
                    <div className="space-y-2">
                        <div className="flex flex-col md:flex-row items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight">{user.fullName || 'User'}</h1>
                            <div className="flex gap-2">
                                <Badge variant="outline" className={`${getRoleColor(user.role)} font-semibold`}>
                                    {user.role}
                                </Badge>
                                {user.isActive !== undefined && (
                                    <Badge variant="outline" className={`${user.isActive ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'} font-semibold`}>
                                        {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{user.email}</span>
                        </div>
                    </div>
                </div>

                <Button>Edit Profile</Button>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* Role Specific Stats / Dashboard */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Reputation Score</CardTitle>
                                <Shield className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{(user as any).reputationScore || 100}</div>
                                <p className="text-xs text-muted-foreground">
                                    Current reliability score
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Joined Date</CardTitle>
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {new Date().toLocaleDateString()}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Member since
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
                                <UserIcon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{(user as any).totalTasksDone || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    Tasks completed
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Additional Sections based on requirements */}
                    <Card className="col-span-full">
                        <CardHeader>
                            <CardTitle>Security</CardTitle>
                            <CardDescription>Manage your account security settings.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                                <div className="space-y-1">
                                    <p className="font-medium">Password</p>
                                    <p className="text-sm text-muted-foreground">Currently set securely</p>
                                </div>
                                <Button variant="outline" size="sm">Change</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="performance" className="space-y-6">
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Performance Analytics
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Weekly Activity */}
                            <Card className="p-4 shadow-sm">
                                <h3 className="text-sm font-medium text-muted-foreground mb-4">Weekly Activity</h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={weeklyActivityData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                                dy={10}
                                            />
                                            <RechartsTooltip
                                                cursor={{ fill: '#F3F4F6' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="completed" name="Completed" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
                                            <Bar dataKey="rejected" name="Rejected" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                            {/* Task Distribution */}
                            <Card className="p-4 shadow-sm">
                                <h3 className="text-sm font-medium text-muted-foreground mb-4">Task Status</h3>
                                <div className="h-[300px] w-full flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={taskDistributionData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={80}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {taskDistributionData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-4 mt-2">
                                    {taskDistributionData.map((entry, index) => (
                                        <div key={index} className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-xs text-muted-foreground">{entry.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Daily Progress */}
                            <Card className="p-4 shadow-sm col-span-full">
                                <h3 className="text-sm font-medium text-muted-foreground mb-4">Today's Progress</h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={dailyProgressData}>
                                            <defs>
                                                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis
                                                dataKey="time"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                                dy={10}
                                                interval="preserveStartEnd"
                                            />
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="tasks"
                                                stroke="#10B981"
                                                strokeWidth={2}
                                                fillOpacity={1}
                                                fill="url(#colorTasks)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>

                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
