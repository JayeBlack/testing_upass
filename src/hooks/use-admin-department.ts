import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook that returns admin department context.
 * - Departmental admins: locked to their department, no filter shown
 * - Super admin, Dean, ViceDean, Accountant, ExamsOfficer, Registrar, AdminAssistant: sees all departments
 */
export const useAdminDepartment = () => {
  const { user } = useAuth();
  // These roles get global access (see all departments)
  const isSuperAdmin = user?.isSuperAdmin === true || 
    user?.role === "Dean" || 
    user?.role === "ViceDean" ||
    user?.role === "Accountant" || 
    user?.role === "ExamsOfficer" ||
    user?.role === "Registrar" ||
    user?.role === "AdminAssistant";
  
  // If super admin, don't filter by department
  const adminDepartment = isSuperAdmin ? undefined : user?.department;

  return { isSuperAdmin, adminDepartment, user };
};
