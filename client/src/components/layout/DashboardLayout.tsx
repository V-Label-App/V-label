import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "../ui/sidebar";
import { Separator } from "../ui/separator";

// Breadcrumb imports removed as they are unused
import { UserNav } from "../common/UserNav";
import { ChatWidget } from "../../features/chat-widget/components/ChatWidget";
import { useEffect } from "react";


import { useAuth } from "../../context/AuthContext";

export default function DashboardLayout() {
  const { isImpersonating } = useAuth();

  // Show keyboard shortcut hint on first visit
  useEffect(() => {
    const hasSeenHint = localStorage.getItem('chat-shortcut-hint-seen');
    if (!hasSeenHint) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const shortcut = isMac ? 'Control + Space' : 'Alt + Space';

      setTimeout(() => {
        console.log(`💡 Tip: Press ${shortcut} to toggle AI Assistant anywhere!`);
        localStorage.setItem('chat-shortcut-hint-seen', 'true');
      }, 2000);
    }
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            {/* <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Current Page</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb> */}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!isImpersonating && <UserNav />}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 bg-slate-50 min-h-[calc(100vh-4rem)] overflow-x-hidden min-w-0">
          <Outlet />
        </main>
      </SidebarInset>

      {/* Floating Chat Widget - Controlled by keyboard shortcut in useChatWidget hook */}
      <ChatWidget variant="floating" />
    </SidebarProvider>
  );
}
