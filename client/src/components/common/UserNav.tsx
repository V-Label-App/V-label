import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "../../components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu"
import { useAuth } from "../../context/AuthContext"
import { LogOut, User as UserIcon, Award } from "lucide-react"
import { Badge } from "../../components/ui/badge"
import { useNavigate } from "react-router-dom"
import { Button } from "../../components/ui/button"
import { NotificationBell } from "../notifications/NotificationBell"

import { toast } from "sonner"

export function UserNav() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    if (!user) return null

    // Get initials from full name or email
    const initials = user.fullName
        ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
        : user.email.substring(0, 2).toUpperCase()

    const handleLogout = () => {
        logout()
        toast.success('Logged out successfully')
    }

    return (
        <div className="flex items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-fit p-2 px-3 rounded-full flex gap-2 items-center hover:bg-muted/50 transition-colors">
                        <Avatar className="h-9 w-9 border-2 border-primary/20">
                            <AvatarImage src={user.avatarUrl || ""} alt={user.fullName || user.email} className="object-cover" />
                            <AvatarFallback className="bg-primary/5 font-semibold text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-left text-sm max-w-[150px] hidden md:flex">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-semibold truncate leading-none">{user.fullName || 'User'}</span>
                                {user.role === 'ANNOTATOR' && (
                                    <Badge variant="outline" className="h-4 px-1 text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200">
                                        Lv.{Math.floor((user.reputationScore || 0) / 100) + 1}
                                    </Badge>
                                )}
                            </div>
                            {user.role === 'ANNOTATOR' && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground leading-none">
                                    <Award className="w-3 h-3 text-orange-500" />
                                    <span>{user.reputationScore || 0} pts</span>
                                </div>
                            )}
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user.fullName}</p>
                            {user.role === 'ANNOTATOR' && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Award className="w-3 h-3 text-orange-500" />
                                    <span>Reputation Score: {user.reputationScore || 0}</span>
                                </div>
                            )}
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                            <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span>Profile</span>
                            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                        <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
