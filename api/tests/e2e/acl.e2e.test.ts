import type { Express } from 'express';
import { EventRole, Role } from '@prisma/client';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPrismaClient } from '../utils/testPrismaClient';

type ResultsModule = typeof import('../../src/modules/results/results.service');

const prismaMock = createTestPrismaClient({
  users: [
    { id: 'user-admin', email: 'admin@example.com' },
    { id: 'user-member', email: 'member@example.com' },
    { id: 'user-outsider', email: 'outsider@example.com' },
  ],
  events: [
    { id: 'event-1', name: 'Private League', description: null, subCompetitionIds: ['sub-1'], participantIds: [] },
  ],
  subCompetitions: [
    { id: 'sub-1', eventId: 'event-1', name: 'Week 1' },
  ],
  memberships: [
    { id: 'membership-1', eventId: 'event-1', userId: 'user-admin', role: EventRole.ADMIN, createdAt: new Date('2024-01-01') },
    { id: 'membership-2', eventId: 'event-1', userId: 'user-member', role: EventRole.MEMBER, createdAt: new Date('2024-01-02') },
  ],
  participants: [],
  bets: [],
  settlements: [],
});

vi.mock('../../src/lib/prisma', () => ({
  prisma: prismaMock.prisma,
}));

const recordResultMock = vi.fn<ResultsModule['recordResult']>().mockResolvedValue({
  eventId: 'event-1',
  resultId: 'result-1',
  totalPool: 0,
  payouts: [],
  settlements: [],
} as Awaited<ReturnType<ResultsModule['recordResult']>>);

vi.mock('../../src/modules/results/results.service', () => ({
  __esModule: true,
  recordResult: recordResultMock,
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
    { id: 'user-outsider', email: 'outsider@example.com' },
  );
  prismaMock.state.events.push({ id: 'event-1', name: 'Private League', description: null, subCompetitionIds: ['sub-1'], participantIds: [] });
  prismaMock.state.subCompetitions.push({ id: 'sub-1', eventId: 'event-1', name: 'Week 1' });
  prismaMock.state.memberships.push(
    { id: 'membership-1', eventId: 'event-1', userId: 'user-admin', role: EventRole.ADMIN, createdAt: new Date('2024-01-01') },
    { id: 'membership-2', eventId: 'event-1', userId: 'user-member', role: EventRole.MEMBER, createdAt: new Date('2024-01-02') },
  );
  recordResultMock.mockClear();
});

describe('Event access control', () => {
  it('allows members to view events but blocks outsiders', async () => {
    const agent = request(app);
    const memberToken = signAccessToken({ sub: 'user-member', role: Role.USER });
    const outsiderToken = signAccessToken({ sub: 'user-outsider', role: Role.USER });

    const eventsResponse = await agent.get('/events').set('Authorization', `Bearer ${memberToken}`);
    expect(eventsResponse.status).toBe(200);
    expect(eventsResponse.body.events).toHaveLength(1);

    const blockedResponse = await agent
      .get('/subcompetitions')
      .query({ eventId: 'event-1' })
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(blockedResponse.status).toBe(403);
  });

  it('permits admins to record results and rejects members', async () => {
    const agent = request(app);
    const adminToken = signAccessToken({ sub: 'user-admin', role: Role.USER });
    const memberToken = signAccessToken({ sub: 'user-member', role: Role.USER });

    const adminResponse = await agent
      .post('/results')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subCompetitionId: 'sub-1', winningEntryId: 'participant-1' });

    expect(adminResponse.status).toBe(201);
    expect(recordResultMock).toHaveBeenCalledTimes(1);

    const memberResponse = await agent
      .post('/results')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ subCompetitionId: 'sub-1', winningEntryId: 'participant-1' });

    expect(memberResponse.status).toBe(403);
    expect(recordResultMock).toHaveBeenCalledTimes(1);
  });
});
