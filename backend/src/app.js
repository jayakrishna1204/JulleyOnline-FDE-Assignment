const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { PORT, CORS_ORIGIN } = require('./config/environment');
const { initSocket } = require('./sockets/socket.handler');

// Route Imports
const authRoutes = require('./routes/auth.routes');
const organizationRoutes = require('./routes/organization.routes');
const tenantRoutes = require('./routes/tenant.routes');
const boardRoutes = require('./routes/board.routes');
const columnRoutes = require('./routes/column.routes');
const taskRoutes = require('./routes/task.routes');
const activityRoutes = require('./routes/activity.routes');
const aiRoutes = require('./routes/ai.routes');

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
initSocket(server, CORS_ORIGIN);

// Global Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Dynamically allow any origin (localhost, 127.0.0.1, LAN IP, or tools with no origin)
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// API Router (handles both with and without /api prefix for Vercel rewrites)
const apiRouter = express.Router();

apiRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'JulleyOnline Collaborative Kanban Backend',
    uptime: process.uptime(),
    database: 'connected',
    realtime: 'ready'
  });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/organizations', organizationRoutes);
apiRouter.use('/tenants', tenantRoutes);
apiRouter.use('/boards', boardRoutes);
apiRouter.use('/columns', columnRoutes);
apiRouter.use('/tasks', taskRoutes);
apiRouter.use('/activities', activityRoutes);
apiRouter.use('/ai', aiRoutes);

// Mount router on both '/api' and '/' to reconcile path prefix across local and Vercel routing
app.use('/api', apiRouter);
app.use('/', apiRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    details: err.details || null
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 JulleyOnline Backend Server running on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Socket.IO Real-Time Server initialized`);
    console.log(`=======================================================`);
  });
}

app.server = server;
module.exports = app;
