import test from 'node:test';
import assert from 'node:assert/strict';
import { clearRateLimiterBuckets, createRateLimiter } from './rate-limit.js';

test('rate limiter allows requests until the configured threshold', () => {
  clearRateLimiterBuckets();
  const limiter = createRateLimiter({
    key: () => 'test-user',
    maxAttempts: 2,
    windowMs: 60_000,
    message: 'blocked',
  });

  const nextErrors = [];
  const next = (error) => nextErrors.push(error || null);

  limiter({ ip: '127.0.0.1' }, {}, next);
  limiter({ ip: '127.0.0.1' }, {}, next);
  limiter({ ip: '127.0.0.1' }, {}, next);

  assert.equal(nextErrors[0], null);
  assert.equal(nextErrors[1], null);
  assert.equal(nextErrors[2].message, 'blocked');
});
