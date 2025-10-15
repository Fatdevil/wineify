import type { RequestHandler } from 'express';
import { prisma } from '../lib/prisma';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const buildEventType = (req: Parameters<RequestHandler>[0], override?: string): string => {
  if (override && override.trim().length > 0) {
    return override;
  }

  const method = req.method?.toUpperCase() ?? 'UNKNOWN';
  const segments: string[] = [method];

  if (req.baseUrl) {
    segments.push(req.baseUrl);
  }

  if (typeof req.route?.path === 'string') {
    segments.push(req.route.path);
  }

  return segments
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const audit: RequestHandler = (req, res, next) => {
  res.on('finish', async () => {
    if (!WRITE_METHODS.has((req.method ?? '').toUpperCase())) {
      return;
    }

    if (res.statusCode >= 400) {
      return;
    }

    const eventType = buildEventType(req, res.locals.audit?.eventType);
    const targetId = res.locals.audit?.targetId ?? (typeof req.params?.id === 'string' ? req.params.id : null);
    const meta = res.locals.audit?.meta;

    try {
      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          eventType,
          targetId: targetId ?? undefined,
          ip: req.ip,
          meta: meta ?? undefined,
        },
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        // eslint-disable-next-line no-console
        console.error('Failed to write audit log entry', error);
      }
    }
  });

  next();
};
