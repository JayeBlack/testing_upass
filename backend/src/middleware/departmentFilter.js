/**
 * Department Filter Helper for Backend Queries
 * 
 * Used to restrict departmental admins to see only their department's data
 * while allowing Super Admin, Dean, and other global roles to see everything.
 */

/**
 * Get department filter for SQL queries
 * 
 * @param {Object} user - The authenticated user object from req.user
 * @param {string} paramDepartment - Optional department parameter from query string
 * @returns {Object} { filterClause: string, filterParams: array, nextParamIndex: number }
 */
function getDepartmentFilter(user, paramDepartment = null, startParamIndex = 1) {
  const globalRoles = ["Dean", "ViceDean", "Registrar", "ExamsOfficer", "Accountant", "AccountingAssistant"];
  
  // Super Admin sees everything
  if (user.isSuperAdmin || user.email?.startsWith('superadmin')) {
    return { filterClause: "", filterParams: [], nextParamIndex: startParamIndex };
  }
  
  // Global roles see everything (unless they specify a department filter)
  if (globalRoles.includes(user.role)) {
    if (paramDepartment && paramDepartment !== "all") {
      return {
        filterClause: ` AND d.name = $${startParamIndex}`,
        filterParams: [paramDepartment],
        nextParamIndex: startParamIndex + 1
      };
    }
    return { filterClause: "", filterParams: [], nextParamIndex: startParamIndex };
  }
  
  // Departmental Admin - restrict to their department
  if (user.role === "Admin" && user.department) {
    return {
      filterClause: ` AND d.name = $${startParamIndex}`,
      filterParams: [user.department],
      nextParamIndex: startParamIndex + 1
    };
  }
  
  // If department was passed as parameter, use it
  if (paramDepartment && paramDepartment !== "all") {
    return {
      filterClause: ` AND d.name = $${startParamIndex}`,
      filterParams: [paramDepartment],
      nextParamIndex: startParamIndex + 1
    };
  }
  
  // Default: no filter
  return { filterClause: "", filterParams: [], nextParamIndex: startParamIndex };
}

/**
 * Check if user has department-level access (not global)
 */
function isDepartmentalUser(user) {
  const globalRoles = ["Dean", "ViceDean", "Registrar", "ExamsOfficer", "Accountant", "AccountingAssistant"];
  
  if (user.isSuperAdmin || user.email?.startsWith('superadmin')) {
    return false;
  }
  
  if (globalRoles.includes(user.role)) {
    return false;
  }
  
  return user.role === "Admin" && user.department;
}

/**
 * Get user's accessible departments
 */
function getUserDepartments(user) {
  if (user.isSuperAdmin || user.email?.startsWith('superadmin')) {
    return "all";
  }
  
  const globalRoles = ["Dean", "ViceDean", "Registrar", "ExamsOfficer", "Accountant", "AccountingAssistant"];
  if (globalRoles.includes(user.role)) {
    return "all";
  }
  
  if (user.role === "Admin" && user.department) {
    return user.department;
  }
  
  return "all";
}

module.exports = {
  getDepartmentFilter,
  isDepartmentalUser,
  getUserDepartments
};
