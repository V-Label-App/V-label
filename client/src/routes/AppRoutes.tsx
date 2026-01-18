import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';

// Auth pages
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';

// Role-specific pages
import { AdminPanel } from '../features/admin/pages/AdminPanel';
import { AdminUserDetailPage } from '../features/admin/pages/AdminUserDetailPage';
import { ProjectListPage } from '../features/manager/pages/ProjectListPage';
import { ProjectDetailPage } from '../features/manager/pages/ProjectDetailPage';
import { AnnotatorTasks } from '../features/annotator/pages/AnnotatorTasks';
import { ReviewerQueue } from '../features/reviewer/pages/ReviewerQueue';

// Other pages
import DashboardPage from '../pages/DashboardPage';
import { Workspace } from '../features/annotation/pages/Workspace';
import ProfilePage from '../features/profile/pages/ProfilePage';

// Root redirect component
const RootRedirect = () => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Redirect based on user role
    const roleRoutes: Record<string, string> = {
        ADMIN: '/admin',
        MANAGER: '/manager',
        ANNOTATOR: '/annotator',
        REVIEWER: '/reviewer',
    };

    const redirectPath = user ? roleRoutes[user.role] || '/dashboard' : '/login';
    return <Navigate to={redirectPath} replace />;
};

const WorkspaceRoute = () => {
    const { taskId } = useParams();
    return <Workspace taskId={taskId} />;
};

export const AppRoutes = () => {
    // const { logout } = useAuth();

    return (
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Root redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Protected routes - Role-specific */}
            <Route
                path="/admin"
                element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminPanel />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/users/:userId"
                element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminUserDetailPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/users/:userId"
                element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                        <AdminUserDetailPage />
                    </ProtectedRoute>
                }
            />

            {/* Manager Routes */}
            <Route
                path="/manager"
                element={<Navigate to="/manager/projects" replace />}
            />
            <Route
                path="/manager/projects"
                element={
                    <ProtectedRoute allowedRoles={['MANAGER']}>
                        <ProjectListPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/manager/projects/:projectId"
                element={
                    <ProtectedRoute allowedRoles={['MANAGER']}>
                        <ProjectDetailPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/annotator"
                element={
                    <ProtectedRoute allowedRoles={['ANNOTATOR']}>
                        <AnnotatorTasks
                            onOpenWorkspace={(taskId) => window.location.href = `/workspace/${taskId}`}
                        />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/reviewer"
                element={
                    <ProtectedRoute allowedRoles={['REVIEWER']}>
                        <ReviewerQueue
                            onOpenWorkspace={(taskId) => window.location.href = `/workspace/${taskId}`}
                        />
                    </ProtectedRoute>
                }
            />

            {/* Workspace Route */}
            <Route
                path="/workspace/:taskId"
                element={
                    <ProtectedRoute>
                        <WorkspaceRoute />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/profile"
                element={
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                }
            />

            {/* Dashboard - accessible by all authenticated users */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};
