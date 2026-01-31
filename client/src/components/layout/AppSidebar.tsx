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
      <SidebarHeader className="p-4 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <img
            src="/src/assets/android-chrome-192x192.png"
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
        <SidebarMenu className="gap-1.5">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.url ||
              (location.pathname.startsWith(item.url + "/") && item.url !== "/admin");
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className={`
                    h-10 transition-all duration-200 rounded-lg group
                    ${isActive
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
