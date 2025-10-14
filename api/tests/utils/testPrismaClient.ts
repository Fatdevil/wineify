import { randomUUID } from 'node:crypto';
import { EventRole, SettlementStatus } from '@prisma/client';

type UserRecord = { id: string; email: string };
type EventRecord = {
  id: string;
  name: string;
  description?: string | null;
  subCompetitionIds: string[];
  participantIds: string[];
};

type SubCompetitionRecord = {
  id: string;
  eventId: string;
  name: string;
};

type ParticipantRecord = {
  id: string;
  eventId: string;
  subCompetitionId: string | null;
  name: string;
};

type MembershipRecord = {
  id: string;
  eventId: string;
  userId: string;
  role: EventRole;
  createdAt: Date;
};

type InviteRecord = {
  id: string;
  eventId: string;
  codeHash: string;
  createdBy: string;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  revokedAt: Date | null;
};

type NotificationRecord = {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
};

type BetRecord = {
  id: string;
  userId: string;
  eventId: string;
  subCompetitionId: string;
};

type SettlementRecord = {
  id: string;
  betId: string;
  status: SettlementStatus;
  settledAt: Date | null;
};

export interface TestPrismaState {
  users: UserRecord[];
  events: EventRecord[];
  subCompetitions: SubCompetitionRecord[];
  participants: ParticipantRecord[];
  memberships: MembershipRecord[];
  invites: InviteRecord[];
  notifications: NotificationRecord[];
  bets: BetRecord[];
  settlements: SettlementRecord[];
}

const defaultState: TestPrismaState = {
  users: [],
  events: [],
  subCompetitions: [],
  participants: [],
  memberships: [],
  invites: [],
  notifications: [],
  bets: [],
  settlements: [],
};

export function createTestPrismaClient(initial: Partial<TestPrismaState> = {}) {
  const state: TestPrismaState = {
    ...defaultState,
    ...initial,
    users: initial.users ? [...initial.users] : [],
    events: initial.events ? [...initial.events] : [],
    subCompetitions: initial.subCompetitions ? [...initial.subCompetitions] : [],
    participants: initial.participants ? [...initial.participants] : [],
    memberships: initial.memberships ? [...initial.memberships] : [],
    invites: initial.invites ? [...initial.invites] : [],
    notifications: initial.notifications ? [...initial.notifications] : [],
    bets: initial.bets ? [...initial.bets] : [],
    settlements: initial.settlements ? [...initial.settlements] : [],
  };

  const prisma = {
    $transaction: async <T>(fn: (client: typeof prisma) => Promise<T>): Promise<T> => fn(prisma),
    event: {
      findMany: async ({ where, include, orderBy }: any = {}) => {
        let records = state.events.slice();

        if (where?.memberships?.some?.userId) {
          const userId = where.memberships.some.userId;
          const allowedEventIds = new Set(
            state.memberships.filter((membership) => membership.userId === userId).map((membership) => membership.eventId),
          );
          records = records.filter((event) => allowedEventIds.has(event.id));
        }

        if (orderBy?.startsAt === 'asc') {
          // events do not track startsAt in test state, keep order as-is
        }

        return records.map((event) => {
          const payload: any = { ...event };

          if (include?.subCompetitions) {
            payload.subCompetitions = state.subCompetitions
              .filter((sub) => sub.eventId === event.id)
              .map((sub) => ({ ...sub, participants: include.subCompetitions.include?.participants ? [] : undefined }));

            if (include.subCompetitions.include?.participants) {
              payload.subCompetitions = payload.subCompetitions.map((sub: any) => ({
                ...sub,
                participants: state.participants.filter((participant) => participant.subCompetitionId === sub.id),
              }));
            }
          }

          if (include?.participants) {
            payload.participants = state.participants.filter((participant) => participant.eventId === event.id);
          }

          if (include?.memberships) {
            payload.memberships = state.memberships
              .filter((membership) => membership.eventId === event.id)
              .map((membership) => ({ userId: membership.userId, role: membership.role }));
          }

          return payload;
        });
      },
    },
    subCompetition: {
      findUnique: async ({ where }: any) => {
        const record = state.subCompetitions.find((sub) => sub.id === where.id);
        if (!record) {
          return null;
        }
        return { ...record };
      },
      findMany: async ({ where, include, orderBy }: any = {}) => {
        let records = state.subCompetitions.slice();

        if (where?.event?.id) {
          records = records.filter((sub) => sub.eventId === where.event.id);
        }

        if (where?.event?.memberships?.some?.userId) {
          const userId = where.event.memberships.some.userId;
          const allowedEventIds = new Set(
            state.memberships.filter((membership) => membership.userId === userId).map((membership) => membership.eventId),
          );
          records = records.filter((sub) => allowedEventIds.has(sub.eventId));
        }

        if (orderBy?.startsAt === 'asc') {
          // no-op for deterministic order
        }

        return records.map((sub) => {
          const payload: any = { ...sub };
          if (include?.event) {
            payload.event = state.events.find((event) => event.id === sub.eventId) ?? null;
          }
          if (include?.participants) {
            payload.participants = state.participants.filter((participant) => participant.subCompetitionId === sub.id);
          }
          return payload;
        });
      },
    },
    eventMembership: {
      findUnique: async ({ where }: any) => {
        if (where?.eventId_userId) {
          const { eventId, userId } = where.eventId_userId;
          const record = state.memberships.find((membership) => membership.eventId === eventId && membership.userId === userId);
          return record ? { ...record } : null;
        }
        if (where?.id) {
          const record = state.memberships.find((membership) => membership.id === where.id);
          return record ? { ...record } : null;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const record: MembershipRecord = {
          id: data.id ?? randomUUID(),
          eventId: data.eventId,
          userId: data.userId,
          role: data.role ?? EventRole.MEMBER,
          createdAt: data.createdAt ?? new Date(),
        };
        state.memberships.push(record);
        return { ...record };
      },
      findMany: async ({ where, include, orderBy }: any = {}) => {
        let records = state.memberships.slice();

        if (where?.eventId) {
          records = records.filter((membership) => membership.eventId === where.eventId);
        }

        if (orderBy?.createdAt === 'asc') {
          records = records.slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }

        return records.map((record) => {
          const payload: any = { ...record };
          if (include?.user?.select) {
            const user = state.users.find((entry) => entry.id === record.userId) ?? null;
            if (user) {
              payload.user = {};
              Object.keys(include.user.select).forEach((key) => {
                if (include.user.select[key]) {
                  (payload.user as any)[key] = (user as any)[key];
                }
              });
            } else {
              payload.user = null;
            }
          }
          return payload;
        });
      },
      update: async ({ where, data }: any) => {
        const record = state.memberships.find((membership) => membership.id === where.id);
        if (!record) {
          throw new Error('Membership not found');
        }
        Object.assign(record, data);
        return { ...record };
      },
    },
    eventInvite: {
      create: async ({ data }: any) => {
        const record: InviteRecord = {
          id: data.id ?? randomUUID(),
          eventId: data.eventId,
          codeHash: data.codeHash,
          createdBy: data.createdBy,
          expiresAt: data.expiresAt ?? null,
          maxUses: data.maxUses ?? null,
          usedCount: data.usedCount ?? 0,
          revokedAt: data.revokedAt ?? null,
        };
        state.invites.push(record);
        return { ...record };
      },
      findMany: async ({ where, include }: any = {}) => {
        let records = state.invites.slice();
        if (where?.revokedAt === null) {
          records = records.filter((invite) => invite.revokedAt === null);
        }
        return records.map((record) => {
          const payload: any = { ...record };
          if (include?.event) {
            payload.event = state.events.find((event) => event.id === record.eventId) ?? null;
          }
          return payload;
        });
      },
      findUnique: async ({ where }: any) => {
        const record = state.invites.find((invite) => invite.id === where.id);
        return record ? { ...record } : null;
      },
      update: async ({ where, data }: any) => {
        const record = state.invites.find((invite) => invite.id === where.id);
        if (!record) {
          throw new Error('Invite not found');
        }
        Object.assign(record, data);
        return { ...record };
      },
    },
    notification: {
      create: async ({ data }: any) => {
        const record: NotificationRecord = {
          id: data.id ?? randomUUID(),
          userId: data.userId,
          type: data.type,
          payload: data.payload,
          readAt: data.readAt ?? null,
          createdAt: data.createdAt ?? new Date(),
        };
        state.notifications.push(record);
        return { ...record };
      },
      findMany: async ({ where, orderBy, take, skip, cursor }: any = {}) => {
        let records = state.notifications.filter((notification) => notification.userId === where?.userId);
        if (orderBy?.createdAt === 'desc') {
          records = records.slice().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        }
        if (cursor?.id) {
          const index = records.findIndex((record) => record.id === cursor.id);
          if (index >= 0) {
            records = records.slice(index + (skip ?? 0));
          }
        }
        if (take) {
          records = records.slice(0, take);
        }
        return records.map((record) => ({ ...record }));
      },
      findUnique: async ({ where }: any) => {
        const record = state.notifications.find((notification) => notification.id === where.id);
        return record ? { ...record } : null;
      },
      update: async ({ where, data }: any) => {
        const record = state.notifications.find((notification) => notification.id === where.id);
        if (!record) {
          throw new Error('Notification not found');
        }
        Object.assign(record, data);
        return { ...record };
      },
    },
    settlement: {
      findUnique: async ({ where, include }: any) => {
        const record = state.settlements.find((settlement) => settlement.id === where.id);
        if (!record) {
          return null;
        }
        const payload: any = { ...record };
        if (include?.bet) {
          const bet = state.bets.find((entry) => entry.id === record.betId);
          if (bet) {
            payload.bet = {
              ...bet,
              subCompetition: {
                id: bet.subCompetitionId,
                eventId: bet.eventId,
              },
            };
          } else {
            payload.bet = null;
          }
        }
        return payload;
      },
      update: async ({ where, data }: any) => {
        const record = state.settlements.find((settlement) => settlement.id === where.id);
        if (!record) {
          throw new Error('Settlement not found');
        }
        Object.assign(record, data);
        return { ...record };
      },
    },
    bet: {
      findMany: async ({ where, include }: any = {}) => {
        let records = state.bets.slice();

        if (where?.subCompetition?.eventId) {
          records = records.filter((bet) => bet.eventId === where.subCompetition.eventId);
        }

        if (where?.subCompetition?.event?.memberships?.some?.userId) {
          const userId = where.subCompetition.event.memberships.some.userId;
          const allowedEventIds = new Set(
            state.memberships.filter((membership) => membership.userId === userId).map((membership) => membership.eventId),
          );
          records = records.filter((bet) => allowedEventIds.has(bet.eventId));
        }

        return records.map((record) => {
          const payload: any = { ...record };
          if (include?.bet) {
            payload.bet = record;
          }
          return payload;
        });
      },
    },
  } as const;

  return {
    prisma: prisma as any,
    state,
    reset: () => {
      state.users = [];
      state.events = [];
      state.subCompetitions = [];
      state.participants = [];
      state.memberships = [];
      state.invites = [];
      state.notifications = [];
      state.bets = [];
      state.settlements = [];
    },
  };
}
