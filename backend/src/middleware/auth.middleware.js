const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { JWT_SECRET } = require('../config/environment');
const { AppError } = require('../utils/errors');

async function authenticate(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token required'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired authentication token'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        memberships: {
          include: {
            organization: true,
            tenant: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User belonging to this token no longer exists'
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      memberships: user.memberships
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  authenticate
};
