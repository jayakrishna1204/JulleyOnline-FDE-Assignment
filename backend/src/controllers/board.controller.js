const prisma = require('../config/database');
const { broadcastToTenant } = require('../sockets/socket.handler');
const { recordActivity } = require('../utils/activityLogger');

async function listBoards(req, res, next) {
  try {
    const tenantId = req.tenantId;

    const boards = await prisma.board.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { tasks: true, columns: true }
        },
        creator: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: boards
    });
  } catch (error) {
    next(error);
  }
}

async function getBoard(req, res, next) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const board = await prisma.board.findFirst({
      where: {
        id,
        tenantId // Enforce tenant isolation
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              where: { tenantId },
              orderBy: { position: 'asc' },
              include: {
                assignee: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        }
      }
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        error: 'Board not found in active branch/tenant. Cross-tenant access is prohibited.'
      });
    }

    res.json({
      success: true,
      data: board
    });
  } catch (error) {
    next(error);
  }
}

async function createBoard(req, res, next) {
  try {
    const { name, description } = req.body;
    const tenantId = req.tenantId;
    const organizationId = req.tenant.organizationId;
    const userId = req.user.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Board name is required'
      });
    }

    // Role check: Only Org Admin or Tenant Admin can create boards
    if (req.userRole !== 'Org Admin' && req.userRole !== 'Tenant Admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only Admins can create boards'
      });
    }

    const board = await prisma.$transaction(async (tx) => {
      const newBoard = await tx.board.create({
        data: {
          name: name.trim(),
          description: description ? description.trim() : null,
          tenantId,
          organizationId,
          createdBy: userId
        }
      });

      // Default standard columns
      const defaultCols = ['To Do', 'In Progress', 'Testing', 'Done'];
      for (let i = 0; i < defaultCols.length; i++) {
        await tx.column.create({
          data: {
            boardId: newBoard.id,
            tenantId,
            name: defaultCols[i],
            position: i
          }
        });
      }

      await recordActivity(
        {
          tenantId,
          userId,
          entityType: 'Board',
          entityId: newBoard.id,
          action: 'Created',
          details: { name: newBoard.name }
        },
        tx
      );

      return newBoard;
    });

    // Fetch full board with columns
    const fullBoard = await prisma.board.findUnique({
      where: { id: board.id },
      include: {
        columns: { orderBy: { position: 'asc' } }
      }
    });

    broadcastToTenant(tenantId, 'board:updated', { action: 'created', board: fullBoard });

    res.status(201).json({
      success: true,
      message: 'Board created successfully with default columns',
      data: fullBoard
    });
  } catch (error) {
    next(error);
  }
}

async function updateBoard(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const tenantId = req.tenantId;

    if (req.userRole !== 'Org Admin' && req.userRole !== 'Tenant Admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only Admins can update boards'
      });
    }

    const existing = await prisma.board.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Board not found in active tenant'
      });
    }

    const updated = await prisma.board.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        description: description !== undefined ? description : existing.description
      }
    });

    await recordActivity({
      tenantId,
      userId: req.user.id,
      entityType: 'Board',
      entityId: id,
      action: 'Updated',
      details: { name: updated.name }
    });

    broadcastToTenant(tenantId, 'board:updated', { action: 'updated', board: updated });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

async function deleteBoard(req, res, next) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    if (req.userRole !== 'Org Admin' && req.userRole !== 'Tenant Admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only Admins can delete boards'
      });
    }

    const existing = await prisma.board.findFirst({
      where: { id, tenantId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Board not found in active tenant'
      });
    }

    await prisma.board.delete({ where: { id } });

    await recordActivity({
      tenantId,
      userId: req.user.id,
      entityType: 'Board',
      entityId: id,
      action: 'Deleted',
      details: { name: existing.name }
    });

    broadcastToTenant(tenantId, 'board:updated', { action: 'deleted', boardId: id });

    res.json({
      success: true,
      message: 'Board deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listBoards,
  getBoard,
  createBoard,
  updateBoard,
  deleteBoard
};
