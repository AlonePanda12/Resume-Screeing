import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/MainLayout";

// Lazy-loaded pages (faster first paint)
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Jobs = lazy(() => import("./pages/Jobs"));
const Resumes = lazy(() => import("./pages/Resumes"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const History = lazy(() => import("./pages/History"));
const Profile = lazy(() => import("./pages/Profile"));
const JobDetails = lazy(() => import("./pages/JobDetails"));
const NewJob = lazy(() => import("./pages/NewJob"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const Loader = () => (
  <div style={{ padding: 24, textAlign: "center" }}>Loading…</div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Loader />}>
            <Routes>
              {/* Default → dashboard (protected) */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Public */}
              <Route path="/auth" element={<Auth />} />

              {/* Protected */}
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
                path="/jobs/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <JobDetails />
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

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
