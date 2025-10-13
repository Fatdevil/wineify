import { BetStatus, Prisma, SettlementStatus, SubCompStatus } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

interface EventRecord {
  id: string;
  name: string;
  houseCut?: number;
}

interface SubCompetitionRecord {
  id: string;
  eventId: string;
  status: SubCompStatus;
  name: string;
}

interface ParticipantRecord {
  id: string;
  subCompetitionId: string;
  name: string;
}

interface BetRecord {
  id: string;
  userId: string;
  subCompetitionId: string;
  participantId: string | null;
  amount: Prisma.Decimal;
  status: BetStatus;
  resultId: string | null;
}

interface ResultRecord {
  id: string;
  subCompetitionId: string;
  participantId: string;
  outcome: string;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface SettlementRecord {
  id: string;
  betId: string;
  resultId: string | null;
  status: SettlementStatus;
  settledAt: Date | null;
  payout: Prisma.Decimal | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockDatabase {
  events: EventRecord[];
  subCompetitions: SubCompetitionRecord[];
  participants: ParticipantRecord[];
  bets: BetRecord[];
  results: ResultRecord[];
  settlements: SettlementRecord[];
}

function createResultId(index: number) {
  return `result-${index + 1}`;
}

function createSettlementId(index: number) {
  return `settlement-${index + 1}`;
}

export function createMockPrisma() {
  const db: MockDatabase = {
    events: [],
    subCompetitions: [],
    participants: [],
    bets: [],
    results: [],
    settlements: [],
  };

  const prismaMock: Record<string, any> = {
    $transaction: async <T>(callback: (tx: PrismaClient) => Promise<T>): Promise<T> => {
      return callback(prismaMock as PrismaClient);
    },
    event: {
      findUnique: async ({ where, include }: any) => {
        const record = db.events.find((event) => event.id === where.id);
        if (!record) {
          return null;
        }

        const base: any = { ...record };

        if (include?.subCompetitions) {
          base.subCompetitions = db.subCompetitions.filter((sub) => sub.eventId === record.id).map((sub) => ({
            ...sub,
          }));
        }

        return base;
      },
    },
    subCompetition: {
      findUnique: async ({ where, include }: any) => {
        const record = db.subCompetitions.find((sub) => sub.id === where.id);
        if (!record) {
          return null;
        }

        const base: any = { ...record };

        if (include?.event) {
          base.event = db.events.find((event) => event.id === record.eventId) ?? null;
        }

        if (include?.participants) {
          base.participants = db.participants.filter((participant) => participant.subCompetitionId === record.id);
        }

        if (include?.results) {
          base.results = db.results.filter((result) => result.subCompetitionId === record.id);
          if (include.results?.orderBy?.recordedAt === 'desc' && include.results?.take === 1) {
            base.results = base.results.sort((a: ResultRecord, b: ResultRecord) => b.recordedAt.getTime() - a.recordedAt.getTime()).slice(0, 1);
          }
        }

        if (include?.bets) {
          base.bets = db.bets.filter((bet) => bet.subCompetitionId === record.id);
        }

        return base;
      },
      update: async ({ where, data }: any) => {
        const record = db.subCompetitions.find((sub) => sub.id === where.id);
        if (!record) {
          throw new Error('Sub-competition not found');
        }

        Object.assign(record, data);
        return { ...record };
      },
    },
    result: {
      create: async ({ data }: any) => {
        const result: ResultRecord = {
          id: createResultId(db.results.length),
          subCompetitionId: data.subCompetitionId,
          participantId: data.participantId,
          outcome: data.outcome,
          recordedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        db.results.push(result);
        return { ...result };
      },
      findUnique: async ({ where, include }: any) => {
        const record = db.results.find((result) => result.id === where.id);
        if (!record) {
          return null;
        }

        const base: any = { ...record };

        if (include?.subCompetition) {
          base.subCompetition = db.subCompetitions.find((sub) => sub.id === record.subCompetitionId) ?? null;
        }

        if (include?.participant) {
          base.participant = db.participants.find((participant) => participant.id === record.participantId) ?? null;
        }

        if (include?.settlements) {
          base.settlements = db.settlements.filter((settlement) => settlement.resultId === record.id);
        }

        return base;
      },
    },
    bet: {
      findMany: async ({ where }: any) => {
        if (where?.subCompetitionId) {
          return db.bets.filter((bet) => bet.subCompetitionId === where.subCompetitionId);
        }
        if (where?.resultId) {
          return db.bets.filter((bet) => bet.resultId === where.resultId);
        }
        return db.bets.slice();
      },
      update: async ({ where, data }: any) => {
        const record = db.bets.find((bet) => bet.id === where.id);
        if (!record) {
          throw new Error('Bet not found');
        }

        Object.assign(record, data);
        return { ...record };
      },
    },
    settlement: {
      upsert: async ({ where, update, create }: any) => {
        let record = db.settlements.find((settlement) => settlement.betId === where.betId);
        if (record) {
          Object.assign(record, update, { updatedAt: new Date() });
        } else {
          record = {
            id: createSettlementId(db.settlements.length),
            betId: create.betId,
            resultId: create.resultId ?? null,
            status: create.status ?? SettlementStatus.PENDING,
            settledAt: create.settledAt ?? null,
            payout: create.payout ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          db.settlements.push(record);
        }

        return { ...record };
      },
      findMany: async ({ where, include, orderBy }: any) => {
        let records = db.settlements.filter((settlement) => {
          if (!where?.bet?.subCompetition?.eventId) {
            return true;
          }
          const bet = db.bets.find((bet) => bet.id === settlement.betId);
          if (!bet) {
            return false;
          }
          const subCompetition = db.subCompetitions.find((sub) => sub.id === bet.subCompetitionId);
          return subCompetition?.eventId === where.bet.subCompetition.eventId;
        });

        if (orderBy?.createdAt === 'desc') {
          records = records.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }

        return records.map((record) => ({
          ...record,
          bet: include?.bet ? db.bets.find((bet) => bet.id === record.betId) ?? null : undefined,
        }));
      },
    },
  };

  return { prisma: prismaMock as PrismaClient, db };
}
