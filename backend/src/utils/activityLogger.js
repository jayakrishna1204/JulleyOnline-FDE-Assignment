const prisma = require('../config/database');

/**
 * Record an activity log entry
 * @param {Object} params
 * @param {string} params.tenantId
 * @param {string} params.userId
 * @param {string} params.entityType - 'Task' | 'Board' | 'Column' | 'Membership'
 * @param {string} params.entityId
 * @param {string} params.action - 'Created' | 'Updated' | 'Moved' | 'Deleted'
 * @param {Object} [params.details]
 */
async function recordActivity({ tenantId, userId, entityType, entityId, action, details = {} }, tx = null) {
  try {
    const db = tx || prisma;
    const log = await db.activityLog.create({
      data: {
        tenantId,
        userId: userId || null,
        entityType,
        entityId,
        action,
        details
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    return log;
  } catch (error) {
    console.error('Failed to record activity log:', error);
    return null;
  }
}

module.exports = {
  recordActivity
};
