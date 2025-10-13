import { BetStatus, Prisma, SettlementStatus, SubCompStatus } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

interface UserRecord {
  id: string;
  email: string;
}

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

interface StatsRecord {
  id: string;
  userId: string;
  totalWins: number;
  totalLosses: number;
  totalUnits: number;
  streak: number;
  xp: number;
  lastUpdated: Date;
}

export interface MockDatabase {
  users: UserRecord[];
  events: EventRecord[];
  subCompetitions: SubCompetitionRecord[];
  participants: ParticipantRecord[];
  bets: BetRecord[];
  results: ResultRecord[];
  settlements: SettlementRecord[];
  stats: StatsRecord[];
}

function createResultId(index: number) {
  return `result-${index + 1}`;
}

function createSettlementId(index: number) {
  return `settlement-${index + 1}`;
}

function createStatsId(index: number) {
  return `stats-${index + 1}`;
}

export function createMockPrisma() {
  const db: MockDatabase = {
    users: [],
    events: [],
    subCompetitions: [],
    participants: [],
    bets: [],
    results: [],
    settlements: [],
    stats: [],
  };

  const prismaMock: Record<string, any> = {
    $transaction: async <T>(callback: (tx: PrismaClient) => Promise<T>): Promise<T> => {
      return callback(prismaMock as PrismaClient);
    },
    user: {
      findMany: async ({ where, select }: any) => {
        let records = db.users.slice();

        if (where?.id?.in) {
          const set = new Set(where.id.in);
          records = records.filter((user) => set.has(user.id));
        }

        return records.map((record) => {
          if (!select) {
            return { ...record };
          }

          const shaped: any = {};
          Object.keys(select).forEach((key) => {
            if (select[key]) {
              shaped[key] = (record as any)[key];
            }
          });
          return shaped;
        });
      },
      findUnique: async ({ where, select }: any) => {
        const record = db.users.find((user) => user.id === where.id) ?? null;
        if (!record) {
          return null;
        }

        if (!select) {
          return { ...record };
        }

        const shaped: any = {};
        Object.keys(select).forEach((key) => {
          if (select[key]) {
            shaped[key] = (record as any)[key];
          }
        });
        return shaped;
      },
      create: async ({ data }: any) => {
        const record: UserRecord = { id: data.id ?? `user-${db.users.length + 1}`, email: data.email };
        db.users.push(record);
        return { ...record };
      },
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
      findUnique: async ({ where, include }: any) => {
        const record = db.settlements.find((settlement) => settlement.id === where.id);
        if (!record) {
          return null;
        }

        const base: any = { ...record };

        if (include?.bet) {
          base.bet = db.bets.find((bet) => bet.id === record.betId) ?? null;
        }

        return base;
      },
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
      update: async ({ where, data }: any) => {
        const record = db.settlements.find((settlement) => settlement.id === where.id);
        if (!record) {
          throw new Error('Settlement not found');
        }

        Object.assign(record, data, { updatedAt: new Date() });
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
    stats: {
      create: async ({ data }: any) => {
        const record: StatsRecord = {
          id: createStatsId(db.stats.length),
          userId: data.userId,
          totalWins: data.totalWins ?? 0,
          totalLosses: data.totalLosses ?? 0,
          totalUnits: data.totalUnits ?? 0,
          streak: data.streak ?? 0,
          xp: data.xp ?? 0,
          lastUpdated: new Date(),
        };
        db.stats.push(record);
        return { ...record };
      },
      update: async ({ where, data }: any) => {
        const record = db.stats.find((stat) => stat.id === where.id);
        if (!record) {
          throw new Error('Stats record not found');
        }

        Object.assign(record, data, { lastUpdated: new Date() });
        return { ...record };
      },
      findUnique: async ({ where }: any) => {
        let record: StatsRecord | undefined;

        if (where?.id) {
          record = db.stats.find((stat) => stat.id === where.id);
        } else if (where?.userId) {
          record = db.stats.find((stat) => stat.userId === where.userId);
        }

        return record ? { ...record } : null;
      },
      findMany: async ({ orderBy, take }: any) => {
        let records = db.stats.slice();

        if (Array.isArray(orderBy) && orderBy.length) {
          records.sort((a, b) => {
            for (const clause of orderBy) {
              const [[key, direction]] = Object.entries(clause);
              const left = (a as any)[key];
              const right = (b as any)[key];
              if (left === right) {
                continue;
              }
              const comparison = left > right ? 1 : -1;
              return direction === 'desc' ? -comparison : comparison;
            }
            return 0;
          });
        }

        if (take) {
          records = records.slice(0, take);
        }

        return records.map((record) => ({ ...record }));
      },
    },
  };

  return { prisma: prismaMock as PrismaClient, db };
}
