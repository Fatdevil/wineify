import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface StatsSnapshot {
  id: string;
  userId: string;
  totalWins: number;
  totalLosses: number;
  totalUnits: number;
  streak: number;
  xp: number;
  lastUpdated: Date;
}

export interface StatsSummary {
  userId: string;
  username: string;
  totalWins: number;
  totalLosses: number;
  totalUnits: number;
  streak: number;
  xp: number;
}

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

type StatsDelegate = {
  create(args: any): Promise<StatsSnapshot>;
  update(args: any): Promise<StatsSnapshot>;
  findMany(args: any): Promise<Array<StatsSnapshot & { user?: any }>>;
  findUnique(args: any): Promise<(StatsSnapshot & { user?: any }) | null>;
};

function getStatsDelegate(client: PrismaClientLike): StatsDelegate {
  return (client as unknown as { stats: StatsDelegate }).stats;
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (!value) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  return Number(value.toString());
}

const XP_MULTIPLIER = 10;

export function calculateXpGain(payoutUnits: number): number {
  if (payoutUnits <= 0) {
    return 0;
  }

  return Math.round(XP_MULTIPLIER * Math.sqrt(payoutUnits));
}

export async function ensureUserStats(
  userId: string,
  client: PrismaClientLike = prisma,
): Promise<StatsSnapshot> {
  const delegate = getStatsDelegate(client);
  const existing = await delegate.findUnique({ where: { userId } });

  if (existing) {
    return existing;
  }

  return delegate.create({
    data: { userId },
  });
}

async function applySettlementStatsUpdate(
  settlementId: string,
  client: PrismaClientLike,
): Promise<StatsSnapshot> {
  const settlement = await client.settlement.findUnique({
    where: { id: settlementId },
    include: {
      bet: true,
    },
  });

  if (!settlement || !settlement.bet) {
    throw new Error('Settlement not found.');
  }

  const bet = settlement.bet;
  const payout = decimalToNumber(settlement.payout);
  const stake = decimalToNumber(bet.amount as Prisma.Decimal | number);

  const delegate = getStatsDelegate(client);
  let stats = await delegate.findUnique({ where: { userId: bet.userId } });

  if (!stats) {
    stats = await delegate.create({ data: { userId: bet.userId } });
  }

  if (payout > 0) {
    const netUnits = Math.round(payout - stake);
    const xpGain = calculateXpGain(payout);

    return delegate.update({
      where: { id: stats.id },
      data: {
        totalWins: stats.totalWins + 1,
        totalUnits: stats.totalUnits + netUnits,
        xp: stats.xp + xpGain,
        streak: stats.streak + 1,
      },
    });
  }

  const unitsLost = Math.round(stake);

  return delegate.update({
    where: { id: stats.id },
    data: {
      totalLosses: stats.totalLosses + 1,
      totalUnits: stats.totalUnits - unitsLost,
      streak: 0,
    },
  });
}

export async function updateStatsForSettlement(
  settlementId: string,
  client: PrismaClientLike = prisma,
): Promise<StatsSnapshot> {
  if ('$transaction' in client) {
    return (client as PrismaClient).$transaction((tx) =>
      applySettlementStatsUpdate(settlementId, tx as Prisma.TransactionClient),
    );
  }

  return applySettlementStatsUpdate(settlementId, client);
}

export async function getLeaderboard(client: PrismaClientLike = prisma): Promise<StatsSummary[]> {
  const delegate = getStatsDelegate(client);
  const records = await delegate.findMany({
    orderBy: [{ xp: 'desc' }, { totalWins: 'desc' }],
    take: 20,
  });

  if (!records.length) {
    return [];
  }

  const userIds = records.map((record) => record.userId);
  const users = await client.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });

  const usersById = new Map(users.map((user) => [user.id, user]));

  return records.map((record) => ({
    userId: record.userId,
    username: usersById.get(record.userId)?.email ?? `User ${record.userId.slice(0, 6)}`,
    totalWins: record.totalWins,
    totalLosses: record.totalLosses,
    totalUnits: record.totalUnits,
    streak: record.streak,
    xp: record.xp,
  }));
}

export async function getUserStats(
  userId: string,
  client: PrismaClientLike = prisma,
): Promise<StatsSummary> {
  const delegate = getStatsDelegate(client);
  let stats = await delegate.findUnique({ where: { userId } });

  if (!stats) {
    stats = await delegate.create({ data: { userId } });
  }

  const user = await client.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  return {
    userId,
    username: user?.email ?? `User ${userId.slice(0, 6)}`,
    totalWins: stats.totalWins,
    totalLosses: stats.totalLosses,
    totalUnits: stats.totalUnits,
    streak: stats.streak,
    xp: stats.xp,
  };
}
