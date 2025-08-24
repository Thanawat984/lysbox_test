import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import EmpresarioDashboard from "./pages/EmpresarioDashboard";
import ContadorDashboard from "./pages/ContadorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Planos from "./pages/Planos";
import Payment from "./pages/Payment";
import Trabalhe from "./pages/Trabalhe";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import CloudDashboard from "./pages/cloud/CloudDashboard";
import CloudFiles from "./pages/cloud/CloudFiles";
import CloudFavorites from "./pages/cloud/CloudFavorites";
import CloudTrash from "./pages/cloud/CloudTrash";
import CloudShared from "./pages/cloud/CloudShared";
import CloudSettings from "./pages/cloud/CloudSettings";
import Logout from "./pages/Logout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/logout" element={<Logout />} />
          <Route
            path="/empresario"
            element={
              <ProtectedRoute allow={["empresario"]}>
                <EmpresarioDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contador"
            element={
              <ProtectedRoute allow={["contador"]}>
                <ContadorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allow={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super"
            element={
              <ProtectedRoute allow={["super_admin"]}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/planos" element={<Planos />} />
          <Route path="/pay/:planId" element={<Payment />} />
          <Route path="/trabalhe" element={<Trabalhe />} />
          <Route
            path="/cloud"
            element={
              <ProtectedRoute>
                <CloudDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cloud/files"
            element={
              <ProtectedRoute>
                <CloudFiles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cloud/favorites"
            element={
              <ProtectedRoute>
                <CloudFavorites />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cloud/trash"
            element={
              <ProtectedRoute>
                <CloudTrash />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cloud/shared"
            element={
              <ProtectedRoute>
                <CloudShared />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cloud/settings"
            element={
              <ProtectedRoute>
                <CloudSettings />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
