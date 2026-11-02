const prisma = require('../config/database');

async function listOrganizations(req, res, next) {
  try {
    // Get unique organizations user is associated with
    const orgIds = [
      ...new Set(req.user.memberships.map((m) => m.organizationId))
    ];

    const organizations = await prisma.organization.findMany({
      where: {
        id: { in: orgIds }
      },
      include: {
        tenants: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: organizations
    });
  } catch (error) {
    next(error);
  }
}

async function getOrganization(req, res, next) {
  try {
    const { id } = req.params;

    // Check user membership
    const hasAccess = req.user.memberships.some((m) => m.organizationId === id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not belong to this organization'
      });
    }

    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        tenants: true
      }
    });

    if (!org) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      });
    }

    res.json({
      success: true,
      data: org
    });
  } catch (error) {
    next(error);
  }
}

async function createOrganization(req, res, next) {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Organization name is required'
      });
    }

    const org = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: { name: name.trim() }
      });

      // Creator automatically becomes Org Admin
      await tx.membership.create({
        data: {
          userId: req.user.id,
          organizationId: newOrg.id,
          role: 'Org Admin'
        }
      });

      return newOrg;
    });

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: org
    });
  } catch (error) {
    next(error);
  }
}

async function updateOrganization(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const isOrgAdmin = req.user.memberships.some(
      (m) => m.organizationId === id && m.role === 'Org Admin'
    );
    if (!isOrgAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only Org Admins can update organization details'
      });
    }

    const updated = await prisma.organization.update({
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

async function deleteOrganization(req, res, next) {
  try {
    const { id } = req.params;

    const isOrgAdmin = req.user.memberships.some(
      (m) => m.organizationId === id && m.role === 'Org Admin'
    );
    if (!isOrgAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only Org Admins can delete an organization'
      });
    }

    await prisma.organization.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization
};
