import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type UserRole = 'ADMIN' | 'MANAGER' | 'REVIEWER' | 'ANNOTATOR';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const { isAuthenticated, isLoading, user } = useAuth();

    // Show nothing while checking auth status
    if (isLoading) {
        return null;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If no role restrictions, allow access
    if (!allowedRoles || allowedRoles.length === 0) {
        return <>{children}</>;
    }

    // Check if user has required role
    if (user && allowedRoles.includes(user.role as UserRole)) {
        return <>{children}</>;
    }

    // User doesn't have required role, redirect to their dashboard
    const roleRedirects: Record<string, string> = {
        ADMIN: '/admin',
        MANAGER: '/manager',
        ANNOTATOR: '/annotator',
        REVIEWER: '/reviewer',
    };

    const redirectPath = user ? roleRedirects[user.role] || '/dashboard' : '/login';
    return <Navigate to={redirectPath} replace />;
};
