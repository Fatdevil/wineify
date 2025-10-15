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

  const prisma = {
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
