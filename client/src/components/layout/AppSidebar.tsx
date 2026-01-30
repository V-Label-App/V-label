import { useAuth } from "../../context/AuthContext";
import { ROLE_NAVIGATION } from "../../config/navigation";
import {
  Sidebar,
  SidebarContent,
  // SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "../../components/ui/sidebar";

import { Link, useLocation } from "react-router-dom";
// import { UserNav } from "../common/UserNav";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const location = useLocation();

  // Fallback to empty array if user role is not found or not mapped
  const navItems = user?.role
    ? ROLE_NAVIGATION[user.role as keyof typeof ROLE_NAVIGATION] || []
    : [];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="p-4 border-b border-sidebar-border/50 bg-gradient-to-br from-blue-50/50 to-transparent">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center transition-all duration-300">
          <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-sidebar-primary-foreground shadow-lg shadow-blue-500/20">
            <span className="text-xl font-bold text-white">V</span>
          </div>
          <div className="flex flex-col text-left leading-tight group-data-[collapsible=icon]:hidden transition-all duration-300">
            <span className="font-bold text-base tracking-tight text-foreground/90">
              V-Label
            </span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {user?.role} Workspace
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarMenu className="gap-1.5">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.url ||
              location.pathname.startsWith(item.url + "/");
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className={`
                    h-10 transition-all duration-200 rounded-lg group
                    ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-medium shadow-sm ring-1 ring-blue-100"
                        : "text-muted-foreground hover:bg-gray-100/80 hover:text-foreground"
                    }
                  `}
                >
                  <Link to={item.url} className="flex items-center gap-3">
                    <item.icon
                      className={`
                        w-5 h-5 transition-colors
                        ${isActive ? "text-blue-600" : "text-muted-foreground group-hover:text-foreground"}
                      `}
                    />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      {/* Sidebar Footer removed to match old code structure (Profile in Header) */}
      <SidebarRail />
    </Sidebar>
  );
}
