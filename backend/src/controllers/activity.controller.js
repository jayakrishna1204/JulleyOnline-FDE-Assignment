const prisma = require('../config/database');

async function listActivities(req, res, next) {
  try {
    const tenantId = req.tenantId;
    const limit = parseInt(req.query.limit) || 50;

    const activities = await prisma.activityLog.findMany({
      where: { tenantId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100)
    });

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    next(error);
  }
}

async function getEntityActivities(req, res, next) {
  try {
    const { entityType, entityId } = req.params;
    const tenantId = req.tenantId;

    const activities = await prisma.activityLog.findMany({
      where: {
        tenantId,
        entityType,
        entityId
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listActivities,
  getEntityActivities
};
