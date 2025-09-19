import jwt, { JwtPayload } from 'jsonwebtoken';
import { env } from '../../config/env';

export const JWT_ALGORITHM = 'HS256';
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

export interface AuthTokenPayload {
  sub: string;
  role: string;
  exp: number;
}

export const createAuthToken = (subject: string, role: string): string => {
  if (!subject) {
    throw new Error('Token subject is required.');
  }

  if (!role) {
    throw new Error('Token role is required.');
  }

  const payload: AuthTokenPayload = {
    sub: subject,
    role,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    noTimestamp: true,
  });
};

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET, {
    algorithms: [JWT_ALGORITHM],
  });

  if (typeof decoded === 'string') {
    throw new Error('Unexpected token payload.');
  }

  const payload = decoded as JwtPayload;

  const { sub, role, exp } = payload;

  if (typeof sub !== 'string' || typeof role !== 'string' || typeof exp !== 'number') {
    throw new Error('Invalid token payload.');
  }

  return { sub, role, exp };
};
