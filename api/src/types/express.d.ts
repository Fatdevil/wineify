import type { Prisma, Role } from '@prisma/client';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      role: Role;
    }

    interface Request {
      user?: AuthenticatedUser;
    }

    interface Locals {
      audit?: {
        eventType?: string;
        targetId?: string | null;
        meta?: Prisma.JsonValue;
      };
    }
  }
}

export {};
