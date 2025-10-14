import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { PrismaClient, Session } from '@prisma/client';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

interface PrismaContext {
  prisma?: PrismaClient;
}

interface RequestContext extends PrismaContext {
  userAgent?: string;
  ip?: string;
}

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

const getClient = (ctx?: PrismaContext): PrismaClient => ctx?.prisma ?? prisma;

export const hashPassword = async (plain: string): Promise<string> => {
  return bcrypt.hash(plain, env.BCRYPT_ROUNDS);
};

export const verifyPassword = async (plain: string, hash: string): Promise<boolean> => {
  if (!hash) {
    return false;
  }

  return bcrypt.compare(plain, hash);
};

export const signAccessToken = ({ sub, role }: { sub: string; role: Role }): string => {
  if (!sub) {
    throw new Error('Access token subject is required.');
  }

  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: env.JWT_ACCESS_TTL.seconds,
  };

  return jwt.sign({ sub, role }, env.JWT_SECRET, options);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
  });

  const payload = decoded as JwtPayload;
  const { sub, role } = payload;

  if (typeof sub !== 'string' || typeof role !== 'string') {
    throw new Error('Invalid access token payload.');
  }

  if (!Object.values(Role).includes(role as Role)) {
    throw new Error('Invalid access token role.');
  }

  return { sub, role: role as Role };
};

const generateRefreshTokenValue = (): string => {
  return crypto.randomBytes(48).toString('base64url');
};

const formatRefreshToken = (sessionId: string, token: string): string => `${sessionId}.${token}`;

const splitRefreshToken = (token: string): { sessionId: string; value: string } => {
  const [sessionId, value] = token.split('.');

  if (!sessionId || !value) {
    throw new Error('Invalid refresh token.');
  }

  return { sessionId, value };
};

function ensureSessionActive(session: Session | null): asserts session is Session {
  if (!session) {
    throw new Error('Refresh token is invalid.');
  }

  if (session.revokedAt) {
    throw new Error('Refresh token has been revoked.');
  }
}

export const mintRefreshToken = async (
  userId: string,
  ctx?: RequestContext,
): Promise<{ refreshToken: string; session: Session }> => {
  const client = getClient(ctx);
  const value = generateRefreshTokenValue();
  const refreshHash = await bcrypt.hash(value, env.BCRYPT_ROUNDS);

  const session = await client.session.create({
    data: {
      userId,
      refreshHash,
      userAgent: ctx?.userAgent,
      ip: ctx?.ip,
    },
  });

  return {
    refreshToken: formatRefreshToken(session.id, value),
    session,
  };
};

export const verifyRefreshToken = async (
  token: string,
  userId?: string,
  ctx?: PrismaContext,
): Promise<Session> => {
  const client = getClient(ctx);
  const { sessionId, value } = splitRefreshToken(token);

  const sessionRecord = await client.session.findUnique({ where: { id: sessionId } });

  ensureSessionActive(sessionRecord);

  const session: Session = sessionRecord;

  const expiresAt = session.createdAt.getTime() + env.JWT_REFRESH_TTL.milliseconds;

  if (Date.now() >= expiresAt) {
    await client.session.update({
      where: { id: session.id },
      data: { revokedAt: session.revokedAt ?? new Date() },
    });

    throw new Error('Refresh token has expired.');
  }

  if (userId && session.userId !== userId) {
    throw new Error('Refresh token does not belong to this user.');
  }

  const matches = await bcrypt.compare(value, session.refreshHash);

  if (!matches) {
    throw new Error('Refresh token is invalid.');
  }

  return session;
};

export const rotateRefreshToken = async (
  oldToken: string,
  userId: string,
  ctx?: RequestContext,
): Promise<{ refreshToken: string; session: Session }> => {
  const client = getClient(ctx);
  const session = await verifyRefreshToken(oldToken, userId, { prisma: client });

  await client.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  return mintRefreshToken(userId, ctx ? { ...ctx, prisma: client } : { prisma: client });
};

export const revokeSession = async (sessionId: string, ctx?: PrismaContext): Promise<void> => {
  const client = getClient(ctx);

  await client.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const revokeAll = async (userId: string, ctx?: PrismaContext): Promise<void> => {
  const client = getClient(ctx);

  await client.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
