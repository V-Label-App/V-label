import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  Sparkles,
  Bell,
  Folder,
  Tag,
  ListTodo,
  BarChart,
  CheckSquare,
  MessageSquare,
  Layers,
  Image as ImageIcon,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
  group?: string; // New property for grouping
}

export type RoleNavigation = {
  [key in "ADMIN" | "MANAGER" | "ANNOTATOR" | "REVIEWER"]: NavItem[];
};

export const ROLE_NAVIGATION: RoleNavigation = {
  ADMIN: [
    // General
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard, group: "General" },

    // Management
    { title: "Users", url: "/admin/users", icon: Users, group: "Management" },
    { title: "Project Categories", url: "/admin/categories", icon: Layers, group: "Management" },
    { title: "Images", url: "/admin/media", icon: ImageIcon, group: "Management" },
    { title: "Image Quality", url: "/admin/image-quality", icon: Sparkles, group: "Management" },

    // Settings
    { title: "AI Chat Setting", url: "/admin/ai-chat", icon: Sparkles, group: "Settings" },
    { title: "Email Setting", url: "/admin/settings", icon: Settings, group: "Settings" },

    // System
    { title: "Chat", url: "/admin/chat", icon: MessageSquare, group: "System" },
    { title: "Notifications", url: "/admin/notifications", icon: Bell, group: "System" },
    { title: "Logs", url: "/admin/logs", icon: FileText, group: "System" },
  ],
  MANAGER: [
    { title: "Projects", url: "/manager/projects", icon: Folder, group: "Workspace" },
    { title: "Labels", url: "/manager/labels", icon: Tag, group: "Workspace" },
    { title: "Chat", url: "/manager/chat", icon: MessageSquare, group: "Communication" },
  ],
  ANNOTATOR: [
    { title: "My Tasks", url: "/annotator", icon: ListTodo, group: "Workspace" },
    { title: "Performance", url: "/profile", icon: BarChart, group: "Profile" },
    { title: "Chat", url: "/annotator/chat", icon: MessageSquare, group: "Communication" },
  ],
  REVIEWER: [
    { title: "Review Queue", url: "/reviewer", icon: CheckSquare, group: "Workspace" },
    { title: "Performance", url: "/profile", icon: BarChart, group: "Profile" },
    { title: "Chat", url: "/reviewer/chat", icon: MessageSquare, group: "Communication" },
  ],
};
