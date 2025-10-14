import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

router.use(requireAuth);

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

router.post('/', async (_req, res) => {
  return res.status(200).json({
    ok: true,
    message: 'Event creation coming soon.',
  });
});

export default router;
