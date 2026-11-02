const prisma = require('../config/database');

/**
 * Tenant Isolation Middleware
 * Verifies that the requested tenant is authorized for the authenticated user.
 * Blocks any attempt to read or modify another tenant's data.
 */
async function requireTenant(req, res, next) {
  try {
    const tenantId =
      req.headers['x-tenant-id'] ||
      req.params.tenantId ||
      req.query.tenantId ||
      req.body?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Active tenant ID must be provided via x-tenant-id header, query parameter, or route parameter'
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { organization: true }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Requested tenant does not exist'
      });
    }

    // Check if user has direct membership in this tenant
    const directMembership = req.user.memberships.find(
      (m) => m.tenantId === tenantId
    );

    // Or check if user is Org Admin for this tenant's parent organization
    const orgAdminMembership = req.user.memberships.find(
      (m) => m.organizationId === tenant.organizationId && m.role === 'Org Admin'
    );

    const effectiveMembership = directMembership || orgAdminMembership;

    if (!effectiveMembership) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You are not authorized to access this tenant. Cross-tenant access is strictly forbidden.'
      });
    }

    // Attach validated tenant context to request
    req.tenantId = tenantId;
    req.tenant = tenant;
    req.membership = effectiveMembership;
    req.userRole = effectiveMembership.role;

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireTenant
};
