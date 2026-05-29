import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { forbidden, unauthorized } from '../utils/http.js';

export const requireAuth = (req, _res, next) => {
  (async () => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      throw unauthorized();
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findOne({ id: payload.userId }).select({ id: 1, username: 1, role: 1, _id: 0 }).lean();

    if (!user) {
      throw unauthorized('User not found.');
    }

    req.user = user;
    return next();
  })().catch(() => next(unauthorized('Invalid or expired token.')));
};

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) {
    return next(unauthorized());
  }

  if (!roles.includes(req.user.role)) {
    return next(forbidden());
  }

  return next();
};
