import type { Express } from 'express';
import { Role } from '@prisma/client';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPrismaClient } from '../utils/testPrismaClient';

const prismaMock = createTestPrismaClient({
  users: [
    { id: 'audit-user', email: 'audit@example.com', role: Role.USER, createdAt: new Date('2024-01-01T00:00:00Z') },
  ],
  notifications: [
    { id: 'notif-1', userId: 'audit-user', type: 'INFO', payload: {}, readAt: null, createdAt: new Date('2024-01-01T01:00:00Z') },
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
  prismaMock.state.users.push({
    id: 'audit-user',
    email: 'audit@example.com',
    role: Role.USER,
    isBanned: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  });
  prismaMock.state.notifications.push({
    id: 'notif-1',
    userId: 'audit-user',
    type: 'INFO',
    payload: {},
    readAt: null,
    createdAt: new Date('2024-01-01T01:00:00Z'),
  });
  prismaMock.state.auditLogs = [];
});

describe('Audit logging middleware', () => {
  it('captures protected mutations with event metadata', async () => {
    const token = signAccessToken({ sub: 'audit-user', role: Role.USER });

    const response = await request(app)
      .post('/notifications/notif-1/read')
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(response.status).toBe(200);
    expect(prismaMock.state.auditLogs.length).toBeGreaterThan(0);

    const logs = prismaMock.state.auditLogs;
    const entry = logs[logs.length - 1];
    expect(entry?.eventType).toBe('notifications:mark-read');
    expect(entry?.userId).toBe('audit-user');
    expect(entry?.targetId).toBe('notif-1');
  });
});
