import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole, getDashboardRouteForRole } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allow?: AppRole[]; // allowed roles
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allow }) => {
  const { user, primaryRole, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) return location.pathname !== "/auth" ? (
    <Navigate to="/auth" state={{ from: location }} replace />
  ) : null;

  if (allow) {
    if (!primaryRole) {
      // Wait for role resolution to avoid redirect loops
      return null;
    }
    if (!allow.includes(primaryRole)) {
      const isCloud = (user as any)?.user_metadata?.cloud_account_type === "nuvem_lysbox";
      const dest = isCloud ? "/cloud" : getDashboardRouteForRole(primaryRole);
      return location.pathname !== dest ? <Navigate to={dest} replace /> : null;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
