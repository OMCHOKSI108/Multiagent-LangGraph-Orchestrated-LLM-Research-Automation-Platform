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
import { SharedView } from './pages/SharedView';
import { ProfilePage } from './pages/ProfilePage';
import { OAuthCallback } from './pages/OAuthCallback';
import { SettingsModal } from './components/SettingsModal';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { useResearchStore } from './store';

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
        <div className="min-h-screen bg-background text-foreground" />
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
              background: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
              border: '1px solid hsl(var(--border))',
            },
            classNames: {
              toast: 'border-border',
              success: 'bg-primary text-primary-foreground border-primary',
              error: 'bg-destructive text-destructive-foreground border-destructive',
            },
          }}
        />

        <HashRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/shared/:token" element={<SharedView />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />

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
