import { useState, useEffect, useCallback } from "react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Switch } from "../../../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";

import { motion } from "framer-motion";
import { authApi } from "../../../services/auth.api";
import { toast } from "sonner";
import { AdminLogsPage } from "./AdminLogsPage";
import { AdminChatSettingsPage } from "./AdminChatSettingsPage";
import { AdminDashboardPage } from "./AdminDashboardPage";
import { AdminEmailSettingsPage } from "./AdminEmailSettingsPage";
import { AdminNotificationSettingsPage } from "./AdminNotificationSettingsPage";
import { AdminProjectCategoriesPage } from "./AdminProjectCategoriesPage";
import { AdminCloudinaryManagerPage } from "./AdminCloudinaryManagerPage";
import { AdminImageQualityPage } from "./AdminImageQualityPage";
import {
  Users,
  Database,
  Activity,
  Plus,
  Star,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Pencil, // V-Label: Added Pencil icon for Edit feature
} from "lucide-react";
import { useLocation } from "react-router-dom";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "REVIEWER" | "ANNOTATOR";
  is_active: boolean;
  reputation_score: number;
}

interface ApiUserResponse {
  id: string;
  fullName: string | null;
  email: string;
  role: string;
  isActive?: boolean;
  reputationScore?: number;
  avatarUrl?: string | null;
}

interface ConfirmationState {
  type: "role" | "status" | "delete" | null;
  userId: string | null;
  newValue?: string | boolean;
  title: string;
  description: string;
}

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine active tab based on URL path or default to dashboard
  const location = useLocation();

  const getActiveTabFromPath = useCallback(() => {
    const path = location.pathname;
    if (path.includes("/admin/users")) return "users";
    if (path.includes("/admin/categories")) return "categories";
    if (path.includes("/admin/settings")) return "settings";
    if (path.includes("/admin/logs")) return "logs";
    if (path.includes("/admin/ai-chat")) return "ai-chat";
    if (path.includes("/admin/notifications")) return "notifications";
    if (path.includes("/admin/media")) return "media";
    if (path.includes("/admin/image-quality")) return "image-quality";
    return "dashboard";
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState(getActiveTabFromPath());
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  // V-Label: State for Edit User feature
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Sync state with URL if needed
  useEffect(() => {
    setActiveTab(getActiveTabFromPath());
  }, [getActiveTabFromPath]);

  // Confirmation Mock
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    type: null,
    userId: null,
    title: "",
    description: "",
  });

  // Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<
    "ADMIN" | "MANAGER" | "REVIEWER" | "ANNOTATOR"
  >("ANNOTATOR");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await authApi.getAllUsers();

      // Transform API data to component interface
      // We map and then filter out any null/undefined entries if the API returns mixed data
      const transformedUsers: User[] = (data || [])
        .map((u: ApiUserResponse | undefined) => {
          if (!u) return null;
          return {
            id: u.id,
            name: u.fullName || "Unknown",
            email: u.email,
            role: (u.role?.toUpperCase() || "ANNOTATOR") as
              | "ADMIN"
              | "MANAGER"
              | "REVIEWER"
              | "ANNOTATOR",
            is_active: u.isActive ?? false,
            reputation_score: u.reputationScore || 0,
          };
        })
        .filter((u): u is User => u !== null && u.role !== "ADMIN");
      setUsers(transformedUsers);
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab]);

  // Reset errors when dialog closes
  useEffect(() => {
    if (!isAddUserOpen) {
      setEmailError("");
      setPhoneError("");
      setPasswordError("");
    }
  }, [isAddUserOpen]);

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError("");
      return false;
    }
    // Only allow Gmail addresses
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      setEmailError(
        "Please enter a valid email address (e.g., user@gmail.com)",
      );
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePhone = (phone: string) => {
    if (!phone) {
      setPhoneError("Phone number is required");
      return false;
    }
    // Allow Vietnamese phone format: starts with 0, 10-11 digits
    const phoneRegex = /^0\d{9,10}$/;
    if (!phoneRegex.test(phone.replace(/[\s-]/g, ""))) {
      setPhoneError(
        "Please enter a valid phone number (10-11 digits, starting with 0)",
      );
      return false;
    }
    setPhoneError("");
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError("Password is required");
      return false;
    }

    // Min 8 characters
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return false;
    }

    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      setPasswordError("Password must contain at least one uppercase letter");
      return false;
    }

    // At least one lowercase letter
    if (!/[a-z]/.test(password)) {
      setPasswordError("Password must contain at least one lowercase letter");
      return false;
    }

    // At least one number
    if (!/[0-9]/.test(password)) {
      setPasswordError("Password must contain at least one number");
      return false;
    }

    // At least one special character
    if (!/[\W_]/.test(password)) {
      setPasswordError(
        "Password must contain at least one special character (!@#$%^&*)",
      );
      return false;
    }

    setPasswordError("");
    return true;
  };

  const handleCreateUser = async () => {
    if (!newName || !newEmail || !newPassword || !newPhone) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate email
    if (!validateEmail(newEmail)) {
      return;
    }

    // Validate password
    if (!validatePassword(newPassword)) {
      return;
    }

    // Validate phone
    if (!validatePhone(newPhone)) {
      return;
    }

    try {
      await authApi.createUser({
        fullName: newName,
        email: newEmail,
        password: newPassword,
        phoneNumber: newPhone,
        role: newRole,
      });
      toast.success("User created successfully");
      setIsAddUserOpen(false);
      // Reset form
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewPhone("");
      setNewRole("ANNOTATOR");
      setEmailError("");
      setPhoneError("");
      setPasswordError("");
      fetchUsers();
    } catch (error: unknown) {
      console.error("Failed to create user", error);
      const errorMessage =
        (error as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Failed to create user";
      toast.error(errorMessage);
    }
  };

  const initEditUser = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    // Note: Phone is not currently retrieved in the brief user fetch, so we skip it or fetch detail
    setIsEditUserOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingUser) return;
    setIsEditing(true);
    try {
      if (!validateEmail(editEmail)) {
        setIsEditing(false);
        return;
      }

      await authApi.updateUser(editingUser.id, {
        fullName: editName,
        email: editEmail,
      });

      toast.success("User updated successfully");
      setIsEditUserOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to update user", error);
      if (error.response?.status === 409) {
        toast.error("Email đã được sử dụng bởi user khác");
      } else {
        toast.error("Failed to update user");
      }
    } finally {
      setIsEditing(false);
    }
  };

  const initToggleUserActive = (user: User) => {
    setTimeout(() => {
      setConfirmation({
        type: "status",
        userId: user.id,
        newValue: !user.is_active,
        title: user.is_active ? "Deactivate User" : "Activate User",
        description: `Are you sure you want to ${user.is_active ? "deactivate" : "activate"} ${user.name}?`,
      });
    }, 0);
  };

  const initChangeUserRole = (user: User, newRole: string) => {
    setTimeout(() => {
      setConfirmation({
        type: "role",
        userId: user.id,
        newValue: newRole,
        title: "Change User Role",
        description: `Are you sure you want to change ${user.name}'s role to ${newRole}?`,
      });
    }, 0);
  };

  const initDeleteUser = (user: User) => {
    setTimeout(() => {
      setConfirmation({
        type: "delete",
        userId: user.id,
        title: "Delete User",
        description: `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
      });
    }, 0);
  };

  const handleConfirmAction = async () => {
    const { type, userId, newValue } = confirmation;
    if (!userId) return;

    try {
      if (type === "status") {
        const isActive = newValue as boolean;
        // Optimistic update
        setUsers(
          users.map((user) =>
            user.id === userId ? { ...user, is_active: isActive } : user,
          ),
        );
        await authApi.updateUser(userId, { isActive: isActive });
        toast.success(`User status updated`);
      } else if (type === "role") {
        const newRole = newValue as
          | "ADMIN"
          | "MANAGER"
          | "REVIEWER"
          | "ANNOTATOR";
        // Optimistic update
        setUsers(
          users.map((user) =>
            user.id === userId ? { ...user, role: newRole } : user,
          ),
        );
        await authApi.updateUser(userId, { role: newRole });
        toast.success(`User role updated`);
      } else if (type === "delete") {
        setUsers(users.filter((u) => u.id !== userId));
        await authApi.deleteUser(userId);
        toast.success("User deleted successfully");
      }
    } catch (error: unknown) {
      console.error(`Failed to ${type} user`, error);
      toast.error(`Failed to update user`);
      fetchUsers(); // Revert on error
    } finally {
      setConfirmation({ type: null, userId: null, title: "", description: "" });
    }
  };

  // Sort State
  const [sortConfig, setSortConfig] = useState<{
    key: keyof User;
    direction: "asc" | "desc";
  } | null>({ key: "role", direction: "asc" });

  const handleSort = (key: keyof User) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let aValue = a[key];
    let bValue = b[key];

    // Handle role hierarchy
    if (key === "role") {
      const roleOrder: Record<string, number> = {
        ADMIN: 0,
        MANAGER: 1,
        REVIEWER: 2,
        ANNOTATOR: 3,
      };
      const aRank = roleOrder[aValue as string] ?? 99;
      const bRank = roleOrder[bValue as string] ?? 99;
      return direction === "asc" ? aRank - bRank : bRank - aRank;
    }

    // Handle boolean values (is_active)
    if (typeof aValue === "boolean") {
      aValue = aValue ? 1 : 0;
      bValue = bValue ? 1 : 0;
    }

    if (aValue < bValue) {
      return direction === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  const getInitials = (name: string) => {
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
      : "??";
  };

  const getRoleColor = (role: string) => {
    const colors = {
      ADMIN: "bg-red-100 text-red-700",
      MANAGER: "bg-blue-100 text-blue-700",
      REVIEWER: "bg-purple-100 text-purple-700",
      ANNOTATOR: "bg-green-100 text-green-700",
    };
    return colors[role as keyof typeof colors] || "bg-gray-100 text-gray-700";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className=""
    >
      {/* Main Content - No more Sidebar here */}
      <div className="p-2 md:p-4">
        {activeTab === "users" && (
          <>
            {/* Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
            >
              {[
                {
                  icon: Users,
                  label: "Total Users",
                  value: users.length,
                  trend: "From database",
                  color: "blue",
                },
                {
                  icon: Activity,
                  label: "Active Users",
                  value: users.filter((u) => u.is_active).length,
                  trend: `${Math.round((users.filter((u) => u.is_active).length / (users.length || 1)) * 100)}% active rate`,
                  color: "purple",
                },
                {
                  icon: Database,
                  label: "User Roles",
                  value: `${users.filter((u) => u.role === "ANNOTATOR").length} Annotators`,
                  trend: `Mg: ${users.filter((u) => u.role === "MANAGER").length} | Rev: ${users.filter((u) => u.role === "REVIEWER").length} | Adm: ${users.filter((u) => u.role === "ADMIN").length}`,
                  color: "green",
                  isMuted: false,
                },
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
                        <p className="text-sm text-muted-foreground mb-1">
                          {stat.label}
                        </p>
                        <h3 className="text-3xl font-semibold">{stat.value}</h3>
                        <p
                          className={`text-xs mt-2 ${stat.isMuted ? "text-muted-foreground" : "text-green-600"}`}
                        >
                          {stat.trend}
                        </p>
                      </div>
                      <div
                        className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}
                      >
                        <stat.icon
                          className={`w-6 h-6 text-${stat.color}-600`}
                        />
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
                    <p className="text-sm text-muted-foreground mt-1">
                      Manage user roles, permissions, and access
                    </p>
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
                            className={`w-full px-4 py-2 rounded-md border ${
                              emailError
                                ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder="user@gmail.com"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                          />
                          {emailError && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <span>⚠</span>
                              {emailError}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Password</Label>
                          <input
                            type="password"
                            className={`w-full px-4 py-2 rounded-md border ${
                              passwordError
                                ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder="Min 8 chars, uppercase, lowercase, number, special char"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          {passwordError && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <span>⚠</span>
                              {passwordError}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <input
                            type="tel"
                            className={`w-full px-4 py-2 rounded-md border ${
                              phoneError
                                ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                                : "border-gray-300"
                            }`}
                            placeholder="0123456789"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                          />
                          {phoneError && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                              <span>⚠</span>
                              {phoneError}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select
                            value={newRole}
                            onValueChange={(
                              val:
                                | "ADMIN"
                                | "MANAGER"
                                | "REVIEWER"
                                | "ANNOTATOR",
                            ) => setNewRole(val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MANAGER">Manager</SelectItem>
                              <SelectItem value="REVIEWER">Reviewer</SelectItem>
                              <SelectItem value="ANNOTATOR">
                                Annotator
                              </SelectItem>
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
                        <TableHead
                          className="cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center gap-1">
                            User
                            {sortConfig?.key === "name" ? (
                              sortConfig.direction === "asc" ? (
                                <ArrowUp className="w-4 h-4" />
                              ) : (
                                <ArrowDown className="w-4 h-4" />
                              )
                            ) : (
                              <ArrowUpDown className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-50" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort("email")}
                        >
                          <div className="flex items-center gap-1">
                            Email
                            {sortConfig?.key === "email" ? (
                              sortConfig.direction === "asc" ? (
                                <ArrowUp className="w-4 h-4" />
                              ) : (
                                <ArrowDown className="w-4 h-4" />
                              )
                            ) : (
                              <ArrowUpDown className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-50" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort("role")}
                        >
                          <div className="flex items-center gap-1">
                            Role
                            {sortConfig?.key === "role" ? (
                              sortConfig.direction === "asc" ? (
                                <ArrowUp className="w-4 h-4" />
                              ) : (
                                <ArrowDown className="w-4 h-4" />
                              )
                            ) : (
                              <ArrowUpDown className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-50" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort("is_active")}
                        >
                          <div className="flex items-center gap-1">
                            Status
                            {sortConfig?.key === "is_active" ? (
                              sortConfig.direction === "asc" ? (
                                <ArrowUp className="w-4 h-4" />
                              ) : (
                                <ArrowDown className="w-4 h-4" />
                              )
                            ) : (
                              <ArrowUpDown className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-50" />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort("reputation_score")}
                        >
                          <div className="flex items-center gap-1">
                            Reputation
                            {sortConfig?.key === "reputation_score" ? (
                              sortConfig.direction === "asc" ? (
                                <ArrowUp className="w-4 h-4" />
                              ) : (
                                <ArrowDown className="w-4 h-4" />
                              )
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
                          <TableCell colSpan={7} className="text-center py-8">
                            Loading users...
                          </TableCell>
                        </TableRow>
                      ) : users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            No users found
                          </TableCell>
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
                            <TableCell className="font-medium">
                              {user.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {user.email}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.role}
                                onValueChange={(value) =>
                                  initChangeUserRole(
                                    user,
                                    value as User["role"],
                                  )
                                }
                                disabled={user.role === "ADMIN"}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MANAGER">
                                    Manager
                                  </SelectItem>
                                  <SelectItem value="REVIEWER">
                                    Reviewer
                                  </SelectItem>
                                  <SelectItem value="ANNOTATOR">
                                    Annotator
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={user.is_active}
                                  onCheckedChange={() =>
                                    initToggleUserActive(user)
                                  }
                                />
                                <span
                                  className={`text-sm font-medium ${user.is_active ? "text-green-600" : "text-red-600"}`}
                                >
                                  {user.is_active ? "Active" : "Locked"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.role === "ANNOTATOR" ? (
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                  <span className="font-medium">
                                    {user.reputation_score}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  -
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}
                                >
                                  {user.role}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                  onClick={() =>
                                    (window.location.href = `/admin/users/${user.id}`)
                                  }
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {/* V-Label: Added Edit button to actions */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                  onClick={() => initEditUser(user)}
                                  title="Edit User"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => initDeleteUser(user)}
                                >
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
          </>
        )}

        {activeTab === "settings" && <AdminEmailSettingsPage />}

        {activeTab === "dashboard" && <AdminDashboardPage />}

        {activeTab === "logs" && <AdminLogsPage />}

        {activeTab === "ai-chat" && <AdminChatSettingsPage />}

        {activeTab === "notifications" && <AdminNotificationSettingsPage />}

        {activeTab === "categories" && <AdminProjectCategoriesPage />}

        {activeTab === "media" && <AdminCloudinaryManagerPage />}
        {activeTab === "image-quality" && <AdminImageQualityPage />}
      </div>

      <Dialog
        key={confirmation.type || "closed"}
        open={!!confirmation.type}
        onOpenChange={(open) =>
          !open &&
          setConfirmation({
            type: null,
            userId: null,
            title: "",
            description: "",
          })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmation.title}</DialogTitle>
            <DialogDescription>{confirmation.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() =>
                setConfirmation({
                  type: null,
                  userId: null,
                  title: "",
                  description: "",
                })
              }
            >
              Cancel
            </Button>
            <Button
              variant={
                confirmation.type === "delete" ? "destructive" : "default"
              }
              onClick={handleConfirmAction}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* V-Label: Edit User Dialog UI */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>Update user details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* UI Placeholder for Inputs */}
            <div className="space-y-2">
              <Label>Full Name</Label>
              <input
                className="w-full px-4 py-2 rounded-md border border-gray-300"
                placeholder="User Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <input
                type="email"
                className="w-full px-4 py-2 rounded-md border border-gray-300"
                placeholder="user@example.com"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            {/* Phone removed as we don't have it in table list simply */}
            <Button
              className="w-full bg-orange-600 hover:bg-orange-700"
              onClick={handleEditSubmit}
              disabled={isEditing}
            >
              {isEditing ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
