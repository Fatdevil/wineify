import { randomUUID } from 'node:crypto';
import { Role } from '@prisma/client';

interface MockUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
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
          createdAt: data.createdAt ?? now,
          updatedAt: data.updatedAt ?? now,
        };

        users.set(id, record);

        return { ...record };
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
    },
  } as const;

  return {
    prisma,
    reset: () => {
      users.clear();
      sessions.clear();
    },
    state: {
      get users() {
        return users;
      },
      get sessions() {
        return sessions;
      },
    },
  };
};
