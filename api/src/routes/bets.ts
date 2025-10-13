import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const bets = await prisma.bet.findMany({
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
