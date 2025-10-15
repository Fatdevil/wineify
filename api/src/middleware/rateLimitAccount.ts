import type { RequestHandler } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { notifyMany } from '../services/notify.service';

const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 60;
const ANONYMOUS_LIMIT = 30;
const VIOLATION_WINDOW_MS = 60 * 60 * 1000;

interface RateBucket {
  count: number;
  resetAt: number;
}

interface ViolationBucket {
  count: number;
  windowStart: number;
  notified: boolean;
}

const requestBuckets = new Map<string, RateBucket>();
const violationBuckets = new Map<string, ViolationBucket>();

let cachedAdminRecipients: { ids: string[]; expiresAt: number } | null = null;

const resetState = () => {
  requestBuckets.clear();
  violationBuckets.clear();
  cachedAdminRecipients = null;
};

const getIdentifier = (req: Parameters<RequestHandler>[0]) => {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }

  const ip = req.ip ?? 'unknown';
  return `anon:${ip}`;
};

const getLimit = (req: Parameters<RequestHandler>[0]) => {
  return req.user ? DEFAULT_LIMIT : ANONYMOUS_LIMIT;
};

const acquireBucket = (identifier: string, now: number): RateBucket => {
  const existing = requestBuckets.get(identifier);

  if (!existing || existing.resetAt <= now) {
    const alignedNow = now - (now % WINDOW_MS);
    const bucket: RateBucket = {
      count: 0,
      resetAt: alignedNow + WINDOW_MS,
    };
    requestBuckets.set(identifier, bucket);
    return bucket;
  }

  return existing;
};

const resetViolationBucketIfNeeded = (identifier: string, now: number) => {
  const current = violationBuckets.get(identifier);
  if (!current) {
    return;
  }

  if (now - current.windowStart >= VIOLATION_WINDOW_MS) {
    violationBuckets.set(identifier, { count: 0, windowStart: now, notified: false });
  }
};

const recordViolation = async (
  identifier: string,
  ctx: { userId?: string | null; ip?: string | null },
): Promise<void> => {
  const now = Date.now();
  resetViolationBucketIfNeeded(identifier, now);

  const entry = violationBuckets.get(identifier);

  if (!entry) {
    violationBuckets.set(identifier, { count: 1, windowStart: now, notified: false });
    return;
  }

  entry.count += 1;

  if (entry.count > 3 && !entry.notified) {
    entry.notified = true;
    await notifyAdminsAboutViolation(identifier, entry.count, ctx);
  }
};

const getAdminRecipients = async (): Promise<string[]> => {
  const now = Date.now();

  if (cachedAdminRecipients && cachedAdminRecipients.expiresAt > now) {
    return cachedAdminRecipients.ids;
  }

  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true },
  });

  const ids = admins.map((admin) => admin.id);
  cachedAdminRecipients = {
    ids,
    expiresAt: now + 5 * 60 * 1000,
  };

  return ids;
};

const notifyAdminsAboutViolation = async (
  identifier: string,
  count: number,
  ctx: { userId?: string | null; ip?: string | null },
) => {
  const recipients = await getAdminRecipients();

  if (recipients.length === 0) {
    return;
  }

  await notifyMany(recipients, 'RATE_LIMIT_ALERT', {
    identifier,
    userId: ctx.userId ?? null,
    ip: ctx.ip ?? null,
    violationsLastHour: count,
    occurredAt: new Date().toISOString(),
  });
};

export const rateLimitAccount: RequestHandler = async (req, res, next) => {
  const identifier = getIdentifier(req);
  const now = Date.now();
  const limit = getLimit(req);
  const bucket = acquireBucket(identifier, now);

  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader('Retry-After', retryAfter.toString());
    await recordViolation(identifier, { userId: req.user?.id ?? null, ip: req.ip ?? null });
    return res.status(429).json({ message: 'Too many requests. Please slow down.' });
  }

  return next();
};

export const __resetRateLimitStateForTests = () => {
  if (process.env.NODE_ENV !== 'test') {
    return;
  }

  resetState();
};
