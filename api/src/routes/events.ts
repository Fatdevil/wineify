import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const events = await prisma.event.findMany({
    include: {
      subCompetitions: {
        include: {
          participants: true,
        },
      },
      participants: true,
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
