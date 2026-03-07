import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Workspace } from './pages/Workspace';
import { WorkspaceListPage } from './pages/WorkspaceListPage';
import { WorkspaceDetailPage } from './pages/WorkspaceDetailPage';
import { Login } from './pages/LoginPage';
import { Signup } from './pages/SignupPage';
import { LandingPage } from './pages/LandingPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { PricingPage } from './pages/PricingPage';
import { DocsPage } from './pages/DocsPage';
import { SharedView } from './pages/SharedView';
import { ProfilePage } from './pages/ProfilePage';
import { OAuthCallback } from './pages/OAuthCallback';
import { SettingsModal } from './components/SettingsModal';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { useResearchStore } from './store';


/* ---- Admin Components ---- */
import { AdminGuard } from './components/admin/AdminGuard';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminLogin } from './pages/admin/AdminLogin';
import { Dashboard as AdminDashboard } from './pages/admin/Dashboard';
import { UsersPanel as AdminUsersPanel } from './pages/admin/UsersPanel';
import { ResearchPanel as AdminResearchPanel } from './pages/admin/ResearchPanel';
import { AgentsPanel as AdminAgentsPanel } from './pages/admin/AgentsPanel';
import { AnalyticsPanel as AdminAnalyticsPanel } from './pages/admin/AnalyticsPanel';
import { WorkspacesPanel as AdminWorkspacesPanel } from './pages/admin/WorkspacesPanel';
import { ChatPanel as AdminChatPanel } from './pages/admin/ChatPanel';
import { VectorStorePanel as AdminVectorStorePanel } from './pages/admin/VectorStorePanel';
import { SecurityPanel as AdminSecurityPanel } from './pages/admin/SecurityPanel';

/* ------------------ Private Route Wrapper ------------------ */
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useResearchStore((state) => state.isAuthenticated);

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

/* ------------------ Main App Component ------------------ */
export default function App() {
  const rehydrateAuth = useResearchStore((state) => state.rehydrateAuth);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    rehydrateAuth().finally(() => setAuthReady(true));
  }, [rehydrateAuth]);

  if (!authReady) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-bg text-text-c" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AppErrorBoundary>
        <SettingsModal />

        {/* Global Toast Notifications */}
        <Toaster
          richColors
          position="top-right"
          theme="system"
          toastOptions={{
            style: {
              background: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            },
            classNames: {
              toast: 'border border-[var(--color-border)]',
              success: 'border border-teal-500/30 bg-teal-500/10 text-teal-400',
              error: 'border border-red-500/30 bg-red-500/10 text-red-400',
            },
          }}
        />

        <HashRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/shared/:token" element={<SharedView />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route element={<AdminGuard />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsersPanel />} />
                <Route path="/admin/research" element={<AdminResearchPanel />} />
                <Route path="/admin/agents" element={<AdminAgentsPanel />} />
                <Route path="/admin/analytics" element={<AdminAnalyticsPanel />} />
                <Route path="/admin/workspaces" element={<AdminWorkspacesPanel />} />
                <Route path="/admin/chat" element={<AdminChatPanel />} />
                <Route path="/admin/vectorstore" element={<AdminVectorStorePanel />} />
                <Route path="/admin/security" element={<AdminSecurityPanel />} />
                {/* End generic placeholder sections */}
              </Route>
            </Route>

            {/* Protected Routes */}
            <Route
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/workspaces" element={<WorkspaceListPage />} />
              <Route path="/workspace/:wid" element={<WorkspaceDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/research/:id" element={<Workspace />} />
            </Route>
          </Routes>
        </HashRouter>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}
