import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/MainLayout";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import Resumes from "./pages/Resumes";
import Pipeline from "./pages/Pipeline";
import History from "./pages/History";
import Profile from "./pages/Profile";
import JobDetails from "./pages/JobDetails";
import NotFound from "./pages/NotFound";

import NewJob from "./pages/NewJob";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/jobs"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Jobs />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* ✅ New Job Route */}
            <Route
              path="/jobs/new"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <NewJob />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/resumes"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Resumes />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/pipeline"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Pipeline />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <History />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Profile />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
            path="/jobs/:id"
            element={
            <ProtectedRoute>
              <MainLayout>
                <JobDetails />
                </MainLayout>
    </ProtectedRoute>
  }
/>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
