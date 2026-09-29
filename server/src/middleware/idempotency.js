const { getRedis } = require('../config/redis');

/**
 * Idempotency middleware.
 * Prevents duplicate mutations by caching results keyed by Idempotency-Key header.
 * 
 * Flow:
 * 1. Client sends Idempotency-Key header on POST/PUT/PATCH/DELETE
 * 2. Server checks Redis for existing result under that key
 * 3. If found, returns cached result (no re-execution)
 * 4. If not found, executes the handler and caches the result
 */
function idempotency(ttlSeconds = 300) {
  return async (req, res, next) => {
    // Only apply to mutating methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    const idempotencyKey = req.headers['idempotency-key'];
    if (!idempotencyKey) {
      return next(); // No key = no idempotency enforcement
    }

    const redis = getRedis();
    const cacheKey = `idempotency:${req.user?.id || 'anon'}:${idempotencyKey}`;

    try {
      // Check if we already have a cached response
      const cached = await redis.get(cacheKey);
      if (cached) {
        const { statusCode, body } = JSON.parse(cached);
        return res.status(statusCode).json(body);
      }

      // Mark as in-progress to prevent concurrent duplicate requests
      const lockKey = `${cacheKey}:lock`;
      const lockAcquired = await redis.set(lockKey, '1', 'EX', 30, 'NX');
      if (!lockAcquired) {
        return res.status(409).json({
          error: 'Request is already being processed',
          code: 'DUPLICATE_IN_PROGRESS',
        });
      }

      // Intercept res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis
            .setex(cacheKey, ttlSeconds, JSON.stringify({
              statusCode: res.statusCode,
              body,
            }))
            .catch((err) => console.error('Idempotency cache error:', err));
        }
        // Release lock
        redis.del(lockKey).catch(() => {});
        return originalJson(body);
      };

      next();
    } catch (err) {
      // If Redis is down, proceed without idempotency
      console.error('Idempotency middleware error:', err.message);
      next();
    }
  };
}

module.exports = { idempotency };
