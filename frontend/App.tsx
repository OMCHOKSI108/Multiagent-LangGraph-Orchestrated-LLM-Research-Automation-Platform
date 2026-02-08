import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Workspace } from './pages/Workspace';
import { Login } from './pages/LoginPage';
import { Signup } from './pages/SignupPage';
import { LandingPage } from './pages/LandingPage';
import { SettingsModal } from './components/SettingsModal';
import { useResearchStore } from './store';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useResearchStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

export default function App() {
  const rehydrateAuth = useResearchStore((s) => s.rehydrateAuth);

  useEffect(() => {
    rehydrateAuth();
  }, [rehydrateAuth]);
  return (
    <ThemeProvider>
      <SettingsModal />
      {/* Global Toast Notifications */}
      <Toaster richColors position="top-right" theme="system" />
      <HashRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Routes wrapped in Sidebar Layout */}
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/research/:id" element={<Workspace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}