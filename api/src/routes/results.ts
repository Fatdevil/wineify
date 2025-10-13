import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const results = await prisma.result.findMany({
    include: {
      subCompetition: true,
      participant: true,
      bets: true,
      settlements: true,
    },
    orderBy: {
      recordedAt: 'desc',
    },
  });

  return res.status(200).json({
    ok: true,
    results,
  });
});

router.post('/', async (_req, res) => {
  return res.status(200).json({
    ok: true,
    message: 'Result recording coming soon.',
  });
});

export default router;
