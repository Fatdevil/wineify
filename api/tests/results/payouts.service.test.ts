import { Prisma, SubCompStatus, BetStatus } from '@prisma/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { computePayouts } from '../../src/modules/results/payouts.service';
import { createMockPrisma } from '../utils/mockPrisma';

describe('computePayouts', () => {
  const now = new Date();
  const houseCut = 0.1;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes pari-mutuel payouts using total pool, house cut, and winning stake', async () => {
    const { prisma, db } = createMockPrisma();

    db.events.push({ id: 'event-1', name: 'Autumn Derby', houseCut });
    db.subCompetitions.push({ id: 'sub-1', eventId: 'event-1', status: SubCompStatus.ACTIVE, name: 'Final Heat' });
    db.participants.push(
      { id: 'participant-1', subCompetitionId: 'sub-1', name: 'Lightning' },
      { id: 'participant-2', subCompetitionId: 'sub-1', name: 'Thunder' },
    );
    db.bets.push(
      {
        id: 'bet-1',
        userId: 'user-1',
        subCompetitionId: 'sub-1',
        participantId: 'participant-1',
        amount: new Prisma.Decimal(60),
        status: BetStatus.PENDING,
        resultId: null,
      } as any,
      {
        id: 'bet-2',
        userId: 'user-2',
        subCompetitionId: 'sub-1',
        participantId: 'participant-1',
        amount: new Prisma.Decimal(40),
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
    db.results.push({
      id: 'result-1',
      subCompetitionId: 'sub-1',
      participantId: 'participant-1',
      outcome: 'WIN',
      recordedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const computation = await computePayouts('sub-1', prisma);

    expect(computation.totalPool).toBeCloseTo(200);
    expect(computation.houseCut).toBeCloseTo(houseCut);
    expect(computation.winningStake).toBeCloseTo(100);
    expect(computation.payoutPerUnit).toBeCloseTo(1.8);

    const winnerPayouts = computation.payouts.filter((payout) => payout.isWinner);
    const loserPayouts = computation.payouts.filter((payout) => !payout.isWinner);

    expect(winnerPayouts).toHaveLength(2);
    expect(loserPayouts).toHaveLength(1);

    expect(winnerPayouts[0].payout).toBeCloseTo(108);
    expect(winnerPayouts[1].payout).toBeCloseTo(72);
    expect(loserPayouts[0].payout).toBeCloseTo(0);
  });
});
