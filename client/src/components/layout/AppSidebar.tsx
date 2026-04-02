import { useAuth } from "../../context/AuthContext";
import { ROLE_NAVIGATION } from "../../config/navigation";
import logoUrl from "../../assets/android-chrome-192x192.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  // SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "../../components/ui/sidebar";
import { chatSettingsApi } from "../../services/chatSettings.api";
import { useState, useEffect, useMemo } from "react";

import { Link, useLocation } from "react-router-dom";
// import { UserNav } from "../common/UserNav";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const location = useLocation();
  const [chatConfig, setChatConfig] = useState<any>(null);

  useEffect(() => {
    // Fetch chat config to determine if full page mode is enabled
    const loadConfig = () => {
      chatSettingsApi.getConfig()
        .then(config => setChatConfig(config))
        .catch(err => console.error('[AppSidebar] Failed to load chat config:', err));
    };

    loadConfig();

    // Listen for config updates from Admin Panel
    const channel = new BroadcastChannel('chat_widget_channel');
    channel.onmessage = (event) => {
      if (event.data.type === 'config_updated') {
        console.log('[AppSidebar] Config updated, reloading...');
        loadConfig();
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // Fallback to empty array if user role is not found or not mapped
  const baseNavItems = user?.role
    ? ROLE_NAVIGATION[user.role as keyof typeof ROLE_NAVIGATION] || []
    : [];

  // Filter Chat tab based on config (except for ADMIN)
  const navItems = useMemo(() => {
    if (!user?.role) return [];
    if (user.role === 'ADMIN') return baseNavItems; // ADMIN always sees all tabs

    // For other roles, filter out Chat if fullPageModeEnabled is false
    if (!chatConfig?.fullPageModeEnabled) {
      return baseNavItems.filter(item => item.title !== 'Chat');
    }

    return baseNavItems;
  }, [baseNavItems, chatConfig, user?.role]);

  // Group items
  const groupedNavItems = useMemo(() => {
    const groups: { name: string; items: typeof navItems }[] = [];
    navItems.forEach((item) => {
      const groupName = item.group || "General";
      let group = groups.find((g) => g.name === groupName);
      if (!group) {
        group = { name: groupName, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });
    return groups;
  }, [navItems]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="p-4 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <img
            src={logoUrl}
            alt="VLabel Logo"
            className="w-10 h-10 rounded-lg"
          />
          <div className="flex flex-col text-left leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-semibold text-lg">VLabel</span>
            <span className="text-sm text-muted-foreground">
              {user?.role === "ADMIN"
                ? "Admin Dashboard"
                : user?.role === "MANAGER"
                  ? "Manager Dashboard"
                  : user?.role === "REVIEWER"
                    ? "Reviewer Workspace"
                    : "Annotator Workspace"}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        {groupedNavItems.map((group) => (
          <SidebarGroup key={group.name} className="p-0 mb-2 last:mb-0">
            {/* Render label for groups other than General, or if we want to be explicit */}
            {group.name && group.name !== "General" && (
              <SidebarGroupLabel className="mb-1 px-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                {group.name}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  // Only use startsWith for deep nested routes (2+ path segments)
                  // Root dashboard paths like /manager, /admin, /annotator, /reviewer
                  // should only match exact pathname to avoid false positives
                  const isRootPath = item.url.split("/").filter(Boolean).length <= 1;
                  const isActive =
                    location.pathname === item.url ||
                    (!isRootPath && location.pathname.startsWith(item.url + "/"));
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={`
                          h-9 transition-all duration-200 rounded-md group
                          ${isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-none"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                          }
                        `}
                      >
                        <Link to={item.url} className="flex items-center gap-3">
                          <item.icon
                            className={`
                              w-4 h-4 transition-colors
                              ${isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"}
                            `}
                          />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Sidebar Footer removed to match old code structure (Profile in Header) */}
      <SidebarRail />
    </Sidebar>
  );
}
