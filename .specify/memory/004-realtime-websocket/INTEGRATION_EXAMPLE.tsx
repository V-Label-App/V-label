// Integration Example: Chat in Manager Dashboard

import { ChatPanel } from '../../../components/chat/ChatPanel';

// Add this to the detail view section (around line 1000+)
// Inside the TabsContent where task management is shown:

<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Left: Task Management (70%) */}
    <div className="lg:col-span-2">
        {/* Existing task table/list goes here */}
    </div>

    {/* Right: Chat Panel (30%) */}
    <div className="lg:col-span-1">
        <ChatPanel
            projectId={selectedProject.id}
            projectName={selectedProject.name}
        />
    </div>
</div>

// For NotificationBell: Add to UserNav or Header component
import { NotificationBell } from '../components/notifications/NotificationBell';

// In the header (around line 623):
<div className="flex items-center gap-3">
    <NotificationBell />
    <UserNav />
</div>
