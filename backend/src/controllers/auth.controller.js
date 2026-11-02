const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../config/database');
const { JWT_SECRET } = require('../config/environment');

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  organizationId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  role: z.enum(['Org Admin', 'Tenant Admin', 'Member']).optional().default('Member')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

async function register(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors
      });
    }

    const { name, email, password, organizationId, tenantId, role } = parsed.data;

    // Check existing email
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and optional membership in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash
        }
      });

      if (organizationId) {
        await tx.membership.create({
          data: {
            userId: newUser.id,
            organizationId,
            tenantId: tenantId || null,
            role: role || 'Member'
          }
        });
      }

      return newUser;
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors
      });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
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
        error: 'Invalid email or password'
      });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        memberships: user.memberships
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        memberships: {
          include: {
            organization: true,
            tenant: true
          }
        }
      }
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        memberships: user.memberships
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getDemoUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      include: {
        memberships: {
          include: {
            organization: true,
            tenant: true
          }
        }
      }
    });

    res.json({
      success: true,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        password: 'Password123!',
        memberships: u.memberships.map((m) => ({
          role: m.role,
          organization: m.organization?.name,
          tenant: m.tenant?.name
        }))
      }))
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getMe,
  getDemoUsers
};
