import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Prisma, BetStatus, SubCompStatus, Role, EventRole } from '@prisma/client';
import { createMockPrisma } from '../utils/mockPrisma';

const mockPrisma = createMockPrisma();
const { db } = mockPrisma;

vi.mock('../../src/lib/prisma', () => ({
  prisma: mockPrisma.prisma,
}));

let app: import('express').Express;
let adminToken: string;
let userToken: string;
let signAccessToken: typeof import('../../src/services/auth.service')['signAccessToken'];

const resetDb = () => {
  db.users.length = 0;
  db.events.length = 0;
  db.eventMemberships.length = 0;
  db.subCompetitions.length = 0;
  db.participants.length = 0;
  db.bets.length = 0;
  db.results.length = 0;
  db.settlements.length = 0;
  db.notifications.length = 0;
};

const seedBaseData = () => {
  db.users.push(
    { id: 'admin-1', email: 'admin@example.com', role: Role.ADMIN, isBanned: false, createdAt: new Date('2024-01-01') },
    { id: 'user-1', email: 'user@example.com', role: Role.USER, isBanned: false, createdAt: new Date('2024-01-02') },
  );
  db.events.push({ id: 'event-1', name: 'Championship', houseCut: 0.05 });
  db.eventMemberships.push(
    { id: 'membership-1', eventId: 'event-1', userId: 'admin-1', role: EventRole.ADMIN, createdAt: new Date('2024-01-01') },
    { id: 'membership-2', eventId: 'event-1', userId: 'user-1', role: EventRole.MEMBER, createdAt: new Date('2024-01-02') },
  );
  db.subCompetitions.push({ id: 'sub-1', eventId: 'event-1', status: SubCompStatus.ACTIVE, name: 'Qualifier' });
  db.participants.push(
    { id: 'participant-1', subCompetitionId: 'sub-1', name: 'Sprinter' },
    { id: 'participant-2', subCompetitionId: 'sub-1', name: 'Marathoner' },
  );

  db.bets.push(
    {
      id: 'bet-1',
      userId: 'user-1',
      subCompetitionId: 'sub-1',
      participantId: 'participant-1',
      amount: new Prisma.Decimal(50),
      status: BetStatus.PENDING,
      resultId: null,
    } as any,
    {
      id: 'bet-2',
      userId: 'user-2',
      subCompetitionId: 'sub-1',
      participantId: 'participant-1',
      amount: new Prisma.Decimal(50),
      status: BetStatus.PENDING,
      resultId: null,
    } as any,
    {
      id: 'bet-3',
      userId: 'user-3',
      subCompetitionId: 'sub-1',
      participantId: 'participant-2',
      amount: new Prisma.Decimal(100),
      status: BetStatus.PENDING,
      resultId: null,
    } as any,
  );
};

beforeAll(async () => {
  const module = await import('../../src/app');
  app = module.app;
  ({ signAccessToken } = await import('../../src/services/auth.service'));

  adminToken = signAccessToken({ sub: 'admin-1', role: Role.ADMIN });
  userToken = signAccessToken({ sub: 'user-1', role: Role.USER });
});

beforeEach(() => {
  resetDb();
  seedBaseData();
});

describe('Results and Settlements routes', () => {
  it('records a result and returns payouts + settlements', async () => {
    const response = await request(app)
      .post('/results')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subCompetitionId: 'sub-1', winningEntryId: 'participant-1' })
      .expect(201);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.totalPool).toBeCloseTo(200);
    expect(response.body.data.payouts).toHaveLength(3);
    expect(response.body.data.settlements).toHaveLength(3);

    const winnerSettlements = response.body.data.settlements.filter((settlement: any) => settlement.payout > 0);
    expect(winnerSettlements).toHaveLength(2);

    expect(db.results).toHaveLength(1);
    expect(db.settlements).toHaveLength(3);
    expect(db.bets.filter((bet) => bet.status === BetStatus.WON)).toHaveLength(2);
    expect(db.bets.filter((bet) => bet.status === BetStatus.LOST)).toHaveLength(1);
  });

  it('retrieves the recorded result with payout summary', async () => {
    const recordResponse = await request(app)
      .post('/results')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subCompetitionId: 'sub-1', winningEntryId: 'participant-1' })
      .expect(201);

    const { resultId } = recordResponse.body.data;

    const response = await request(app)
      .get(`/results/${resultId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.result.id).toBe(resultId);
    expect(response.body.data.payouts.totalPool).toBeCloseTo(200);
    expect(response.body.data.payouts.payouts).toHaveLength(3);
  });

  it('aggregates settlements by event', async () => {
    await request(app)
      .post('/results')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ subCompetitionId: 'sub-1', winningEntryId: 'participant-1' })
      .expect(201);

    const response = await request(app)
      .get('/settlements/events/event-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.eventId).toBe('event-1');
    expect(response.body.data.totalPool).toBeCloseTo(200);
    expect(response.body.data.settlements).toHaveLength(3);
    expect(response.body.data.payouts).toHaveLength(3);
  });
});
