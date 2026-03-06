import { useAuth } from "../../../context/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { CalendarDays, Mail, Shield, User as UserIcon, ArrowLeft, Phone, Briefcase } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import {
    BarChart, Bar, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Trophy, Upload, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "../../../components/ui/dialog"
import { Input } from "../../../components/ui/input"
import { Label } from "../../../components/ui/label"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import api from "../../../api/axiosClient"
import { authApi, type PerformanceStats } from "../../../services/auth.api"



export default function ProfilePage() {
    const { user, refreshUserProfile } = useAuth()
    const navigate = useNavigate()

    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        phoneNumber: (user as any)?.phoneNumber || ''
    })

    // Change Password states
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    })
    const [passwordErrors, setPasswordErrors] = useState<{
        oldPassword?: string
        newPassword?: string
        confirmNewPassword?: string
    }>({})
    const [isChangingPassword, setIsChangingPassword] = useState(false)

    const handleSaveProfile = async () => {
        if (!formData.fullName.trim()) {
            toast.error("Full name is required")
            return
        }

        try {
            setIsSaving(true)
            await api.put('/users/me', formData)
            await refreshUserProfile()
            toast.success("Profile updated successfully")
            setIsEditOpen(false)
        } catch (error) {
            toast.error("Failed to update profile")
            console.error(error)
        } finally {
            setIsSaving(false)
        }
    }

    const validatePassword = (password: string): string | undefined => {
        if (password.length < 8) {
            return "Password must be at least 8 characters"
        }
        if (!/[A-Z]/.test(password)) {
            return "Password must contain at least one uppercase letter"
        }
        if (!/[a-z]/.test(password)) {
            return "Password must contain at least one lowercase letter"
        }
        if (!/[0-9]/.test(password)) {
            return "Password must contain at least one number"
        }
        if (!/[!@#$%^&*]/.test(password)) {
            return "Password must contain at least one special character (!@#$%^&*)"
        }
        return undefined
    }

    const handleChangePassword = async () => {
        // Reset errors
        setPasswordErrors({})

        // Validate fields
        const errors: typeof passwordErrors = {}

        if (!passwordData.oldPassword) {
            errors.oldPassword = "Current password is required"
        }

        if (!passwordData.newPassword) {
            errors.newPassword = "New password is required"
        } else {
            const passwordError = validatePassword(passwordData.newPassword)
            if (passwordError) {
                errors.newPassword = passwordError
            }
        }

        if (!passwordData.confirmNewPassword) {
            errors.confirmNewPassword = "Please confirm your new password"
        } else if (passwordData.newPassword !== passwordData.confirmNewPassword) {
            errors.confirmNewPassword = "Passwords do not match"
        }

        // Show errors if any
        if (Object.keys(errors).length > 0) {
            setPasswordErrors(errors)
            return
        }

        // Call API
        try {
            setIsChangingPassword(true)
            const result = await authApi.changePassword(passwordData)
            toast.success(result.message || "Password changed successfully")
            setIsChangePasswordOpen(false)
            // Reset form
            setPasswordData({
                oldPassword: '',
                newPassword: '',
                confirmNewPassword: ''
            })
            setPasswordErrors({})
        } catch (error) {
            const errorMessage = (error as { response?: { data?: { error?: string; message?: string } } }).response?.data?.error 
                || (error as { response?: { data?: { message?: string } } }).response?.data?.message 
                || "Failed to change password"
            toast.error(errorMessage)
            
            // If old password is incorrect, show error on that field
            if (errorMessage.includes("Current password is incorrect")) {
                setPasswordErrors({ oldPassword: "Current password is incorrect" })
            }
        } finally {
            setIsChangingPassword(false)
        }
    }

    const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const stats = await authApi.getPerformanceStats()
                setPerformanceStats(stats)
            } catch (error) {
                console.error("Failed to fetch performance stats", error)
            }
        }
        if (user) {
            fetchStats()
        }
    }, [user])

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

    const weeklyActivityData = performanceStats?.weeklyActivity || []
    const taskDistributionData = performanceStats?.taskDistribution || []
    const dailyProgressData = performanceStats?.dailyProgress || []

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
                        <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{(user as any).phoneNumber || "No phone number"}</span>
                        </div>
                    </div>
                </div>

                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setFormData({
                            fullName: user.fullName || '',
                            phoneNumber: (user as any).phoneNumber || ''
                        })}>
                            Edit Profile
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Profile</DialogTitle>
                            <DialogDescription>
                                Update your personal information.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center gap-2 mb-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={user.avatarUrl || ""} />
                                    <AvatarFallback>{initials}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2"
                                        onClick={() => document.getElementById('avatar-upload')?.click()}
                                        disabled={isSaving}
                                    >
                                        <Upload className="h-3 w-3" />
                                        Change Avatar
                                    </Button>
                                    <input
                                        type="file"
                                        id="avatar-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0]
                                            if (!file) return

                                            if (file.size > 5 * 1024 * 1024) {
                                                toast.error("Image size must be less than 5MB")
                                                return
                                            }

                                            try {
                                                setIsSaving(true)
                                                // Optimistic update could go here
                                                await authApi.uploadAvatar(file)
                                                await refreshUserProfile()
                                                toast.success("Avatar updated successfully")
                                            } catch (error) {
                                                toast.error("Failed to upload avatar")
                                                console.error(error)
                                            } finally {
                                                setIsSaving(false)
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveProfile} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* Role Specific Stats / Dashboard */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Reputation Score for non-admin/manager roles */}
                        {user.role !== 'ADMIN' && user.role !== 'MANAGER' && (
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Reputation Score</CardTitle>
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{(user as any).reputationScore ?? 0}</div>
                                    <p className="text-xs text-muted-foreground">
                                        Current reliability score
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Managed Projects Count for Managers */}
                        {user.role === 'MANAGER' && (
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Managed Projects</CardTitle>
                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{(user as any).projectsManaged || 0}</div>
                                    <p className="text-xs text-muted-foreground">
                                        Active projects
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Joined Date</CardTitle>
                                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {(user as any).createdAt ? new Date((user as any).createdAt).toLocaleDateString() : 'N/A'}
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
                                <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
                                    <DialogTrigger asChild>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => {
                                                setPasswordData({
                                                    oldPassword: '',
                                                    newPassword: '',
                                                    confirmNewPassword: ''
                                                })
                                                setPasswordErrors({})
                                            }}
                                        >
                                            Change
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Change Password</DialogTitle>
                                            <DialogDescription>
                                                Enter your current password and choose a new secure password.
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="oldPassword">Current Password</Label>
                                                <Input
                                                    id="oldPassword"
                                                    type="password"
                                                    placeholder="Enter current password"
                                                    value={passwordData.oldPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                                />
                                                {passwordErrors.oldPassword && (
                                                    <p className="text-sm text-red-500">{passwordErrors.oldPassword}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="newPassword">New Password</Label>
                                                <Input
                                                    id="newPassword"
                                                    type="password"
                                                    placeholder="Enter new password"
                                                    value={passwordData.newPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                />
                                                {passwordErrors.newPassword && (
                                                    <p className="text-sm text-red-500">{passwordErrors.newPassword}</p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    Must be at least 8 characters with uppercase, lowercase, number, and special character (!@#$%^&*)
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                                                <Input
                                                    id="confirmNewPassword"
                                                    type="password"
                                                    placeholder="Re-enter new password"
                                                    value={passwordData.confirmNewPassword}
                                                    onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
                                                />
                                                {passwordErrors.confirmNewPassword && (
                                                    <p className="text-sm text-red-500">{passwordErrors.confirmNewPassword}</p>
                                                )}
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <Button 
                                                variant="outline" 
                                                onClick={() => setIsChangePasswordOpen(false)}
                                                disabled={isChangingPassword}
                                            >
                                                Cancel
                                            </Button>
                                            <Button 
                                                onClick={handleChangePassword} 
                                                disabled={isChangingPassword}
                                            >
                                                {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Change Password
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
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
