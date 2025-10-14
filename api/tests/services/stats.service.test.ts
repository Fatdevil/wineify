import { Prisma, BetStatus, SettlementStatus } from '@prisma/client';
import {
  calculateXpGain,
  getLeaderboard,
  getUserStats,
  updateStatsForSettlement,
} from '../../src/services/stats.service';

jest.mock('../../src/lib/prisma', () => {
  const { createMockPrisma } = require('../utils/mockPrisma');
  return createMockPrisma();
});

const { prisma, db } = jest.requireMock('../../src/lib/prisma') as ReturnType<
  typeof import('../utils/mockPrisma')['createMockPrisma']
>;

describe('stats.service', () => {
  beforeEach(() => {
    db.users.length = 0;
    db.events.length = 0;
    db.subCompetitions.length = 0;
    db.participants.length = 0;
    db.bets.length = 0;
    db.results.length = 0;
    db.settlements.length = 0;
    db.stats.length = 0;
    db.achievements.length = 0;
    db.userAchievements.length = 0;
  });

  it('calculates XP gain using square root progression', () => {
    expect(calculateXpGain(0)).toBe(0);
    expect(calculateXpGain(25)).toBe(50);
    expect(calculateXpGain(144)).toBe(120);
  });

  it('updates stats for winning and losing settlements with streak management', async () => {
    db.users.push({ id: 'user-1', email: 'winner@example.com' });

    db.bets.push({
      id: 'bet-1',
      userId: 'user-1',
      subCompetitionId: 'sub-1',
      participantId: null,
      amount: new Prisma.Decimal(50),
      status: BetStatus.PENDING,
      resultId: null,
    } as any);

    db.settlements.push({
      id: 'settlement-1',
      betId: 'bet-1',
      resultId: null,
      status: SettlementStatus.PENDING,
      settledAt: null,
      payout: new Prisma.Decimal(150),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const winStats = await updateStatsForSettlement('settlement-1', prisma);

    expect(winStats.totalWins).toBe(1);
    expect(winStats.totalLosses).toBe(0);
    expect(winStats.streak).toBe(1);
    expect(winStats.totalUnits).toBe(Math.round(150 - 50));
    expect(winStats.xp).toBe(calculateXpGain(150));
    expect(winStats.level).toBeGreaterThan(1);

    db.bets.push({
      id: 'bet-2',
      userId: 'user-1',
      subCompetitionId: 'sub-1',
      participantId: null,
      amount: new Prisma.Decimal(30),
      status: BetStatus.PENDING,
      resultId: null,
    } as any);

    db.settlements.push({
      id: 'settlement-2',
      betId: 'bet-2',
      resultId: null,
      status: SettlementStatus.PENDING,
      settledAt: null,
      payout: new Prisma.Decimal(0),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const lossStats = await updateStatsForSettlement('settlement-2', prisma);

    expect(lossStats.totalWins).toBe(1);
    expect(lossStats.totalLosses).toBe(1);
    expect(lossStats.streak).toBe(0);
    expect(lossStats.totalUnits).toBe(Math.round(150 - 50) - Math.round(30));
    expect(lossStats.xp).toBe(calculateXpGain(150));
    expect(lossStats.level).toBe(winStats.level);
  });

  it('returns leaderboard ordered by XP and exposes user summaries', async () => {
    db.users.push(
      { id: 'user-1', email: 'alpha@example.com' },
      { id: 'user-2', email: 'bravo@example.com' },
      { id: 'user-3', email: 'charlie@example.com' },
    );

    db.stats.push(
      {
        id: 'stats-1',
        userId: 'user-1',
        totalWins: 5,
        totalLosses: 3,
        totalUnits: 120,
        streak: 2,
        xp: 180,
        level: 2,
        nextLevelXp: 210,
        lastUpdated: new Date(),
      },
      {
        id: 'stats-2',
        userId: 'user-2',
        totalWins: 7,
        totalLosses: 2,
        totalUnits: 200,
        streak: 4,
        xp: 220,
        level: 3,
        nextLevelXp: 331,
        lastUpdated: new Date(),
      },
      {
        id: 'stats-3',
        userId: 'user-3',
        totalWins: 6,
        totalLosses: 4,
        totalUnits: 90,
        streak: 1,
        xp: 190,
        level: 3,
        nextLevelXp: 331,
        lastUpdated: new Date(),
      },
    );

    const leaderboard = await getLeaderboard(prisma);

    expect(leaderboard.map((entry) => entry.userId)).toEqual(['user-2', 'user-3', 'user-1']);
    expect(leaderboard[0]?.username).toBe('bravo@example.com');
    expect(leaderboard[0]?.level).toBe(3);
    expect(leaderboard[0]?.xpIntoLevel).toBeGreaterThanOrEqual(0);
  });

  it('creates default stats when requesting a user snapshot', async () => {
    db.users.push({ id: 'user-9', email: 'newcomer@example.com' });

    const snapshot = await getUserStats('user-9', prisma);

    expect(snapshot.totalWins).toBe(0);
    expect(snapshot.totalLosses).toBe(0);
    expect(snapshot.xp).toBe(0);
    expect(snapshot.username).toBe('newcomer@example.com');
  });
});
