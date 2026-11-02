require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-for-collaborative-kanban',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000'
};
