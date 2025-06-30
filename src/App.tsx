
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Sessions from "./pages/Sessions";
import SessionForm from "./pages/SessionForm";
import PitStops from "./pages/PitStops";
import UserManagement from "./pages/UserManagement";
import AuditLogs from "./pages/AuditLogs";
import Profile from "./pages/Profile";
import TeamOverview from "./pages/TeamOverview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900 flex items-center justify-center">
        <div className="text-white text-lg">Starting engines...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/" replace /> : <Auth />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <Layout>
              <Sessions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/create"
        element={
          <ProtectedRoute requiredRoles={['team_principal', 'administrator']}>
            <Layout>
              <SessionForm />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions/edit/:id"
        element={
          <ProtectedRoute requiredRoles={['race_engineer', 'team_principal', 'administrator']}>
            <Layout>
              <SessionForm />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pit-stops"
        element={
          <ProtectedRoute requiredRoles={['race_engineer', 'team_principal', 'administrator']}>
            <Layout>
              <PitStops />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team-overview"
        element={
          <ProtectedRoute requiredRoles={['driver', 'race_engineer', 'team_principal', 'administrator']}>
            <Layout>
              <TeamOverview />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute requiredRoles={['administrator']}>
            <Layout>
              <UserManagement />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute requiredRoles={['team_principal', 'administrator']}>
            <Layout>
              <AuditLogs />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
