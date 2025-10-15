import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { rateLimitAccount } from '../middleware/rateLimitAccount';
import { audit } from '../middleware/audit';

const router = Router();

router.use(requireAuth);
router.use(rateLimitAccount);
router.use(audit);

router.get('/', async (req, res) => {
  const events = await prisma.event.findMany({
    where: {
      memberships: {
        some: {
          userId: req.user!.id,
        },
      },
    },
    include: {
      subCompetitions: {
        include: {
          participants: true,
        },
      },
      participants: true,
      memberships: {
        select: {
          userId: true,
          role: true,
        },
      },
    },
    orderBy: {
      startsAt: 'asc',
    },
  });

  return res.status(200).json({
    ok: true,
    events,
  });
});

router.post('/', async (req, res) => {
  res.locals.audit = {
    eventType: 'events:create',
    targetId: req.user?.id ?? null,
  };

  return res.status(200).json({
    ok: true,
    message: 'Event creation coming soon.',
  });
});

export default router;
