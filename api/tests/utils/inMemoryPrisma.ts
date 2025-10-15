import { randomUUID } from 'node:crypto';
import { EventRole, Role } from '@prisma/client';

interface MockUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MockSessionRecord {
  id: string;
  userId: string;
  refreshHash: string;
  userAgent?: string | null;
  ip?: string | null;
  createdAt: Date;
  revokedAt: Date | null;
}

interface MockWalletRecord {
  id: string;
  type: string;
  code: string | null;
  userId: string | null;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MockTransactionRecord {
  id: string;
  walletId: string;
  type: string;
  reason: string;
  amount: number;
  balance: number;
  referenceType: string | null;
  referenceId: string | null;
  metadata: unknown;
  createdAt: Date;
}

const applySelect = <T extends Record<string, any>>(record: T, select?: Record<string, boolean>) => {
  if (!select) {
    return { ...record };
  }

  return Object.entries(select).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value) {
      acc[key] = record[key as keyof T];
    }

    return acc;
  }, {});
};

const matchesWhere = (record: MockSessionRecord, where: Record<string, unknown>) => {
  return Object.entries(where).every(([key, value]) => {
    const current = record[key as keyof MockSessionRecord];

    if (value === null) {
      return current === null;
    }

    return current === value;
  });
};

export const createInMemoryPrisma = () => {
  const users = new Map<string, MockUserRecord>();
  const sessions = new Map<string, MockSessionRecord>();
  const auditLogs: Array<{
    id: string;
    userId: string | null;
    eventType: string;
    targetId: string | null;
    ip: string | null;
    meta: unknown;
    createdAt: Date;
  }> = [];
  const subCompetitions = new Map<string, { id: string; eventId: string }>([
    ['abc', { id: 'abc', eventId: 'event-1' }],
  ]);
  const eventMemberships = new Map<string, { id: string; eventId: string; userId: string; role: EventRole }>();
  const wallets = new Map<string, MockWalletRecord>();
  const transactions: MockTransactionRecord[] = [];

  const findWalletByWhere = (where: any): MockWalletRecord | null => {
    if (!where) {
      return null;
    }

    if (where.id && wallets.has(where.id)) {
      return wallets.get(where.id)!;
    }

    if (where.userId) {
      return Array.from(wallets.values()).find((wallet) => wallet.userId === where.userId) ?? null;
    }

    if (where.code) {
      return Array.from(wallets.values()).find((wallet) => wallet.code === where.code) ?? null;
    }

    return null;
  };

  const toNumber = (value: unknown): number => {
    if (typeof value === 'number') {
      return value;
    }

    if (value && typeof (value as any).toNumber === 'function') {
      return (value as any).toNumber();
    }

    if (value && typeof (value as any).toString === 'function') {
      const parsed = Number((value as any).toString());
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    const parsed = Number(value ?? 0);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const prisma: any = {
    $transaction: async (callback: (tx: typeof prisma) => Promise<any>) => callback(prisma),
    user: {
      findUnique: async ({ where, select }: any) => {
        const { id, email } = where ?? {};
        let record: MockUserRecord | undefined;

        if (id) {
          record = users.get(id);
        }

        if (!record && email) {
          record = Array.from(users.values()).find((user) => user.email === email);
        }

        if (!record) {
          return null;
        }

        return applySelect(record, select);
      },
      create: async ({ data }: any) => {
        const id = randomUUID();
        const now = new Date();
        const record: MockUserRecord = {
          id,
          email: data.email,
          passwordHash: data.passwordHash,
          role: data.role ?? Role.USER,
          isBanned: data.isBanned ?? false,
          createdAt: data.createdAt ?? now,
          updatedAt: data.updatedAt ?? now,
        };

        users.set(id, record);

        return { ...record };
      },
      findMany: async ({ where, select, orderBy }: any = {}) => {
        let records = Array.from(users.values());

        if (where?.role) {
          records = records.filter((user) => user.role === where.role);
        }

        if (orderBy?.createdAt === 'asc') {
          records = records.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }

        return records.map((record) => applySelect(record, select));
      },
      update: async ({ where, data, select }: any) => {
        const { id } = where ?? {};

        if (!id || !users.has(id)) {
          throw new Error('User not found.');
        }

        const existing = users.get(id)!;
        const updated: MockUserRecord = {
          ...existing,
          ...data,
          updatedAt: data?.updatedAt ?? new Date(),
        };

        users.set(id, updated);

        return applySelect(updated, select);
      },
    },
    session: {
      create: async ({ data }: any) => {
        const id = randomUUID();
        const record: MockSessionRecord = {
          id,
          userId: data.userId,
          refreshHash: data.refreshHash,
          userAgent: data.userAgent ?? null,
          ip: data.ip ?? null,
          createdAt: data.createdAt ?? new Date(),
          revokedAt: data.revokedAt ?? null,
        };

        sessions.set(id, record);

        return { ...record };
      },
      findUnique: async ({ where }: any) => {
        const { id } = where ?? {};

        if (!id) {
          return null;
        }

        const record = sessions.get(id);

        return record ? { ...record } : null;
      },
      update: async ({ where, data }: any) => {
        const { id } = where ?? {};

        if (!id) {
          throw new Error('Session not found.');
        }

        const existing = sessions.get(id);

        if (!existing) {
          throw new Error('Session not found.');
        }

        const updated: MockSessionRecord = {
          ...existing,
          ...data,
        };

        sessions.set(id, updated);

        return { ...updated };
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;

        Array.from(sessions.entries()).forEach(([id, session]) => {
          if (!where || matchesWhere(session, where)) {
            sessions.set(id, { ...session, ...data });
            count += 1;
          }
        });

        return { count };
      },
      findMany: async ({ where, select, orderBy }: any = {}) => {
        let records = Array.from(sessions.values());

        if (where?.userId) {
          records = records.filter((session) => session.userId === where.userId);
        }

        if (where?.revokedAt === null) {
          records = records.filter((session) => session.revokedAt === null);
        }

        if (orderBy?.createdAt === 'desc') {
          records = records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } else if (orderBy?.createdAt === 'asc') {
          records = records.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }

        return records.map((record) => applySelect(record, select));
      },
    },
    wallet: {
      findUnique: async ({ where }: any) => {
        const record = findWalletByWhere(where);
        return record ? { ...record } : null;
      },
      upsert: async ({ where, create, update }: any) => {
        const existing = findWalletByWhere(where);

        if (existing) {
          const updated: MockWalletRecord = {
            ...existing,
            ...update,
            balance: update?.balance ? toNumber(update.balance) : existing.balance,
            updatedAt: new Date(),
          };
          wallets.set(updated.id, updated);
          return { ...updated };
        }

        const id = create.id ?? randomUUID();
        const now = new Date();
        const record: MockWalletRecord = {
          id,
          type: create.type ?? 'USER',
          code: create.code ?? null,
          userId: create.userId ?? null,
          balance: toNumber(create.balance ?? 0),
          createdAt: create.createdAt ?? now,
          updatedAt: create.updatedAt ?? now,
        };
        wallets.set(id, record);
        return { ...record };
      },
      update: async ({ where, data }: any) => {
        const existing = findWalletByWhere(where);

        if (!existing) {
          throw new Error('Wallet not found.');
        }

        const updated: MockWalletRecord = {
          ...existing,
          ...data,
          balance: data?.balance ? toNumber(data.balance) : existing.balance,
          updatedAt: data?.updatedAt ?? new Date(),
        };

        wallets.set(updated.id, updated);

        return { ...updated };
      },
    },
    transaction: {
      create: async ({ data }: any) => {
        const id = data.id ?? randomUUID();
        const record: MockTransactionRecord = {
          id,
          walletId: data.walletId,
          type: data.type,
          reason: data.reason,
          amount: toNumber(data.amount),
          balance: toNumber(data.balance),
          referenceType: data.referenceType ?? null,
          referenceId: data.referenceId ?? null,
          metadata: data.metadata ?? null,
          createdAt: data.createdAt ?? new Date(),
        };

        transactions.push(record);

        return { ...record };
      },
      findMany: async ({ where, orderBy, take, skip }: any = {}) => {
        let records = transactions.filter((transaction) => {
          if (!where?.walletId) {
            return true;
          }

          return transaction.walletId === where.walletId;
        });

        if (orderBy?.createdAt === 'desc') {
          records = records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } else if (orderBy?.createdAt === 'asc') {
          records = records.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }

        if (typeof skip === 'number' && skip > 0) {
          records = records.slice(skip);
        }

        if (typeof take === 'number' && take >= 0) {
          records = records.slice(0, take);
        }

        return records.map((record) => ({ ...record }));
      },
    },
    subCompetition: {
      findUnique: async ({ where }: any) => {
        const record = subCompetitions.get(where?.id);
        return record ? { ...record } : null;
      },
    },
    eventMembership: {
      findUnique: async ({ where }: any) => {
        if (where?.id) {
          const record = eventMemberships.get(where.id);
          return record ? { ...record } : null;
        }

        if (where?.eventId_userId) {
          const key = `${where.eventId_userId.eventId}:${where.eventId_userId.userId}`;
          const record = eventMemberships.get(key);
          return record ? { ...record } : null;
        }

        return null;
      },
      create: async ({ data }: any) => {
        const id = data.id ?? randomUUID();
        const record = {
          id,
          eventId: data.eventId,
          userId: data.userId,
          role: (data.role ?? EventRole.MEMBER) as EventRole,
        };
        eventMemberships.set(id, record);
        eventMemberships.set(`${record.eventId}:${record.userId}`, record);
        return { ...record };
      },
    },
  } as const;

  return {
    prisma,
    reset: () => {
      users.clear();
      sessions.clear();
      eventMemberships.clear();
      subCompetitions.clear();
      wallets.clear();
      transactions.length = 0;
      auditLogs.length = 0;
      subCompetitions.set('abc', { id: 'abc', eventId: 'event-1' });
    },
    state: {
      get users() {
        return users;
      },
      get sessions() {
        return sessions;
      },
      get wallets() {
        return wallets;
      },
      get transactions() {
        return transactions;
      },
      get eventMemberships() {
        return eventMemberships;
      },
      get subCompetitions() {
        return subCompetitions;
      },
      get auditLogs() {
        return auditLogs;
      },
    },
  };
};
