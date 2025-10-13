import { Prisma, PrismaClient } from '@prisma/client';
import type { Prisma as PrismaNamespace } from '@prisma/client';
import { prisma } from '../../lib/prisma';

export interface ComputedPayout {
  betId: string;
  userId: string;
  subCompetitionId: string;
  resultId: string;
  participantId: string | null;
  isWinner: boolean;
  stake: number;
  payout: number;
}

export interface PayoutComputation {
  eventId: string;
  subCompetitionId: string;
  resultId: string;
  totalPool: number;
  houseCut: number;
  winningStake: number;
  payoutPerUnit: number;
  payouts: ComputedPayout[];
}

const ZERO = new Prisma.Decimal(0);
const ONE = new Prisma.Decimal(1);

function decimalToNumber(value: Prisma.Decimal): number {
  return Number(value.toFixed(2));
}

type TransactionClient = PrismaNamespace.TransactionClient;

export async function computePayouts(
  subCompetitionId: string,
  client: PrismaClient | TransactionClient = prisma,
): Promise<PayoutComputation> {
  const subCompetition = await client.subCompetition.findUnique({
    where: { id: subCompetitionId },
    include: {
      event: true,
      bets: true,
      results: {
        orderBy: { recordedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!subCompetition) {
    throw new Error(`Sub-competition ${subCompetitionId} was not found.`);
  }

  const [result] = subCompetition.results;

  if (!result) {
    throw new Error(`No result recorded for sub-competition ${subCompetitionId}.`);
  }

  const totalPoolDecimal = subCompetition.bets.reduce((sum, bet) => sum.add(bet.amount), ZERO);
  const winningBets = subCompetition.bets.filter((bet) => bet.participantId === result.participantId);
  const winningStakeDecimal = winningBets.reduce((sum, bet) => sum.add(bet.amount), ZERO);

  const eventWithHouseCut = subCompetition.event as unknown as { houseCut?: Prisma.Decimal | number } | null;
  const houseCutDecimal = eventWithHouseCut?.houseCut ? new Prisma.Decimal(eventWithHouseCut.houseCut) : ZERO;
  const netPool = totalPoolDecimal.mul(ONE.sub(houseCutDecimal));
  const payoutPerUnitDecimal = winningStakeDecimal.gt(ZERO) ? netPool.div(winningStakeDecimal) : ZERO;

  const payouts: ComputedPayout[] = subCompetition.bets.map((bet) => {
    const isWinner = bet.participantId === result.participantId;
    const payoutDecimal = isWinner ? bet.amount.mul(payoutPerUnitDecimal) : ZERO;

    return {
      betId: bet.id,
      userId: bet.userId,
      subCompetitionId: bet.subCompetitionId,
      resultId: result.id,
      participantId: bet.participantId,
      isWinner,
      stake: decimalToNumber(bet.amount),
      payout: decimalToNumber(payoutDecimal),
    };
  });

  return {
    eventId: subCompetition.eventId,
    subCompetitionId: subCompetition.id,
    resultId: result.id,
    totalPool: decimalToNumber(totalPoolDecimal),
    houseCut: decimalToNumber(houseCutDecimal),
    winningStake: decimalToNumber(winningStakeDecimal),
    payoutPerUnit: decimalToNumber(payoutPerUnitDecimal),
    payouts,
  };
}
