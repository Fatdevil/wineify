import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { requireEventRole } from '../services/acl.service';
import { EventRole } from '@prisma/client';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : null;

  if (eventId) {
    try {
      await requireEventRole(eventId, req.user!.id, EventRole.MEMBER);
    } catch (error) {
      const status = (error as any)?.statusCode ?? 403;
      const message = error instanceof Error ? error.message : 'Forbidden.';
      return res.status(status).json({ ok: false, message });
    }
  }

  const bets = await prisma.bet.findMany({
    where: {
      subCompetition: {
        ...(eventId ? { eventId } : {}),
        event: {
          memberships: {
            some: {
              userId: req.user!.id,
            },
          },
        },
      },
    },
    include: {
      user: true,
      subCompetition: true,
      participant: true,
      settlement: true,
      result: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return res.status(200).json({
    ok: true,
    bets,
  });
});

router.post('/', async (_req, res) => {
  return res.status(200).json({
    ok: true,
    message: 'Bet placement coming soon.',
  });
});

export default router;
