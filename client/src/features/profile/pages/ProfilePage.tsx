import { useAuth } from "../../../context/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar"
import { Button } from "../../../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Badge } from "../../../components/ui/badge"
import { CalendarDays, Mail, Shield, User as UserIcon, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"

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
                            <Badge variant="outline" className={`${getRoleColor(user.role)} font-semibold`}>
                                {user.role}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{user.email}</span>
                        </div>
                    </div>
                </div>

                <Button>Edit Profile</Button>
            </div>

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
        </div>
    )
}
