const prisma = require('../config/database');

async function listTenants(req, res, next) {
  try {
    const { organizationId } = req.query;

    // Determine authorized tenant IDs and org admin org IDs
    const user = req.user;
    const directTenantIds = user.memberships
      .filter((m) => m.tenantId)
      .map((m) => m.tenantId);

    const orgAdminOrgIds = user.memberships
      .filter((m) => m.role === 'Org Admin')
      .map((m) => m.organizationId);

    const whereClause = {
      OR: [
        { id: { in: directTenantIds } },
        { organizationId: { in: orgAdminOrgIds } }
      ]
    };

    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const tenants = await prisma.tenant.findMany({
      where: whereClause,
      include: {
        organization: true,
        _count: {
          select: {
            boards: true,
            tasks: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: tenants
    });
  } catch (error) {
    next(error);
  }
}

async function getTenant(req, res, next) {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        organization: true,
        boards: {
          select: {
            id: true,
            name: true,
            description: true,
            _count: { select: { tasks: true } }
          }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    // Check authorization: direct membership or Org Admin of parent organization
    const isDirectMember = req.user.memberships.some((m) => m.tenantId === id);
    const isOrgAdmin = req.user.memberships.some(
      (m) => m.organizationId === tenant.organizationId && m.role === 'Org Admin'
    );

    if (!isDirectMember && !isOrgAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have authorization to view this branch'
      });
    }

    res.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    next(error);
  }
}

async function createTenant(req, res, next) {
  try {
    const { organizationId, name } = req.body;

    if (!organizationId || !name) {
      return res.status(400).json({
        success: false,
        error: 'Both organizationId and name are required'
      });
    }

    // Only Org Admin can create tenants
    const isOrgAdmin = req.user.memberships.some(
      (m) => m.organizationId === organizationId && m.role === 'Org Admin'
    );
    if (!isOrgAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only Org Admins can create new branch tenants'
      });
    }

    const tenant = await prisma.tenant.create({
      data: {
        organizationId,
        name: name.trim()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Tenant branch created successfully',
      data: tenant
    });
  } catch (error) {
    next(error);
  }
}

async function updateTenant(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    const isOrgAdmin = req.user.memberships.some(
      (m) => m.organizationId === tenant.organizationId && m.role === 'Org Admin'
    );
    const isTenantAdmin = req.user.memberships.some(
      (m) => m.tenantId === id && m.role === 'Tenant Admin'
    );

    if (!isOrgAdmin && !isTenantAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient permissions to update tenant'
      });
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: { name: name.trim() }
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

async function deleteTenant(req, res, next) {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    const isOrgAdmin = req.user.memberships.some(
      (m) => m.organizationId === tenant.organizationId && m.role === 'Org Admin'
    );

    if (!isOrgAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only Org Admins can delete tenants'
      });
    }

    await prisma.tenant.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

async function getTenantUsers(req, res, next) {
  try {
    const { id } = req.params;

    // Check membership authorization
    const isDirectMember = req.user.memberships.some((m) => m.tenantId === id);
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ success: false, error: 'Tenant not found' });
    }

    const isOrgAdmin = req.user.memberships.some(
      (m) => m.organizationId === tenant.organizationId && m.role === 'Org Admin'
    );

    if (!isDirectMember && !isOrgAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Cross-tenant user listing is strictly prohibited'
      });
    }

    const memberships = await prisma.membership.findMany({
      where: {
        OR: [
          { tenantId: id },
          { organizationId: tenant.organizationId, role: 'Org Admin' }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    const users = memberships.map((m) => ({
      ...m.user,
      role: m.role
    }));

    // Deduplicate by user id
    const uniqueUsers = Array.from(
      new Map(users.map((u) => [u.id, u])).values()
    );

    res.json({
      success: true,
      data: uniqueUsers
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  getTenantUsers
};
