import { Router } from 'express';
import { EventRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { requireEventAdmin, requireEventMember } from '../middleware/requireEventMember';
import { changeMemberRole } from '../services/acl.service';

const router = Router();

const updateRoleSchema = z
  .object({
    role: z.nativeEnum(EventRole, { message: 'role must be a valid event role.' }),
  })
  .strict();

router.use(requireAuth);

router.get('/events/:eventId/members', requireEventMember((req) => req.params.eventId ?? null), async (req, res) => {
  const eventId = req.params.eventId as string;

  const members = await prisma.eventMembership.findMany({
    where: { eventId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return res.status(200).json({ ok: true, members });
});

router.post(
  '/events/:eventId/members/:userId/role',
  requireEventAdmin((req) => req.params.eventId ?? null),
  async (req, res) => {
    const parseResult = updateRoleSchema.safeParse(req.body ?? {});

    if (!parseResult.success) {
      return res.status(400).json({
        ok: false,
        errors: parseResult.error.issues.map((issue) => ({
          path: issue.path.join('.') || undefined,
          message: issue.message,
        })),
      });
    }

    const eventId = req.params.eventId as string;
    const targetUserId = req.params.userId as string;

    try {
      const membership = await changeMemberRole(eventId, targetUserId, parseResult.data.role, req.user!.id);
      return res.status(200).json({ ok: true, membership });
    } catch (error) {
      const status = (error as any)?.statusCode ?? 400;
      const message = error instanceof Error ? error.message : 'Unable to update role.';

      return res.status(status).json({ ok: false, message });
    }
  },
);

export default router;
