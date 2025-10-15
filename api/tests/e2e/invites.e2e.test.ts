import type { Express } from 'express';
import { EventRole, Role } from '@prisma/client';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPrismaClient } from '../utils/testPrismaClient';

const prismaMock = createTestPrismaClient({
  users: [
    { id: 'user-admin', email: 'admin@example.com' },
    { id: 'user-member', email: 'member@example.com' },
    { id: 'user-extra', email: 'extra@example.com' },
  ],
  events: [
    { id: 'event-1', name: 'Championship', description: 'Season event', subCompetitionIds: [], participantIds: [] },
  ],
  memberships: [
    {
      id: 'membership-1',
      eventId: 'event-1',
      userId: 'user-admin',
      role: EventRole.ADMIN,
      createdAt: new Date('2024-01-01T00:00:00Z'),
    },
  ],
  bets: [],
  settlements: [],
});

vi.mock('../../src/lib/prisma', () => ({
  prisma: prismaMock.prisma,
}));

let app: Express;
let signAccessToken: typeof import('../../src/services/auth.service').signAccessToken;

beforeAll(async () => {
  ({ signAccessToken } = await import('../../src/services/auth.service'));
  ({ app } = await import('../../src/app'));
});

beforeEach(() => {
  prismaMock.reset();
  prismaMock.state.users.push(
    { id: 'user-admin', email: 'admin@example.com' },
    { id: 'user-member', email: 'member@example.com' },
    { id: 'user-extra', email: 'extra@example.com' },
  );
  prismaMock.state.events.push({ id: 'event-1', name: 'Championship', description: 'Season event', subCompetitionIds: [], participantIds: [] });
  prismaMock.state.memberships.push({
    id: 'membership-1',
    eventId: 'event-1',
    userId: 'user-admin',
    role: EventRole.ADMIN,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  });
});

describe('Event invites flow', () => {
  it('allows admins to create invites and members to join', async () => {
    const agent = request(app);
    const adminToken = signAccessToken({ sub: 'user-admin', role: Role.USER });
    const memberToken = signAccessToken({ sub: 'user-member', role: Role.USER });

    const createResponse = await agent
      .post('/events/event-1/invites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ maxUses: 1 });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.inviteCode).toBeDefined();
    expect(createResponse.body.inviteId).toBeDefined();

    const joinResponse = await agent
      .post('/invites/join')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ inviteCode: createResponse.body.inviteCode });

    expect(joinResponse.status).toBe(200);
    expect(joinResponse.body.membership.eventId).toBe('event-1');

    const membersResponse = await agent
      .get('/events/event-1/members')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(membersResponse.status).toBe(200);
    const membershipIds = prismaMock.state.memberships.map((membership) => membership.userId);
    expect(membershipIds).toContain('user-member');
  });

  it('enforces max uses and revoked invites', async () => {
    const agent = request(app);
    const adminToken = signAccessToken({ sub: 'user-admin', role: Role.USER });
    const memberToken = signAccessToken({ sub: 'user-member', role: Role.USER });
    const extraToken = signAccessToken({ sub: 'user-extra', role: Role.USER });

    const createResponse = await agent
      .post('/events/event-1/invites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ maxUses: 1 });

    expect(createResponse.status).toBe(201);
    const inviteCode = createResponse.body.inviteCode as string;

    const firstJoin = await agent
      .post('/invites/join')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ inviteCode });

    expect(firstJoin.status).toBe(200);

    const secondJoin = await agent
      .post('/invites/join')
      .set('Authorization', `Bearer ${extraToken}`)
      .send({ inviteCode });

    expect(secondJoin.status).toBe(429);

    const createRevoke = await agent
      .post('/events/event-1/invites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    const lastInvite = prismaMock.state.invites[prismaMock.state.invites.length - 1];
    const revokeResponse = await agent
      .post(`/invites/${createRevoke.body.inviteId ?? lastInvite?.id}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(revokeResponse.status).toBe(200);

    const attemptAfterRevoke = await agent
      .post('/invites/join')
      .set('Authorization', `Bearer ${extraToken}`)
      .send({ inviteCode: createRevoke.body.inviteCode ?? inviteCode });

    expect(attemptAfterRevoke.status).toBeGreaterThanOrEqual(400);
  });
});
