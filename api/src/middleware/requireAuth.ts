import type { RequestHandler } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken } from '../services/auth.service';

const getTokenFromHeader = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  const [scheme, token] = value.split(' ');

  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
};

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = getTokenFromHeader(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired access token.' });
  }
};

export const requireRole = (role: Role): RequestHandler => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (req.user.role !== role && req.user.role !== Role.ADMIN) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    return next();
  };
};
