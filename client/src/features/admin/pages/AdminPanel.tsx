import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Switch } from '../../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Users, Database, Activity, Settings, FileText, Plus, Star, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { UserNav } from '../../../components/common/UserNav';
import { motion } from 'framer-motion';
import { authApi } from '../../../services/auth.api';
import { toast } from 'sonner';


interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'reviewer' | 'annotator';
  is_active: boolean;
  reputation_score: number;
}

interface AdminPanelProps { }

interface ConfirmationState {
  type: 'role' | 'status' | 'delete' | null;
  userId: string | null;
  newValue?: any;
  title: string;
  description: string;
}

export function AdminPanel({ }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // Confirmation Mock
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    type: null,
    userId: null,
    title: '',
    description: ''
  });

  // Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'manager' | 'reviewer' | 'annotator'>('annotator');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await authApi.getAllUsers();
      // Transform API data to component interface
      const transformedUsers: User[] = data.map((u: any) => ({
        id: u.id,
        name: u.fullName || 'Unknown',
        email: u.email,
        role: (u.role?.toLowerCase() || 'annotator') as any,
        is_active: u.isActive,
        reputation_score: u.reputationScore || 0
      }));
      setUsers(transformedUsers);
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!newName || !newEmail || !newPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await authApi.createUser({
        fullName: newName,
        email: newEmail,
        password: newPassword,
        role: newRole
      });
      toast.success("User created successfully");
      setIsAddUserOpen(false);
      // Reset form
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('annotator');
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to create user", error);
      toast.error(error.response?.data?.error || "Failed to create user");
    }
  };

  const initToggleUserActive = (user: User) => { // Removed passed event/User mismatch in case of event
    setTimeout(() => {
      setConfirmation({
        type: 'status',
        userId: user.id,
        newValue: !user.is_active,
        title: user.is_active ? 'Deactivate User' : 'Activate User',
        description: `Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} ${user.name}?`
      });
    }, 0);
  };

  const initChangeUserRole = (user: User, newRole: string) => {
    setTimeout(() => {
      setConfirmation({
        type: 'role',
        userId: user.id,
        newValue: newRole,
        title: 'Change User Role',
        description: `Are you sure you want to change ${user.name}'s role to ${newRole}?`
      });
    }, 0);
  };

  const initDeleteUser = (user: User) => {
    setTimeout(() => {
      setConfirmation({
        type: 'delete',
        userId: user.id,
        title: 'Delete User',
        description: `Are you sure you want to delete ${user.name}? This action cannot be undone.`
      });
    }, 0);
  };

  const handleConfirmAction = async () => {
    const { type, userId, newValue } = confirmation;
    if (!userId) return;

    try {
      if (type === 'status') {
        // Optimistic update
        setUsers(users.map(user =>
          user.id === userId ? { ...user, is_active: newValue } : user
        ));
        await authApi.updateUser(userId, { isActive: newValue });
        toast.success(`User status updated`);
      } else if (type === 'role') {
        // Optimistic update
        setUsers(users.map(user =>
          user.id === userId ? { ...user, role: newValue } : user
        ));
        await authApi.updateUser(userId, { role: newValue });
        toast.success(`User role updated`);
      } else if (type === 'delete') {
        setUsers(users.filter(u => u.id !== userId));
        await authApi.deleteUser(userId);
        toast.success("User deleted successfully");
      }
    } catch (error) {
      console.error(`Failed to ${type} user`, error);
      toast.error(`Failed to update user`);
      fetchUsers(); // Revert on error
    } finally {
      setConfirmation({ type: null, userId: null, title: '', description: '' });
    }
  };


  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'asc' | 'desc' } | null>({ key: 'role', direction: 'asc' });

  const handleSort = (key: keyof User) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let aValue = a[key];
    let bValue = b[key];

    // Handle role hierarchy
    if (key === 'role') {
      const roleOrder = { admin: 0, manager: 1, reviewer: 2, annotator: 3 };
      const aRank = roleOrder[aValue as string] ?? 99;
      const bRank = roleOrder[bValue as string] ?? 99;
      return direction === 'asc' ? aRank - bRank : bRank - aRank;
    }

    // Handle boolean values (is_active)
    if (typeof aValue === 'boolean') {
      aValue = aValue ? 1 : 0;
      bValue = bValue ? 1 : 0;
    }

    if (aValue < bValue) {
      return direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

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
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50"
    >
      {/* Sidebar */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <h1 className="text-xl font-semibold">VLabel</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Admin Panel</p>
        </div>

        <nav className="flex-1 p-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Users</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mt-1 ${activeTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mt-1 ${activeTab === 'logs' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-medium">Logs</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="flex justify-end mb-4">
          <UserNav />
        </div>
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-3 gap-6 mb-8"
        >
          {[
            { icon: Users, label: "Total Users", value: users.length, trend: "From database", color: "blue" },
            { icon: Activity, label: "Active Projects", value: 24, trend: "↑ 8% from last month", color: "purple" },
            { icon: Database, label: "Storage Used", value: "342 GB", trend: "68% of 500 GB", color: "green", isMuted: true }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
            >
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-semibold">{stat.value}</h3>
                    <p className={`text-xs mt-2 ${stat.isMuted ? 'text-muted-foreground' : 'text-green-600'}`}>
                      {stat.trend}
                    </p>
                  </div>
                  <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* User Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">User Management</h2>
                <p className="text-sm text-muted-foreground mt-1">Manage user roles, permissions, and access</p>
              </div>
              <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <input
                        className="w-full px-4 py-2 rounded-md border border-gray-300"
                        placeholder="John Doe"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <input
                        type="email"
                        className="w-full px-4 py-2 rounded-md border border-gray-300"
                        placeholder="john@company.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <input
                        type="password"
                        className="w-full px-4 py-2 rounded-md border border-gray-300"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={newRole} onValueChange={(val: any) => setNewRole(val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="reviewer">Reviewer</SelectItem>
                          <SelectItem value="annotator">Annotator</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={handleCreateUser}
                    >
                      Create User
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-1">
                        User
                        {sortConfig?.key === 'name' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-50" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('email')}>
                      <div className="flex items-center gap-1">
                        Email
                        {sortConfig?.key === 'email' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-50" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('role')}>
                      <div className="flex items-center gap-1">
                        Role
                        {sortConfig?.key === 'role' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-50" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('is_active')}>
                      <div className="flex items-center gap-1">
                        Status
                        {sortConfig?.key === 'is_active' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-50" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('reputation_score')}>
                      <div className="flex items-center gap-1">
                        Reputation
                        {sortConfig?.key === 'reputation_score' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-50" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">Loading users...</TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">No users found</TableCell>
                    </TableRow>
                  ) : (
                    sortedUsers.map((user, index) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <TableCell>
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-blue-100 text-blue-700">
                              {getInitials(user.name)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) => initChangeUserRole(user, value as User['role'])}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="reviewer">Reviewer</SelectItem>
                              <SelectItem value="annotator">Annotator</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.is_active}
                              onCheckedChange={() => initToggleUserActive(user)}
                            />
                            <span className={`text-sm font-medium ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                              {user.is_active ? 'Active' : 'Locked'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium">{user.reputation_score}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                              {user.role}
                            </span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => initDeleteUser(user)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </motion.div>
      </div>

      <Dialog key={confirmation.type || 'closed'} open={!!confirmation.type} onOpenChange={(open) => !open && setConfirmation({ type: null, userId: null, title: '', description: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmation.title}</DialogTitle>
            <DialogDescription>
              {confirmation.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmation({ type: null, userId: null, title: '', description: '' })}>
              Cancel
            </Button>
            <Button
              variant={confirmation.type === 'delete' ? 'destructive' : 'default'}
              onClick={handleConfirmAction}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}