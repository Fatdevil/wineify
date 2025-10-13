import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const settlements = await prisma.settlement.findMany({
    include: {
      bet: {
        include: {
          user: true,
          subCompetition: true,
          participant: true,
        },
      },
      result: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return res.status(200).json({
    ok: true,
    settlements,
  });
});

router.post('/', async (_req, res) => {
  return res.status(200).json({
    ok: true,
    message: 'Settlement calculation coming soon.',
  });
});

export default router;
