import request from 'supertest';
import { Prisma, BetStatus, SubCompStatus } from '@prisma/client';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createMockPrisma } from '../utils/mockPrisma';

const { prisma, db } = createMockPrisma();

vi.mock('../../src/lib/prisma', () => ({
  prisma,
}));

let app: import('express').Express;

beforeAll(async () => {
  const module = await import('../../src/app');
  app = module.app;

  db.events.push({ id: 'event-1', name: 'Championship', houseCut: 0.05 });
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
});

describe('Results and Settlements routes', () => {
  it('records a result and returns payouts + settlements', async () => {
    const response = await request(app)
      .post('/results')
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
    const [result] = db.results;
    const response = await request(app).get(`/results/${result.id}`).expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.result.id).toBe(result.id);
    expect(response.body.data.payouts.totalPool).toBeCloseTo(200);
    expect(response.body.data.payouts.payouts).toHaveLength(3);
  });

  it('aggregates settlements by event', async () => {
    const response = await request(app).get('/settlements/events/event-1').expect(200);

    expect(response.body.ok).toBe(true);
    expect(response.body.data.eventId).toBe('event-1');
    expect(response.body.data.totalPool).toBeCloseTo(200);
    expect(response.body.data.settlements).toHaveLength(3);
    expect(response.body.data.payouts).toHaveLength(3);
  });
});
