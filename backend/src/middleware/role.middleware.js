/**
 * Role-Based Access Control (RBAC) Middleware
 * Checks if user has one of the allowed roles in the active tenant/organization
 * Roles: 'Org Admin', 'Tenant Admin', 'Member'
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied: No active role identified'
      });
    }

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        error: `Permission denied: Action requires one of [${allowedRoles.join(', ')}], but your active role is '${req.userRole}'`
      });
    }

    next();
  };
}

module.exports = {
  requireRole
};
