import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { AuditLog } from '../models/AuditLog.js';

const router = Router();

router.use(requireRole('Administrator'));

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 250);
    const logs = await AuditLog.find()
      .sort({ createdAt: -1, id: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

export default router;
