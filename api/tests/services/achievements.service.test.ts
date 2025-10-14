import { BetStatus, Prisma, SettlementStatus } from '@prisma/client';
import { checkAndGrantAchievements } from '../../src/services/achievements.service';
import { getLevelProgress } from '../../src/services/progression.service';

jest.mock('../../src/lib/prisma', () => {
  const { createMockPrisma } = require('../utils/mockPrisma');
  return createMockPrisma();
});

const { prisma, db } = jest.requireMock('../../src/lib/prisma') as ReturnType<
  typeof import('../utils/mockPrisma')['createMockPrisma']
>;

const ACHIEVEMENT_SEED = [
  { code: 'FIRST_WIN', title: 'First Win', xpReward: 50 },
  { code: 'STREAK_MASTER', title: 'Streak Master', xpReward: 75 },
  { code: 'BIG_PAYOUT', title: 'Big Payout', xpReward: 120 },
  { code: 'TEAM_PLAYER', title: 'Team Player', xpReward: 200 },
  { code: 'LEGEND_LEVEL', title: 'Legend', xpReward: 400 },
];

function seedAchievements() {
  db.achievements.length = 0;
  ACHIEVEMENT_SEED.forEach((entry, index) => {
    db.achievements.push({
      id: `achievement-${index + 1}`,
      code: entry.code,
      title: entry.title,
      description: `${entry.title} description`,
      xpReward: entry.xpReward,
    });
  });
}

describe('achievements.service', () => {
  beforeEach(() => {
    db.users.length = 0;
    db.bets.length = 0;
    db.settlements.length = 0;
    db.stats.length = 0;
    db.userAchievements.length = 0;
    seedAchievements();
  });

  it('grants achievements based on user milestones and awards XP bonuses', async () => {
    db.users.push({ id: 'user-1', email: 'hero@example.com' });

    const baseXp = 11_260;
    const progress = getLevelProgress(baseXp);

    db.stats.push({
      id: 'stats-1',
      userId: 'user-1',
      totalWins: 1,
      totalLosses: 0,
      totalUnits: 640,
      streak: 5,
      xp: baseXp,
      level: progress.level,
      nextLevelXp: progress.nextLevelTotalXp,
      lastUpdated: new Date(),
    });

    for (let index = 0; index < 10; index += 1) {
      const betId = `bet-${index + 1}`;
      db.bets.push({
        id: betId,
        userId: 'user-1',
        subCompetitionId: 'sub-1',
        participantId: null,
        amount: new Prisma.Decimal(100),
        status: BetStatus.PENDING,
        resultId: null,
      } as any);

      db.settlements.push({
        id: `settlement-${index + 1}`,
        betId,
        resultId: null,
        status: SettlementStatus.COMPLETED,
        settledAt: new Date(),
        payout: new Prisma.Decimal(index === 0 ? 650 : 150),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const result = await checkAndGrantAchievements('user-1', prisma);

    expect(new Set(result.granted)).toEqual(new Set(ACHIEVEMENT_SEED.map((entry) => entry.code)));
    expect(db.userAchievements).toHaveLength(ACHIEVEMENT_SEED.length);

    const updatedStats = await (prisma as any).stats.findUnique({ where: { userId: 'user-1' } });
    const xpBonus = ACHIEVEMENT_SEED.reduce((total, entry) => total + entry.xpReward, 0);

    expect(updatedStats?.xp).toBe(baseXp + xpBonus);
    expect(updatedStats?.level).toBeGreaterThan(progress.level);
  });

  it('prevents duplicate achievement grants on subsequent checks', async () => {
    db.users.push({ id: 'user-2', email: 'repeat@example.com' });
    const startingXp = 10_500;
    const progress = getLevelProgress(startingXp);

    db.stats.push({
      id: 'stats-2',
      userId: 'user-2',
      totalWins: 2,
      totalLosses: 0,
      totalUnits: 900,
      streak: 6,
      xp: startingXp,
      level: progress.level,
      nextLevelXp: progress.nextLevelTotalXp,
      lastUpdated: new Date(),
    });

    db.bets.push({
      id: 'bet-repeat',
      userId: 'user-2',
      subCompetitionId: 'sub-1',
      participantId: null,
      amount: new Prisma.Decimal(200),
      status: BetStatus.PENDING,
      resultId: null,
    } as any);

    db.settlements.push({
      id: 'settlement-repeat',
      betId: 'bet-repeat',
      resultId: null,
      status: SettlementStatus.COMPLETED,
      settledAt: new Date(),
      payout: new Prisma.Decimal(700),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const firstGrant = await checkAndGrantAchievements('user-2', prisma);
    const secondGrant = await checkAndGrantAchievements('user-2', prisma);

    expect(firstGrant.granted.length).toBeGreaterThan(0);
    expect(secondGrant.granted).toHaveLength(0);

    const statsRecord = await (prisma as any).stats.findUnique({ where: { userId: 'user-2' } });
    const expectedXp = startingXp + firstGrant.granted.reduce((total, code) => {
      const achievement = ACHIEVEMENT_SEED.find((entry) => entry.code === code);
      return total + (achievement?.xpReward ?? 0);
    }, 0);

    expect(statsRecord?.xp).toBe(expectedXp);
  });
});
