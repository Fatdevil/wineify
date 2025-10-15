import type { Express, RequestHandler } from 'express';
import express from 'express';
import { Role } from '@prisma/client';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPrismaClient } from '../utils/testPrismaClient';

const prismaMock = createTestPrismaClient({
  users: [
    { id: 'rate-user', email: 'rate@example.com', role: Role.USER, createdAt: new Date('2024-01-01T00:00:00Z') },
  ],
});

vi.mock('../../src/lib/prisma', () => ({
  prisma: prismaMock.prisma,
}));

let app: Express;
let rateLimitMiddleware: RequestHandler;
let resetRateLimitState: typeof import('../../src/middleware/rateLimitAccount').__resetRateLimitStateForTests;

beforeAll(async () => {
  ({
    rateLimitAccount: rateLimitMiddleware,
    __resetRateLimitStateForTests: resetRateLimitState,
  } = await import('../../src/middleware/rateLimitAccount'));
});

beforeEach(() => {
  resetRateLimitState?.();
  prismaMock.reset();

  const userId = `rate-user-${Date.now()}`;
  prismaMock.state.users.push({
    id: userId,
    email: 'rate@example.com',
    role: Role.USER,
    isBanned: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  });

  app = express();
  app.use((req, _res, next) => {
    (req as any).user = { id: userId, role: Role.USER };
    next();
  });
  app.use(rateLimitMiddleware);
  app.get('/notifications', (_req, res) => {
    res.status(200).json({ ok: true });
  });
});

describe('Per-account rate limiting', () => {
  it('returns 429 after exceeding the per-minute quota', async () => {
    const agent = request(app);

    for (let i = 0; i < 60; i += 1) {
      const res = await agent.get('/notifications');
      expect(res.status).toBe(200);
    }

    const blocked = await agent.get('/notifications');

    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
  });
});
