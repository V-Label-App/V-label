import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ProtectedRoute } from "../components/ProtectedRoute";

// Auth pages
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { ForgotPasswordPage } from "../features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../features/auth/pages/ResetPasswordPage";

// Role-specific pages
import { AdminPanel } from "../features/admin/pages/AdminPanel";
import { AdminUserDetailPage } from "../features/admin/pages/AdminUserDetailPage";
import { ProjectListPage } from "../features/manager/pages/ProjectListPage";
import { ProjectDetailPage } from "../features/manager/pages/ProjectDetailPage";
import { LabelManagementPage } from "../features/manager/pages/LabelManagementPage";
import { AnnotatorTasks } from "../features/annotator/pages/AnnotatorTasks";
import { AnnotatorProjectDetailPage } from "../features/annotator/pages/AnnotatorProjectDetailPage";
import { AnnotatorPerformancePage } from "../features/annotator/pages/AnnotatorPerformancePage";
import { ReviewerProjects } from "../features/reviewer/pages/ReviewerProjects";
import { ReviewerProjectDetailPage } from "../features/reviewer/pages/ReviewerProjectDetailPage";
import { ChatPage } from "../features/chat-widget/pages/ChatPage";

// Other pages
import DashboardPage from "../pages/DashboardPage";
import { WorkspacePage } from "../features/annotation/pages/WorkspacePage";
import ProfilePage from "../features/profile/pages/ProfilePage";
import DashboardLayout from "../components/layout/DashboardLayout";

// Root redirect component
const RootRedirect = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user role
  const roleRoutes: Record<string, string> = {
    ADMIN: "/admin",
    MANAGER: "/manager",
    ANNOTATOR: "/annotator",
    REVIEWER: "/reviewer",
  };

  const redirectPath = user ? roleRoutes[user.role] || "/dashboard" : "/login";
  return <Navigate to={redirectPath} replace />;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* App Layout Routes (With Sidebar) */}
      <Route element={<DashboardLayout />}>
        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:userId"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AdminUserDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/chat"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <ChatPage />
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
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ProjectListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/projects/:projectId"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ProjectDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/labels"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <LabelManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manager/chat"
          element={
            <ProtectedRoute allowedRoles={["MANAGER"]}>
              <ChatPage />
            </ProtectedRoute>
          }
        />


        {/* Annotator Routes (Task List) */}
        <Route
          path="/annotator"
          element={
            <ProtectedRoute allowedRoles={["ANNOTATOR"]}>
              <AnnotatorTasks
                onOpenWorkspace={(taskId) =>
                  (window.location.href = `/workspace/${taskId}`)
                }
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/annotator/projects/:projectId"
          element={
            <ProtectedRoute allowedRoles={["ANNOTATOR"]}>
              <AnnotatorProjectDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/annotator/performance"
          element={
            <ProtectedRoute allowedRoles={["ANNOTATOR"]}>
              <AnnotatorPerformancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/annotator/chat"
          element={
            <ProtectedRoute allowedRoles={["ANNOTATOR"]}>
              <ChatPage />
            </ProtectedRoute>
          }
        />


        {/* Reviewer Routes */}
        <Route
          path="/reviewer"
          element={
            <ProtectedRoute allowedRoles={["REVIEWER"]}>
              <ReviewerProjects
                onOpenWorkspace={(taskId) =>
                  (window.location.href = `/workspace/${taskId}`)
                }
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/projects/:projectId"
          element={
            <ProtectedRoute allowedRoles={["REVIEWER"]}>
              <ReviewerProjectDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/performance"
          element={
            <ProtectedRoute allowedRoles={["REVIEWER"]}>
              <AnnotatorPerformancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reviewer/chat"
          element={
            <ProtectedRoute allowedRoles={["REVIEWER"]}>
              <ChatPage />
            </ProtectedRoute>
          }
        />


        {/* Shared Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Full Screen Routes (No Sidebar) - Workspace */}
      <Route
        path="/workspace/:taskId"
        element={
          <ProtectedRoute>
            <WorkspacePage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
