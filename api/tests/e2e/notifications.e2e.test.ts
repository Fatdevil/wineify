import type { Express } from 'express';
import { EventRole, Role, SettlementStatus } from '@prisma/client';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPrismaClient } from '../utils/testPrismaClient';

const prismaMock = createTestPrismaClient({
  users: [
    { id: 'user-admin', email: 'admin@example.com' },
    { id: 'user-one', email: 'one@example.com' },
    { id: 'user-two', email: 'two@example.com' },
  ],
  events: [
    { id: 'event-1', name: 'Cup', description: null, subCompetitionIds: ['sub-1'], participantIds: [] },
  ],
  subCompetitions: [
    { id: 'sub-1', eventId: 'event-1', name: 'Match 1' },
  ],
  memberships: [
    { id: 'mem-1', eventId: 'event-1', userId: 'user-admin', role: EventRole.ADMIN, createdAt: new Date('2024-01-01') },
    { id: 'mem-2', eventId: 'event-1', userId: 'user-one', role: EventRole.MEMBER, createdAt: new Date('2024-01-02') },
    { id: 'mem-3', eventId: 'event-1', userId: 'user-two', role: EventRole.MEMBER, createdAt: new Date('2024-01-03') },
  ],
  bets: [
    { id: 'bet-1', userId: 'user-one', eventId: 'event-1', subCompetitionId: 'sub-1' },
  ],
  settlements: [
    { id: 'settlement-1', betId: 'bet-1', status: SettlementStatus.PENDING, settledAt: null },
  ],
});

vi.mock('../../src/lib/prisma', () => ({
  prisma: prismaMock.prisma,
}));

vi.mock('../../src/modules/results/results.service', async (original) => {
  const actual = await original();
  return {
    ...actual,
    recordResult: vi.fn().mockResolvedValue({
      eventId: 'event-1',
      resultId: 'result-1',
      totalPool: 0,
      payouts: [],
      settlements: [],
    }),
  };
});

vi.mock('../../src/modules/settlements/settlements.service', async (original) => {
  const actual = await original();
  return {
    ...actual,
    generateSettlements: vi.fn().mockResolvedValue({
      eventId: 'event-1',
      totalPool: 0,
      payouts: [
        { userId: 'user-one', subCompetitionId: 'sub-1', resultId: 'result-1' },
        { userId: 'user-two', subCompetitionId: 'sub-1', resultId: 'result-1' },
      ],
      settlements: [],
    }),
  };
});

vi.mock('../../src/services/stats.service', async (original) => {
  const actual = await original();
  return {
    ...actual,
    updateStatsForSettlement: vi.fn().mockResolvedValue({ id: 'stats-1', userId: 'user-one' } as any),
    getUserStats: vi.fn().mockResolvedValue({ userId: 'user-one', totalWins: 0 } as any),
  };
});

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
    { id: 'user-one', email: 'one@example.com' },
    { id: 'user-two', email: 'two@example.com' },
  );
  prismaMock.state.events.push({ id: 'event-1', name: 'Cup', description: null, subCompetitionIds: ['sub-1'], participantIds: [] });
  prismaMock.state.subCompetitions.push({ id: 'sub-1', eventId: 'event-1', name: 'Match 1' });
  prismaMock.state.memberships.push(
    { id: 'mem-1', eventId: 'event-1', userId: 'user-admin', role: EventRole.ADMIN, createdAt: new Date('2024-01-01') },
    { id: 'mem-2', eventId: 'event-1', userId: 'user-one', role: EventRole.MEMBER, createdAt: new Date('2024-01-02') },
    { id: 'mem-3', eventId: 'event-1', userId: 'user-two', role: EventRole.MEMBER, createdAt: new Date('2024-01-03') },
  );
  prismaMock.state.bets.push({ id: 'bet-1', userId: 'user-one', eventId: 'event-1', subCompetitionId: 'sub-1' });
  prismaMock.state.settlements.push({ id: 'settlement-1', betId: 'bet-1', status: SettlementStatus.PENDING, settledAt: null });
  prismaMock.state.notifications.length = 0;
});

describe('Notifications integration', () => {
  it('records notifications for results, settlement generation, and receipt', async () => {
    const agent = request(app);
    const adminToken = signAccessToken({ sub: 'user-admin', role: Role.USER });
    const memberToken = signAccessToken({ sub: 'user-one', role: Role.USER });

    const resultResponse = await agent
      .post('/results')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subCompetitionId: 'sub-1', winningEntryId: 'participant-1' });

    expect(resultResponse.status).toBe(201);
    expect(prismaMock.state.notifications.filter((n) => n.type === 'RESULT_POSTED')).toHaveLength(3);

    const settlementsResponse = await agent
      .get('/settlements/events/event-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(settlementsResponse.status).toBe(200);
    expect(prismaMock.state.notifications.filter((n) => n.type === 'SETTLEMENT_GENERATED')).toHaveLength(2);

    const receiptResponse = await agent
      .post('/settlements/settlement-1/mark-received')
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(receiptResponse.status).toBe(200);
    expect(prismaMock.state.notifications.filter((n) => n.type === 'SETTLEMENT_RECEIVED')).not.toHaveLength(0);

    const listResponse = await agent.get('/notifications').set('Authorization', `Bearer ${memberToken}`);
    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body.notifications)).toBe(true);
  });
});
