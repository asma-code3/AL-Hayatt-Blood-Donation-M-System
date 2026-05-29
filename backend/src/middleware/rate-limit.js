import { badRequest } from '../utils/http.js';

const buckets = new Map();

const now = () => Date.now();

export const createRateLimiter = ({
  key = (req) => req.ip || 'anonymous',
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000,
  message = 'Too many requests. Please try again later.',
}) => (req, _res, next) => {
  const bucketKey = key(req);
  const currentTime = now();
  const entry = buckets.get(bucketKey);

  if (!entry || currentTime > entry.resetAt) {
    buckets.set(bucketKey, { count: 1, resetAt: currentTime + windowMs });
    return next();
  }

  entry.count += 1;
  if (entry.count > maxAttempts) {
    return next(badRequest(message));
  }

  return next();
};

export const clearRateLimiterBuckets = () => {
  buckets.clear();
};
