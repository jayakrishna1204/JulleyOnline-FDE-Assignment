const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const prisma = require('../config/database');
const { JWT_SECRET } = require('../config/environment');

let io = null;

// Track presence: Map<tenantId, Map<userId, { user: { id, name, email }, count: number }>>
const tenantPresence = new Map();

function initSocket(server, corsOrigin) {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      credentials: true
    }
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          memberships: true
        }
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        memberships: user.memberships
      };

      next();
    } catch (err) {
      next(new Error('Authentication failed: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    socket.currentTenantId = null;

    // Handle tenant room join with strict authorization
    socket.on('tenant:join', async ({ tenantId }, callback) => {
      try {
        if (!tenantId) {
          if (callback) callback({ success: false, error: 'Tenant ID required' });
          return;
        }

        // Verify that user has access to this tenant
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId }
        });

        if (!tenant) {
          if (callback) callback({ success: false, error: 'Tenant not found' });
          return;
        }

        const isDirectMember = user.memberships.some((m) => m.tenantId === tenantId);
        const isOrgAdmin = user.memberships.some(
          (m) => m.organizationId === tenant.organizationId && m.role === 'Org Admin'
        );

        if (!isDirectMember && !isOrgAdmin) {
          if (callback) callback({ success: false, error: 'Unauthorized tenant access' });
          return;
        }

        // Leave previous tenant room if any
        if (socket.currentTenantId && socket.currentTenantId !== tenantId) {
          leaveTenantPresence(socket.currentTenantId, user.id);
          socket.leave(`tenant:${socket.currentTenantId}`);
        }

        // Join tenant room
        socket.currentTenantId = tenantId;
        socket.join(`tenant:${tenantId}`);

        // Update presence
        addTenantPresence(tenantId, user);
        emitPresenceUpdate(tenantId);

        if (callback) callback({ success: true, message: `Joined tenant room: ${tenantId}` });
      } catch (err) {
        console.error('Error joining tenant room:', err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Handle explicit tenant leave
    socket.on('tenant:leave', ({ tenantId }) => {
      if (tenantId) {
        leaveTenantPresence(tenantId, user.id);
        socket.leave(`tenant:${tenantId}`);
        emitPresenceUpdate(tenantId);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (socket.currentTenantId) {
        leaveTenantPresence(socket.currentTenantId, user.id);
        emitPresenceUpdate(socket.currentTenantId);
      }
    });
  });

  return io;
}

function addTenantPresence(tenantId, user) {
  if (!tenantPresence.has(tenantId)) {
    tenantPresence.set(tenantId, new Map());
  }
  const usersMap = tenantPresence.get(tenantId);
  if (usersMap.has(user.id)) {
    const existing = usersMap.get(user.id);
    existing.count += 1;
  } else {
    usersMap.set(user.id, {
      user: { id: user.id, name: user.name, email: user.email },
      count: 1
    });
  }
}

function leaveTenantPresence(tenantId, userId) {
  if (tenantPresence.has(tenantId)) {
    const usersMap = tenantPresence.get(tenantId);
    if (usersMap.has(userId)) {
      const existing = usersMap.get(userId);
      existing.count -= 1;
      if (existing.count <= 0) {
        usersMap.delete(userId);
      }
    }
    if (usersMap.size === 0) {
      tenantPresence.delete(tenantId);
    }
  }
}

function emitPresenceUpdate(tenantId) {
  if (!io) return;
  const usersMap = tenantPresence.get(tenantId);
  const onlineUsers = usersMap
    ? Array.from(usersMap.values()).map((item) => item.user)
    : [];

  io.to(`tenant:${tenantId}`).emit('presence:update', {
    tenantId,
    onlineUsers,
    count: onlineUsers.length
  });
}

function broadcastToTenant(tenantId, event, data) {
  if (io && tenantId) {
    io.to(`tenant:${tenantId}`).emit(event, data);
  }
}

function getIo() {
  return io;
}

module.exports = {
  initSocket,
  broadcastToTenant,
  getIo
};
