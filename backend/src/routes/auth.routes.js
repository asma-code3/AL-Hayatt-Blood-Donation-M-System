import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ROLES } from '../constants/blood.js';
import { requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rate-limit.js';
import { User } from '../models/User.js';
import { writeAuditLog } from '../utils/audit.js';
import { nextModelNumericId } from '../utils/id.js';
import { badRequest } from '../utils/http.js';
import { assertStrongPassword, assertUsername } from '../utils/validation.js';

const router = Router();

const createToken = (user) =>
  jwt.sign({ userId: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const sanitizeUser = (user) => ({
  id: user.id,
  username: user.username,
  role: user.role,
});

const authLimiter = createRateLimiter({
  key: (req) => `${req.ip}:${String(req.body?.username || '').trim().toLowerCase() || 'anonymous'}`,
  maxAttempts: env.authMaxAttempts,
  windowMs: env.authWindowMinutes * 60 * 1000,
  message: 'Too many authentication attempts. Please wait and try again.',
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const username = assertUsername(req.body.username);
    const password = String(req.body.password || '');
    const selectedRole = String(req.body.role || '').trim();

    if (!password) {
      throw badRequest('Username and password are required.');
    }

    const user = await User.findOne({ username }).lean();

    if (!user) {
      throw badRequest('Invalid username or password.');
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw badRequest('Invalid username or password.');
    }

    if (selectedRole && user.role !== ROLES.ADMINISTRATOR && selectedRole !== user.role) {
      throw badRequest('Selected role does not match this account.');
    }

    await writeAuditLog({
      actorUsername: user.username,
      actorRole: user.role,
      action: 'login',
      entityType: 'auth',
      entityId: user.username,
      message: `${user.username} logged into the system.`,
    });

    res.json({
      success: true,
      token: createToken(user),
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const username = assertUsername(req.body.username);
    const password = assertStrongPassword(req.body.password);

    const user = await User.findOne({ username });
    if (!user) {
      throw badRequest('Account not found for this username.');
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    await writeAuditLog({
      actorUsername: user.username,
      actorRole: user.role,
      action: 'forgot-password',
      entityType: 'auth',
      entityId: user.username,
      message: `${user.username} reset a password through forgot-password flow.`,
    });

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const username = assertUsername(req.body.username);
    const password = assertStrongPassword(req.body.password);
    const requestedRole = req.body.role;
    const registrableRoles = [ROLES.STAFF, ROLES.DOCTOR];
    const role = registrableRoles.includes(requestedRole) ? requestedRole : ROLES.STAFF;

    if (requestedRole && !registrableRoles.includes(requestedRole)) {
      throw badRequest('You can only register a Staff or Doctor account.');
    }

    const existingUser = await User.exists({ username });
    if (existingUser) {
      throw badRequest('Username already exists.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const nextId = await nextModelNumericId(User);
    const newUser = {
      id: nextId,
      username,
      passwordHash,
      role,
    };

    await User.create(newUser);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: sanitizeUser(newUser),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

export default router;
