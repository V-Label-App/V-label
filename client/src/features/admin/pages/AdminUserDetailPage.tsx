import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { ArrowLeft, Mail, Shield, Activity, Calendar, Eye, Trash2 } from 'lucide-react';
import { authApi } from '../../../services/auth.api';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Lock } from 'lucide-react';

interface UserDetail {
    id: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
    reputationScore: number;
    totalTasksDone: number;
    createdAt: string;
    avatarUrl?: string;
    phoneNumber?: string;
}

export function AdminUserDetailPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { impersonateUser } = useAuth();
    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            try {
                if (!userId) return;
                const data = await authApi.getUserById(userId);
                setUser(data as any);
            } catch (error) {
                console.error('Failed to fetch user details:', error);
                toast.error('Failed to load user details');
                navigate('/admin');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [userId, navigate]);

    const handleImpersonate = async () => {
        if (!user) return;

        if (adminPassword !== '123') {
            toast.error('Incorrect admin password');
            return;
        }

        setIsPasswordDialogOpen(false);
        setAdminPassword('');

        toast.promise(impersonateUser(user.id), {
            loading: 'Switching identity...',
            success: 'Impersonation active!',
            error: 'Failed to impersonate user'
        });
    };

    const getInitials = (name: string) => {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '??';
    };

    const getRoleColor = (role: string) => {
        const colors = {
            admin: 'bg-red-100 text-red-700',
            manager: 'bg-blue-100 text-blue-700',
            reviewer: 'bg-purple-100 text-purple-700',
            annotator: 'bg-green-100 text-green-700',
        };
        return colors[role.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return <div className="p-8 text-center">Loading user details...</div>;
    }

    if (!user) {
        return <div className="p-8 text-center">User not found</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <Button
                    variant="ghost"
                    className="mb-6 pl-0 hover:bg-transparent hover:text-blue-600"
                    onClick={() => navigate('/admin')}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to User List
                </Button>

                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-6">
                        <Avatar className="w-24 h-24 text-2xl">
                            <AvatarFallback className="bg-blue-600 text-white">
                                {getInitials(user.fullName)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{user.fullName}</h1>
                            <div className="flex items-center gap-3 mt-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                                    {user.role}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {user.isActive ? 'Active' : 'Locked'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                            onClick={() => setIsPasswordDialogOpen(true)}
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            View As {user.role}
                        </Button>
                        {/* Add more actions like Edit or Delete here later */}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-gray-500" />
                            Account Information
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">User ID</span>
                                <span className="font-mono text-sm">{user.id}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500 flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> Email
                                </span>
                                <span>{user.email}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500 flex items-center gap-2">
                                    Phone
                                </span>
                                <span>{user.phoneNumber || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Joined
                                </span>
                                <span>{format(new Date(user.createdAt), 'PPP')}</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-gray-500" />
                            Platform Statistics
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Reputation Score</span>
                                <span className="font-medium text-yellow-600">{user.reputationScore}%</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500">Tasks Completed</span>
                                <span className="font-medium">{user.totalTasksDone}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Password Verification Dialog */}
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-orange-600" />
                            Admin Verification
                        </DialogTitle>
                        <DialogDescription>
                            Please enter the admin password to view the platform as <span className="font-bold text-foreground">{user.fullName}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">Admin Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleImpersonate();
                                }}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleImpersonate}>
                            Verify & Switch
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
