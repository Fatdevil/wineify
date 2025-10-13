import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const subCompetitions = await prisma.subCompetition.findMany({
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

router.post('/', async (_req, res) => {
  return res.status(200).json({
    ok: true,
    message: 'Sub-competition creation coming soon.',
  });
});

export default router;
