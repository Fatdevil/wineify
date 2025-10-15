import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { rateLimitAccount } from '../middleware/rateLimitAccount';
import { audit } from '../middleware/audit';
import { requireEventRole } from '../services/acl.service';
import { EventRole } from '@prisma/client';

const router = Router();

router.use(requireAuth);
router.use(rateLimitAccount);
router.use(audit);

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

  const subCompetitions = await prisma.subCompetition.findMany({
    where: {
      event: {
        ...(eventId ? { id: eventId } : {}),
        memberships: {
          some: {
            userId: req.user!.id,
          },
        },
      },
    },
    include: {
      event: true,
      participants: true,
    },
    orderBy: {
      startsAt: 'asc',
    },
  });

  return res.status(200).json({
    ok: true,
    subCompetitions,
  });
});

router.post('/', async (req, res) => {
  res.locals.audit = {
    eventType: 'subcompetitions:create',
    targetId: req.user?.id ?? null,
  };

  return res.status(200).json({
    ok: true,
    message: 'Sub-competition creation coming soon.',
  });
});

export default router;
