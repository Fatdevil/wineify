'use strict';

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 100;

const now = () => Date.now();

const getKey = (req, res, keyGenerator) => {
  if (typeof keyGenerator === 'function') {
    return keyGenerator(req, res);
  }

  return req.ip || req.connection?.remoteAddress || 'global';
};

const setHeaders = (res, context) => {
  const { limit, remaining, resetTime, standardHeaders, legacyHeaders } = context;
  const resetSeconds = Math.ceil(resetTime / 1000);

  if (standardHeaders) {
    res.setHeader('RateLimit-Limit', limit);
    res.setHeader('RateLimit-Remaining', Math.max(remaining, 0));
    res.setHeader('RateLimit-Reset', resetSeconds);
  }

  if (legacyHeaders) {
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(remaining, 0));
    res.setHeader('X-RateLimit-Reset', resetSeconds);
  }
};

module.exports = function rateLimit(options = {}) {
  const windowMs = Number.isFinite(options.windowMs) && options.windowMs > 0 ? options.windowMs : DEFAULT_WINDOW_MS;
  const limitOption = options.limit ?? options.max ?? DEFAULT_LIMIT;
  const limit = Number.isFinite(limitOption) && limitOption > 0 ? limitOption : DEFAULT_LIMIT;
  const message = options.message ?? 'Too many requests, please try again later.';
  const standardHeaders = options.standardHeaders ?? false;
  const legacyHeaders = options.legacyHeaders ?? true;

  const hits = new Map();

  const resetExpired = () => {
    const timestamp = now();
    for (const [key, entry] of hits) {
      if (entry.resetTime <= timestamp) {
        hits.delete(key);
      }
    }
  };

  return function rateLimitMiddleware(req, res, next) {
    resetExpired();

    const key = getKey(req, res, options.keyGenerator);
    const timestamp = now();
    const entry = hits.get(key);

    if (!entry || entry.resetTime <= timestamp) {
      hits.set(key, { count: 1, resetTime: timestamp + windowMs });
    } else {
      entry.count += 1;
    }

    const record = hits.get(key);
    const remaining = limit - record.count;

    setHeaders(res, {
      limit,
      remaining,
      resetTime: record.resetTime,
      standardHeaders,
      legacyHeaders,
    });

    if (record.count > limit) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - timestamp) / 1000));

      if (typeof options.handler === 'function') {
        return options.handler(req, res, next, options);
      }

      if (typeof message === 'function') {
        return res.status(429).send(message(req, res));
      }

      if (typeof message === 'object') {
        return res.status(429).json(message);
      }

      return res.status(429).send(message);
    }

    return next();
  };
};
