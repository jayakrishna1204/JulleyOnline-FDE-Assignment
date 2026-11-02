const prisma = require('../config/database');
const { broadcastToTenant } = require('../sockets/socket.handler');

async function getBoardColumns(req, res, next) {
  try {
    const { boardId } = req.params;
    const tenantId = req.tenantId;

    const columns = await prisma.column.findMany({
      where: {
        boardId,
        tenantId
      },
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
    });

    res.json({
      success: true,
      data: columns
    });
  } catch (error) {
    next(error);
  }
}

async function createColumn(req, res, next) {
  try {
    const { boardId, name, position } = req.body;
    const tenantId = req.tenantId;

    if (!boardId || !name) {
      return res.status(400).json({
        success: false,
        error: 'boardId and name are required'
      });
    }

    // Verify board belongs to tenant
    const board = await prisma.board.findFirst({
      where: { id: boardId, tenantId }
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        error: 'Board not found in active tenant'
      });
    }

    let pos = position;
    if (pos === undefined || pos === null) {
      const maxCol = await prisma.column.findFirst({
        where: { boardId, tenantId },
        orderBy: { position: 'desc' }
      });
      pos = maxCol ? maxCol.position + 1 : 0;
    }

    const column = await prisma.column.create({
      data: {
        boardId,
        tenantId,
        name: name.trim(),
        position: pos
      }
    });

    broadcastToTenant(tenantId, 'board:updated', { action: 'column_created', column });

    res.status(201).json({
      success: true,
      data: column
    });
  } catch (error) {
    next(error);
  }
}

async function updateColumn(req, res, next) {
  try {
    const { id } = req.params;
    const { name, position } = req.body;
    const tenantId = req.tenantId;

    const column = await prisma.column.findFirst({
      where: { id, tenantId }
    });

    if (!column) {
      return res.status(404).json({
        success: false,
        error: 'Column not found in active tenant'
      });
    }

    const updated = await prisma.column.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : column.name,
        position: position !== undefined ? position : column.position
      }
    });

    broadcastToTenant(tenantId, 'board:updated', { action: 'column_updated', column: updated });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

async function deleteColumn(req, res, next) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    const column = await prisma.column.findFirst({
      where: { id, tenantId }
    });

    if (!column) {
      return res.status(404).json({
        success: false,
        error: 'Column not found in active tenant'
      });
    }

    await prisma.column.delete({ where: { id } });

    broadcastToTenant(tenantId, 'board:updated', { action: 'column_deleted', columnId: id });

    res.json({
      success: true,
      message: 'Column deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBoardColumns,
  createColumn,
  updateColumn,
  deleteColumn
};
