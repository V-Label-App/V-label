import { useAuth } from '../context/AuthContext';
import { LogOut, Eye } from 'lucide-react';
import { Button } from './ui/button';

export function ImpersonationBanner() {
    const { isImpersonating, stopImpersonation, user } = useAuth();

    if (!isImpersonating) return null;

    return (
        <div className="bg-orange-600 text-white px-4 py-2 flex items-center justify-between shadow-md relative z-[100]">
            <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 animate-pulse" />
                <span className="font-medium">
                    Impersonating Tenant: <span className="font-bold">{user?.fullName || user?.email}</span>
                </span>
            </div>

            <Button
                variant="ghost"
                size="sm"
                onClick={stopImpersonation}
                className="text-white hover:bg-white/20 hover:text-white border border-white/30"
            >
                <LogOut className="w-4 h-4 mr-2" />
                Exit Impersonation
            </Button>
        </div>
    );
}
