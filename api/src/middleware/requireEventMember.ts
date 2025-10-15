import type { RequestHandler } from 'express';
import { EventRole } from '@prisma/client';
import { EventAccessError, requireEventRole } from '../services/acl.service';

export type EventIdResolver = (req: Parameters<RequestHandler>[0]) => string | null;

const defaultResolver: EventIdResolver = (req) => {
  const { eventId } = req.params;

  if (typeof eventId === 'string' && eventId.trim().length > 0) {
    return eventId;
  }

  if (typeof req.body?.eventId === 'string') {
    return req.body.eventId;
  }

  if (typeof req.query?.eventId === 'string') {
    return req.query.eventId;
  }

  return null;
};

export const requireEventMember = (resolveEventId: EventIdResolver = defaultResolver): RequestHandler => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: 'Authentication required.' });
    }

    const eventId = resolveEventId(req);

    if (!eventId) {
      return res.status(400).json({ ok: false, message: 'An event identifier is required.' });
    }

    try {
      await requireEventRole(eventId, req.user.id, EventRole.MEMBER);
      return next();
    } catch (error) {
      if (error instanceof EventAccessError) {
        return res.status(error.statusCode).json({ ok: false, message: error.message });
      }

      return next(error);
    }
  };
};

export const requireEventAdmin = (resolveEventId: EventIdResolver = defaultResolver): RequestHandler => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: 'Authentication required.' });
    }

    const eventId = resolveEventId(req);

    if (!eventId) {
      return res.status(400).json({ ok: false, message: 'An event identifier is required.' });
    }

    try {
      await requireEventRole(eventId, req.user.id, EventRole.ADMIN);
      return next();
    } catch (error) {
      if (error instanceof EventAccessError) {
        return res.status(error.statusCode).json({ ok: false, message: error.message });
      }

      return next(error);
    }
  };
};
