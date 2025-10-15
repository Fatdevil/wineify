import type { Express } from 'express';
import { EventRole, Role, SettlementStatus } from '@prisma/client';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestPrismaClient } from '../utils/testPrismaClient';

type ResultsModule = typeof import('../../src/modules/results/results.service');
type SettlementsModule = typeof import('../../src/modules/settlements/settlements.service');
type StatsModule = typeof import('../../src/services/stats.service');

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

const recordResultMock = vi.fn<ResultsModule['recordResult']>().mockResolvedValue({
  eventId: 'event-1',
  resultId: 'result-1',
  totalPool: 0,
  payouts: [],
  settlements: [],
} as Awaited<ReturnType<ResultsModule['recordResult']>>);

const generateSettlementsMock = vi
  .fn<SettlementsModule['generateSettlements']>()
  .mockResolvedValue({
    eventId: 'event-1',
    totalPool: 0,
    payouts: [
      {
        betId: 'bet-1',
        userId: 'user-one',
        subCompetitionId: 'sub-1',
        resultId: 'result-1',
        participantId: 'participant-1',
        isWinner: true,
        stake: 0,
        payout: 0,
      },
      {
        betId: 'bet-2',
        userId: 'user-two',
        subCompetitionId: 'sub-1',
        resultId: 'result-1',
        participantId: 'participant-1',
        isWinner: true,
        stake: 0,
        payout: 0,
      },
    ],
    settlements: [],
  } as Awaited<ReturnType<SettlementsModule['generateSettlements']>>);

const updateStatsForSettlementMock = vi.fn<StatsModule['updateStatsForSettlement']>().mockResolvedValue({
  id: 'stats-1',
  userId: 'user-one',
  totalWins: 0,
  totalLosses: 0,
  totalUnits: 0,
  streak: 0,
  xp: 0,
  level: 1,
  nextLevelXp: 100,
  lastUpdated: new Date('2024-01-01T00:00:00Z'),
} as Awaited<ReturnType<StatsModule['updateStatsForSettlement']>>);

const getUserStatsMock = vi.fn<StatsModule['getUserStats']>().mockResolvedValue({
  userId: 'user-one',
  username: 'user-one@example.com',
  totalWins: 0,
  totalLosses: 0,
  totalUnits: 0,
  streak: 0,
  xp: 0,
  level: 1,
  nextLevelXp: 100,
  xpIntoLevel: 0,
  xpForNextLevel: 100,
  currentLevelFloorXp: 0,
} as Awaited<ReturnType<StatsModule['getUserStats']>>);

vi.mock('../../src/modules/results/results.service', () => ({
  __esModule: true,
  recordResult: recordResultMock,
}));

vi.mock('../../src/modules/settlements/settlements.service', () => ({
  __esModule: true,
  generateSettlements: generateSettlementsMock,
}));

vi.mock('../../src/services/stats.service', () => ({
  __esModule: true,
  updateStatsForSettlement: updateStatsForSettlementMock,
  getUserStats: getUserStatsMock,
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
    { id: 'user-one', email: 'one@example.com' },
    { id: 'user-two', email: 'two@example.com' },
  );
  prismaMock.state.events.push({
    id: 'event-1',
    name: 'Cup',
    description: null,
    subCompetitionIds: ['sub-1'],
    participantIds: [],
  });
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
