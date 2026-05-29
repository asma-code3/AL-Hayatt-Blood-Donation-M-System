import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { env } from '../config/env.js';
import { ROLES } from '../constants/blood.js';
import { requireRole } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { nextModelNumericId } from '../utils/id.js';
import { writeAuditLog } from '../utils/audit.js';
import { badRequest, notFound } from '../utils/http.js';
import { assertRole, assertStrongPassword, assertUsername } from '../utils/validation.js';

const router = Router();

router.use(requireRole(ROLES.ADMINISTRATOR));

router.get('/', async (_req, res) => {
  const users = await User.find().select({ _id: 0, id: 1, username: 1, role: 1 }).sort({ id: 1 }).lean();
  res.json({ success: true, data: users });
});

router.post('/', async (req, res, next) => {
  try {
    const username = assertUsername(req.body.username);
    const password = assertStrongPassword(req.body.password);
    const role = assertRole(req.body.role);

    const existingUser = await User.exists({ username });
    if (existingUser) {
      throw badRequest('Username already exists.');
    }

    const newUser = {
      id: await nextModelNumericId(User),
      username,
      passwordHash: await bcrypt.hash(password, 10),
      role,
    };

    await User.create(newUser);
    await writeAuditLog({
      actorUsername: req.user.username,
      actorRole: req.user.role,
      action: 'create',
      entityType: 'user',
      entityId: newUser.username,
      message: `User ${newUser.username} was created by admin.`,
      metadata: { role: newUser.role },
    });

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:username/role', async (req, res, next) => {
  try {
    const username = String(req.params.username || '').trim().toLowerCase();
    const role = assertRole(req.body.role);

    const user = await User.findOne({ username });
    if (!user) {
      throw notFound('User not found.');
    }

    if (username === env.adminUsername && role !== 'Administrator') {
      throw badRequest('Default admin account must remain Administrator.');
    }

    user.role = role;
    await user.save();
    await writeAuditLog({
      actorUsername: req.user.username,
      actorRole: req.user.role,
      action: 'update-role',
      entityType: 'user',
      entityId: user.username,
      message: `User ${user.username} role changed to ${user.role}.`,
      metadata: { role: user.role },
    });

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:username/password', async (req, res, next) => {
  try {
    const username = String(req.params.username || '').trim().toLowerCase();
    const password = assertStrongPassword(req.body.password);

    const user = await User.findOne({ username });
    if (!user) {
      throw notFound('User not found.');
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    await writeAuditLog({
      actorUsername: req.user.username,
      actorRole: req.user.role,
      action: 'reset-password',
      entityType: 'user',
      entityId: user.username,
      message: `Password was reset for ${user.username}.`,
    });

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:username', async (req, res, next) => {
  try {
    const username = String(req.params.username || '').trim().toLowerCase();
    if (username === env.adminUsername) {
      throw badRequest('Default admin account cannot be removed.');
    }

    const user = await User.findOne({ username });
    if (!user) {
      throw notFound('User not found.');
    }

    await User.deleteOne({ username });
    await writeAuditLog({
      actorUsername: req.user.username,
      actorRole: req.user.role,
      action: 'delete',
      entityType: 'user',
      entityId: username,
      message: `User ${username} was deleted by admin.`,
    });

    res.json({ success: true, message: 'User removed successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
