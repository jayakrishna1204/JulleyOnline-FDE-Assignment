const { z } = require('zod');
const prisma = require('../config/database');
const { broadcastToTenant } = require('../sockets/socket.handler');
const { recordActivity } = require('../utils/activityLogger');

const createTaskSchema = z.object({
  boardId: z.string().uuid(),
  columnId: z.string().uuid(),
  title: z.string().min(1, 'Task title is required').max(255),
  description: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
  dueDate: z.string().datetime().optional().nullable(),
  position: z.number().int().nonnegative().optional()
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  expectedVersion: z.number().int().positive().optional()
});

const moveTaskSchema = z.object({
  destinationColumnId: z.string().uuid(),
  newPosition: z.number().int().nonnegative(),
  expectedVersion: z.number().int().positive().optional()
});

async function listTasks(req, res, next) {
  try {
    const tenantId = req.tenantId;
    const { boardId, columnId, assignedTo } = req.query;

    const whereClause = { tenantId };
    if (boardId) whereClause.boardId = boardId;
    if (columnId) whereClause.columnId = columnId;
    if (assignedTo) whereClause.assignedTo = assignedTo;

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: { id: true, name: true, email: true }
        },
        column: {
          select: { id: true, name: true, position: true }
        }
      },
      orderBy: [{ columnId: 'asc' }, { position: 'asc' }]
    });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    next(error);
  }
}

async function getTask(req, res, next) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;

    // Strict multi-tenant query: task must belong to active tenant
    const task = await prisma.task.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true }
        },
        column: true,
        board: {
          select: { id: true, name: true }
        }
      }
    });

    if (!task) {
      // Check if task exists in ANOTHER tenant (for explicit cross-tenant testing message)
      const foreignTask = await prisma.task.findUnique({ where: { id } });
      if (foreignTask && foreignTask.tenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          error: 'Security Alert: Cross-tenant access blocked. This task belongs to an isolated branch/tenant.'
        });
      }

      return res.status(404).json({
        success: false,
        error: 'Task not found in this tenant'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
}

async function createTask(req, res, next) {
  try {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors
      });
    }

    const { boardId, columnId, title, description, assignedTo, priority, dueDate, position } = parsed.data;
    const tenantId = req.tenantId;
    const userId = req.user.id;

    // Verify board and column belong to this tenant
    const column = await prisma.column.findFirst({
      where: { id: columnId, boardId, tenantId }
    });

    if (!column) {
      return res.status(400).json({
        success: false,
        error: 'Invalid column or board for this tenant'
      });
    }

    // Determine position if not supplied
    let pos = position;
    if (pos === undefined || pos === null) {
      const lastTask = await prisma.task.findFirst({
        where: { columnId, tenantId },
        orderBy: { position: 'desc' }
      });
      pos = lastTask ? lastTask.position + 1 : 0;
    }

    const task = await prisma.$transaction(async (tx) => {
      const newTask = await tx.task.create({
        data: {
          boardId,
          columnId,
          tenantId,
          title: title.trim(),
          description: description ? description.trim() : null,
          assignedTo: assignedTo || null,
          priority: priority || 'Medium',
          dueDate: dueDate ? new Date(dueDate) : null,
          position: pos,
          version: 1
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true }
          },
          column: {
            select: { id: true, name: true, position: true }
          }
        }
      });

      await recordActivity(
        {
          tenantId,
          userId,
          entityType: 'Task',
          entityId: newTask.id,
          action: 'Created',
          details: { title: newTask.title, column: column.name, priority: newTask.priority }
        },
        tx
      );

      return newTask;
    });

    broadcastToTenant(tenantId, 'task:created', { task });

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
}

async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const userId = req.user.id;

    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors
      });
    }

    const { title, description, assignedTo, priority, dueDate, expectedVersion } = parsed.data;

    // Check task in tenant
    const currentTask = await prisma.task.findFirst({
      where: { id, tenantId },
      include: {
        assignee: true,
        column: true
      }
    });

    if (!currentTask) {
      return res.status(404).json({
        success: false,
        error: 'Task not found in active tenant'
      });
    }

    // Optimistic Concurrency Control Check
    if (expectedVersion !== undefined && currentTask.version !== expectedVersion) {
      return res.status(409).json({
        success: false,
        error: `Conflict detected: Task was modified by another user. (Server version: ${currentTask.version}, your version: ${expectedVersion})`,
        conflict: true,
        currentVersion: currentTask.version,
        serverTask: currentTask
      });
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id },
        data: {
          title: title !== undefined ? title.trim() : currentTask.title,
          description: description !== undefined ? (description ? description.trim() : null) : currentTask.description,
          assignedTo: assignedTo !== undefined ? assignedTo : currentTask.assignedTo,
          priority: priority !== undefined ? priority : currentTask.priority,
          dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : currentTask.dueDate,
          version: { increment: 1 }
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true }
          },
          column: {
            select: { id: true, name: true, position: true }
          }
        }
      });

      await recordActivity(
        {
          tenantId,
          userId,
          entityType: 'Task',
          entityId: id,
          action: 'Updated',
          details: {
            title: updated.title,
            changes: {
              title: title !== undefined && title !== currentTask.title ? { old: currentTask.title, new: title } : undefined,
              priority: priority !== undefined && priority !== currentTask.priority ? { old: currentTask.priority, new: priority } : undefined
            }
          }
        },
        tx
      );

      return updated;
    });

    broadcastToTenant(tenantId, 'task:updated', { task: updatedTask });

    res.json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    next(error);
  }
}

async function moveTask(req, res, next) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const userId = req.user.id;

    const parsed = moveTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors
      });
    }

    const { destinationColumnId, newPosition, expectedVersion } = parsed.data;

    // Check task in active tenant
    const currentTask = await prisma.task.findFirst({
      where: { id, tenantId },
      include: { column: true }
    });

    if (!currentTask) {
      return res.status(404).json({
        success: false,
        error: 'Task not found in active tenant'
      });
    }

    // Verify destination column belongs to active tenant
    const destColumn = await prisma.column.findFirst({
      where: { id: destinationColumnId, tenantId }
    });

    if (!destColumn) {
      return res.status(400).json({
        success: false,
        error: 'Destination column not found in active tenant'
      });
    }

    // Optimistic Concurrency Control Check
    if (expectedVersion !== undefined && currentTask.version !== expectedVersion) {
      return res.status(409).json({
        success: false,
        error: `Conflict detected: Task was moved or modified concurrently. (Server version: ${currentTask.version}, your version: ${expectedVersion})`,
        conflict: true,
        currentVersion: currentTask.version,
        serverTask: currentTask
      });
    }

    const sourceColumnId = currentTask.columnId;
    const oldPosition = currentTask.position;
    const isSameColumn = sourceColumnId === destinationColumnId;

    const updatedTask = await prisma.$transaction(async (tx) => {
      if (isSameColumn) {
        // Reordering within same column
        if (oldPosition < newPosition) {
          // Moved down: shift intervening items up
          await tx.task.updateMany({
            where: {
              columnId: sourceColumnId,
              tenantId,
              position: { gt: oldPosition, lte: newPosition }
            },
            data: { position: { decrement: 1 } }
          });
        } else if (oldPosition > newPosition) {
          // Moved up: shift intervening items down
          await tx.task.updateMany({
            where: {
              columnId: sourceColumnId,
              tenantId,
              position: { gte: newPosition, lt: oldPosition }
            },
            data: { position: { increment: 1 } }
          });
        }
      } else {
        // Moving across different columns
        // 1. Close gap in source column
        await tx.task.updateMany({
          where: {
            columnId: sourceColumnId,
            tenantId,
            position: { gt: oldPosition }
          },
          data: { position: { decrement: 1 } }
        });

        // 2. Make space in destination column
        await tx.task.updateMany({
          where: {
            columnId: destinationColumnId,
            tenantId,
            position: { gte: newPosition }
          },
          data: { position: { increment: 1 } }
        });
      }

      // Update target task
      const moved = await tx.task.update({
        where: { id },
        data: {
          columnId: destinationColumnId,
          position: newPosition,
          version: { increment: 1 }
        },
        include: {
          assignee: {
            select: { id: true, name: true, email: true }
          },
          column: {
            select: { id: true, name: true, position: true }
          }
        }
      });

      await recordActivity(
        {
          tenantId,
          userId,
          entityType: 'Task',
          entityId: id,
          action: 'Moved',
          details: {
            title: moved.title,
            fromColumn: currentTask.column.name,
            toColumn: destColumn.name,
            oldPosition,
            newPosition
          }
        },
        tx
      );

      return moved;
    });

    // Broadcast live event to all connected clients in the tenant room
    broadcastToTenant(tenantId, 'task:moved', {
      taskId: id,
      sourceColumnId,
      destinationColumnId,
      oldPosition,
      newPosition,
      task: updatedTask
    });

    res.json({
      success: true,
      message: 'Task moved successfully',
      data: updatedTask
    });
  } catch (error) {
    next(error);
  }
}

async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId;
    const userId = req.user.id;

    const task = await prisma.task.findFirst({
      where: { id, tenantId },
      include: { column: true }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found in active tenant'
      });
    }

    await prisma.$transaction(async (tx) => {
      // Reorder remaining tasks in the column
      await tx.task.updateMany({
        where: {
          columnId: task.columnId,
          tenantId,
          position: { gt: task.position }
        },
        data: { position: { decrement: 1 } }
      });

      await tx.task.delete({ where: { id } });

      await recordActivity(
        {
          tenantId,
          userId,
          entityType: 'Task',
          entityId: id,
          action: 'Deleted',
          details: { title: task.title, column: task.column.name }
        },
        tx
      );
    });

    broadcastToTenant(tenantId, 'task:deleted', {
      taskId: id,
      columnId: task.columnId,
      position: task.position
    });

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  updateTask,
  moveTask,
  deleteTask
};
