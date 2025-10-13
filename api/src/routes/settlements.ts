import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { generateSettlements } from '../modules/settlements/settlements.service';

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

router.get('/events/:eventId', async (req, res) => {
  const { eventId } = req.params;

  try {
    const data = await generateSettlements(eventId);

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate settlements.';

    return res.status(404).json({
      ok: false,
      message,
    });
  }
});

export default router;
