import { Prisma, PrismaClient, SettlementStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getLevelProgress } from './progression.service';

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

type StatsDelegate = {
  findUnique: (...args: any[]) => Promise<any>;
  update: (...args: any[]) => Promise<any>;
};

type AchievementDelegate = {
  findMany: (...args: any[]) => Promise<any[]>;
};

type UserAchievementDelegate = {
  findMany: (...args: any[]) => Promise<any[]>;
  create: (...args: any[]) => Promise<any>;
};

type SettlementDelegate = {
  findFirst: (...args: any[]) => Promise<any>;
  count: (...args: any[]) => Promise<number>;
};

function getStatsDelegate(client: PrismaClientLike): StatsDelegate {
  return (client as unknown as { stats: StatsDelegate }).stats;
}

function getAchievementDelegate(client: PrismaClientLike): AchievementDelegate {
  return (client as unknown as { achievement: AchievementDelegate }).achievement;
}

function getUserAchievementDelegate(client: PrismaClientLike): UserAchievementDelegate {
  return (client as unknown as { userAchievement: UserAchievementDelegate }).userAchievement;
}

function getSettlementDelegate(client: PrismaClientLike): SettlementDelegate {
  return (client as unknown as { settlement: SettlementDelegate }).settlement;
}

interface AchievementRuleContext {
  stats: {
    totalWins: number;
    streak: number;
    xp: number;
  };
  biggestPayout: number;
  completedSettlements: number;
}

type RuleEvaluator = (
  context: AchievementRuleContext,
  client: PrismaClientLike,
) => boolean | Promise<boolean>;

interface AchievementRule {
  code: string;
  evaluate: RuleEvaluator;
}

const ACHIEVEMENT_RULES: AchievementRule[] = [
  {
    code: 'FIRST_WIN',
    evaluate: (context) => context.stats.totalWins > 0,
  },
  {
    code: 'STREAK_MASTER',
    evaluate: (context) => context.stats.streak >= 5,
  },
  {
    code: 'BIG_PAYOUT',
    evaluate: (context) => context.biggestPayout > 500,
  },
  {
    code: 'TEAM_PLAYER',
    evaluate: (context) => context.completedSettlements >= 10,
  },
  {
    code: 'LEGEND_LEVEL',
    evaluate: (context) => context.stats.xp > 10_000,
  },
];

async function buildContext(
  userId: string,
  client: PrismaClientLike,
): Promise<AchievementRuleContext | null> {
  const statsDelegate = getStatsDelegate(client);
  const stats = await statsDelegate.findUnique({
    where: { userId },
    select: {
      totalWins: true,
      streak: true,
      xp: true,
    },
  });

  if (!stats) {
    return null;
  }

  const settlementDelegate = getSettlementDelegate(client);
  const biggest = await settlementDelegate.findFirst({
    where: {
      bet: {
        userId,
      },
      status: SettlementStatus.COMPLETED,
      payout: {
        gt: new Prisma.Decimal(0),
      },
    },
    orderBy: {
      payout: 'desc',
    },
    select: {
      payout: true,
    },
  });

  const completedSettlements = await settlementDelegate.count({
    where: {
      bet: { userId },
      status: SettlementStatus.COMPLETED,
    },
  });

  return {
    stats,
    completedSettlements,
    biggestPayout: biggest?.payout ? Number(biggest.payout.toString()) : 0,
  };
}

interface AchievementGrantResult {
  granted: string[];
}

export async function checkAndGrantAchievements(
  userId: string,
  client: PrismaClientLike = prisma,
): Promise<AchievementGrantResult> {
  const statsDelegate = getStatsDelegate(client);
  const context = await buildContext(userId, client);

  if (!context) {
    return { granted: [] };
  }

  const codes = ACHIEVEMENT_RULES.map((rule) => rule.code);

  const achievementDelegate = getAchievementDelegate(client);
  const userAchievementDelegate = getUserAchievementDelegate(client);

  const achievements = await achievementDelegate.findMany({
    where: { code: { in: codes } },
  });

  if (!achievements.length) {
    return { granted: [] };
  }

  const achievementsByCode = new Map<string, any>(
    achievements.map((achievement: any) => [achievement.code, achievement]),
  );

  const earned = await userAchievementDelegate.findMany({
    where: { userId },
    select: {
      achievementId: true,
      achievement: {
        select: { code: true },
      },
    },
  });

  const earnedCodes = new Set(earned.map((entry: any) => entry.achievement.code));
  const newlyGranted: string[] = [];
  let bonusXp = 0;

  for (const rule of ACHIEVEMENT_RULES) {
    if (earnedCodes.has(rule.code)) {
      continue;
    }

    const achievement = achievementsByCode.get(rule.code);

    if (!achievement) {
      continue;
    }

    const achieved = await rule.evaluate(context, client);

    if (!achieved) {
      continue;
    }

    await userAchievementDelegate.create({
      data: {
        userId,
        achievementId: achievement.id,
      },
    });

    newlyGranted.push(rule.code);
    bonusXp += achievement.xpReward;
    context.stats.xp += achievement.xpReward;

    // eslint-disable-next-line no-console
    console.info(`Achievement unlocked for ${userId}: ${rule.code}`);
  }

  if (bonusXp > 0) {
    const statsRecord = await statsDelegate.findUnique({ where: { userId } });

    if (statsRecord) {
      const nextXpTotal = statsRecord.xp + bonusXp;
      const progress = getLevelProgress(nextXpTotal);

      await statsDelegate.update({
        where: { id: statsRecord.id },
        data: {
          xp: nextXpTotal,
          level: progress.level,
          nextLevelXp: progress.nextLevelTotalXp,
        },
      });
    }
  }

  return { granted: newlyGranted };
}

export { ACHIEVEMENT_RULES };
