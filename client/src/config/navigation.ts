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
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean; // For default active state if needed
}

export type RoleNavigation = {
  [key in "ADMIN" | "MANAGER" | "ANNOTATOR" | "REVIEWER"]: NavItem[];
};

export const ROLE_NAVIGATION: RoleNavigation = {
  ADMIN: [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Users", url: "/admin/users", icon: Users },
    { title: "AI Chat Setting", url: "/admin/ai-chat", icon: Sparkles },
    { title: "Logs", url: "/admin/logs", icon: FileText },
    { title: "Settings", url: "/admin/settings", icon: Settings },
    { title: "Notifications", url: "/admin/notifications", icon: Bell },
  ],
  MANAGER: [
    { title: "Projects", url: "/manager/projects", icon: Folder },
    { title: "Labels", url: "/manager/labels", icon: Tag },
  ],
  ANNOTATOR: [
    { title: "My Tasks", url: "/annotator", icon: ListTodo },
    { title: "Performance", url: "/profile", icon: BarChart },
  ],
  REVIEWER: [
    { title: "Review Queue", url: "/reviewer", icon: CheckSquare },
    { title: "Performance", url: "/profile", icon: BarChart },
  ],
};
