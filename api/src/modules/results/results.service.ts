import {
  BetStatus,
  Prisma,
  PrismaClient,
  SettlementStatus,
  SubCompStatus,
} from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { computePayouts, PayoutComputation } from './payouts.service';

export interface RecordResultResponse {
  eventId: string;
  resultId: string;
  totalPool: number;
  payouts: PayoutComputation['payouts'];
  settlements: Array<{
    id: string;
    betId: string;
    resultId: string | null;
    status: SettlementStatus;
    payout: number | null;
  }>;
}

const ZERO = new Prisma.Decimal(0);

export async function recordResult(
  subCompetitionId: string,
  winningEntryId: string,
  client: PrismaClient = prisma,
): Promise<RecordResultResponse> {
  const { computation, settlements } = await client.$transaction(async (tx) => {
    const subCompetitionRecord = await tx.subCompetition.findUnique({
      where: { id: subCompetitionId },
      include: {
        event: true,
        participants: true,
        results: true,
      },
    });

    if (!subCompetitionRecord) {
      throw new Error(`Sub-competition ${subCompetitionId} was not found.`);
    }

    if (subCompetitionRecord.status === SubCompStatus.SETTLED) {
      throw new Error('Sub-competition already settled.');
    }

    const winningParticipant = subCompetitionRecord.participants.find((participant) => participant.id === winningEntryId);

    if (!winningParticipant) {
      throw new Error('Winning entry is not registered for this sub-competition.');
    }

    const existingResult = subCompetitionRecord.results.find((existing) => existing.participantId === winningEntryId);

    if (existingResult) {
      throw new Error('Result already recorded for the provided entry.');
    }

    await tx.result.create({
      data: {
        subCompetitionId,
        participantId: winningEntryId,
        outcome: 'WIN',
      },
    });

    await tx.subCompetition.update({
      where: { id: subCompetitionId },
      data: { status: SubCompStatus.SETTLED },
    });

    const computationResult = await computePayouts(subCompetitionId, tx);

    const settlementsCreated = await Promise.all(
      computationResult.payouts.map(async (payout) => {
        const betStatus = payout.isWinner ? BetStatus.WON : BetStatus.LOST;
        await tx.bet.update({
          where: { id: payout.betId },
          data: {
            status: betStatus,
            resultId: computationResult.resultId,
          },
        });

        const payoutDecimal = payout.payout ? new Prisma.Decimal(payout.payout) : ZERO;

        const settlement = await tx.settlement.upsert({
          where: { betId: payout.betId },
          update: {
            resultId: computationResult.resultId,
            status: SettlementStatus.PENDING,
            settledAt: null,
            payout: payoutDecimal,
          },
          create: {
            betId: payout.betId,
            resultId: computationResult.resultId,
            status: SettlementStatus.PENDING,
            settledAt: null,
            payout: payoutDecimal,
          },
        });

        return settlement;
      }),
    );

    return { computation: computationResult, settlements: settlementsCreated };
  });

  return {
    eventId: computation.eventId,
    resultId: computation.resultId,
    totalPool: computation.totalPool,
    payouts: computation.payouts,
    settlements: settlements.map((settlement) => ({
      id: settlement.id,
      betId: settlement.betId,
      resultId: settlement.resultId,
      status: settlement.status,
      payout: settlement.payout ? Number(settlement.payout.toFixed(2)) : null,
    })),
  };
}
