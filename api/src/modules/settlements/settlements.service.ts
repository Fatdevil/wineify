import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { computePayouts, ComputedPayout } from '../results/payouts.service';

export interface EventSettlements {
  eventId: string;
  totalPool: number;
  payouts: Array<ComputedPayout & { subCompetitionId: string; resultId: string }>;
  settlements: Array<{
    id: string;
    betId: string;
    resultId: string | null;
    status: string;
    payout: number | null;
    settledAt: Date | null;
  }>;
}

export async function generateSettlements(eventId: string, client: PrismaClient = prisma): Promise<EventSettlements> {
  const event = await client.event.findUnique({
    where: { id: eventId },
    include: {
      subCompetitions: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!event) {
    throw new Error(`Event ${eventId} was not found.`);
  }

  const computations = (
    await Promise.all(
      event.subCompetitions.map(async (subCompetition) => {
        try {
          return await computePayouts(subCompetition.id, client);
        } catch (error) {
          return null;
        }
      }),
    )
  ).filter((computation): computation is Awaited<ReturnType<typeof computePayouts>> => computation !== null);

  const settlements = await client.settlement.findMany({
    where: {
      bet: {
        subCompetition: {
          eventId,
        },
      },
    },
    include: {
      bet: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const totalPool = computations.reduce((sum, computation) => sum + computation.totalPool, 0);

  return {
    eventId,
    totalPool,
    payouts: computations.flatMap((computation) =>
      computation.payouts.map((payout) => ({
        ...payout,
        subCompetitionId: computation.subCompetitionId,
        resultId: computation.resultId,
      })),
    ),
    settlements: settlements.map((settlement) => ({
      id: settlement.id,
      betId: settlement.betId,
      resultId: settlement.resultId,
      status: settlement.status,
      payout: settlement.payout ? Number((settlement.payout as Prisma.Decimal).toFixed(2)) : null,
      settledAt: settlement.settledAt,
    })),
  };
}
