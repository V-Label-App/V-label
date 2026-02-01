import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatWidget } from '../components/ChatWidget';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { chatSettingsApi } from '../../../services/chatSettings.api';

export function ChatPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isCheckingAccess, setIsCheckingAccess] = useState(true);

    useEffect(() => {
        const checkAccess = async () => {
            try {
                // ADMIN always has access
                if (user?.role === 'ADMIN') {
                    setIsCheckingAccess(false);
                    return;
                }

                // For other roles, check if fullPageModeEnabled
                const config = await chatSettingsApi.getConfig();

                if (!config.fullPageModeEnabled) {
                    // Redirect to role-specific dashboard
                    const rolePrefix = user?.role?.toLowerCase() || 'dashboard';
                    navigate(`/${rolePrefix}`, { replace: true });
                } else {
                    setIsCheckingAccess(false);
                }
            } catch (error) {
                console.error('[ChatPage] Failed to check access:', error);
                // On error, redirect to dashboard for safety
                const rolePrefix = user?.role?.toLowerCase() || 'dashboard';
                navigate(`/${rolePrefix}`, { replace: true });
            }
        };

        checkAccess();
    }, [user, navigate]);

    // Show loading while checking access
    if (isCheckingAccess) {
        return (
            <div className="container mx-auto p-6 h-[calc(100vh-80px)] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="text-muted-foreground">Checking access...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 h-[calc(100vh-80px)] flex flex-col">
            <div className="mb-4">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                    <h1 className="text-2xl font-bold">AI Assistant</h1>
                </div>
                <p className="text-muted-foreground mt-1">
                    Ask questions about your projects, get help with tasks, or explore features.
                </p>
            </div>

            <div className="flex-1 min-h-0">
                <ChatWidget variant="fullpage" className="h-full" />
            </div>
        </div>
    );
}
