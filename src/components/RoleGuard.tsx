import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * RoleGuard - Protects routes based on user role
 * 
 * Usage:
 * <RoleGuard allowedRoles={["Admin", "Dean"]}>
 *   <YourComponent />
 * </RoleGuard>
 */
const RoleGuard = ({ children, allowedRoles, redirectTo = "/dashboard" }: RoleGuardProps) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Check if user's role is in the allowed roles list
  const hasAccess = allowedRoles.includes(user.role);

  // Special case: Super Admin has access to everything
  if (user.isSuperAdmin && allowedRoles.includes("Admin")) {
    return <>{children}</>;
  }

  if (!hasAccess) {
    console.warn(`Access denied: User role "${user.role}" not in allowed roles:`, allowedRoles);
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
