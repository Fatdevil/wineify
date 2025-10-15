import type { Express } from 'express';
import { Role } from '@prisma/client';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPrismaClient } from '../utils/testPrismaClient';

const prismaMock = createTestPrismaClient({
  users: [
    { id: 'admin-1', email: 'admin@example.com', role: Role.ADMIN, createdAt: new Date('2024-01-01T00:00:00Z') },
    { id: 'user-1', email: 'user@example.com', role: Role.USER, createdAt: new Date('2024-01-02T00:00:00Z') },
  ],
  sessions: [
    {
      id: 'session-1',
      userId: 'user-1',
      refreshHash: 'hash',
      userAgent: 'vitest',
      ip: '127.0.0.1',
      createdAt: new Date('2024-01-03T00:00:00Z'),
      revokedAt: null,
    },
  ],
});

vi.mock('../../src/lib/prisma', () => ({
  prisma: prismaMock.prisma,
}));

let app: Express;
let signAccessToken: typeof import('../../src/services/auth.service').signAccessToken;

beforeAll(async () => {
  ({ app } = await import('../../src/app'));
  ({ signAccessToken } = await import('../../src/services/auth.service'));
});

beforeEach(() => {
  prismaMock.reset();
  prismaMock.state.users.push(
    { id: 'admin-1', email: 'admin@example.com', role: Role.ADMIN, isBanned: false, createdAt: new Date('2024-01-01T00:00:00Z') },
    { id: 'user-1', email: 'user@example.com', role: Role.USER, isBanned: false, createdAt: new Date('2024-01-02T00:00:00Z') },
  );
  prismaMock.state.sessions.push({
    id: 'session-1',
    userId: 'user-1',
    refreshHash: 'hash',
    userAgent: 'vitest',
    ip: '127.0.0.1',
    createdAt: new Date('2024-01-03T00:00:00Z'),
    revokedAt: null,
  });
  prismaMock.state.auditLogs = [];
});

describe('Admin console endpoints', () => {
  it('restricts admin APIs to ADMIN role', async () => {
    const adminToken = signAccessToken({ sub: 'admin-1', role: Role.ADMIN });
    const userToken = signAccessToken({ sub: 'user-1', role: Role.USER });

    const forbidden = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${userToken}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    expect(Array.isArray(allowed.body.users)).toBe(true);
    expect(allowed.body.users).toHaveLength(2);
  });

  it('allows banning and unbanning accounts with audit trail', async () => {
    const adminToken = signAccessToken({ sub: 'admin-1', role: Role.ADMIN });

    const banResponse = await request(app)
      .post('/admin/users/user-1/ban')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(banResponse.status).toBe(200);
    expect(banResponse.body.user.isBanned).toBe(true);
    expect(prismaMock.state.users.find((user) => user.id === 'user-1')?.isBanned).toBe(true);
    expect(prismaMock.state.sessions[0].revokedAt).not.toBeNull();

    const auditAfterBan = await request(app)
      .get('/admin/audit?limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(auditAfterBan.status).toBe(200);
    expect(auditAfterBan.body.logs.some((log: any) => log.eventType === 'admin:user:ban')).toBe(true);

    const unbanResponse = await request(app)
      .post('/admin/users/user-1/unban')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(unbanResponse.status).toBe(200);
    expect(unbanResponse.body.user.isBanned).toBe(false);

    const auditAfterUnban = prismaMock.state.auditLogs.filter((log) => log.targetId === 'user-1');
    expect(auditAfterUnban.some((log) => log.eventType === 'admin:user:unban')).toBe(true);
  });
});
