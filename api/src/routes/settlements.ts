import { Router } from 'express';
import { Role, SettlementStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { generateSettlements } from '../modules/settlements/settlements.service';
import { getUserStats, updateStatsForSettlement } from '../services/stats.service';
import { requireAuth, requireRole } from '../middleware/requireAuth';

const router = Router();

router.use(requireAuth);

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

router.post('/:id/mark-received', requireRole(Role.ADMIN), async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ ok: false, message: 'Missing settlement identifier.' });
  }

  try {
    const { settlement, stats } = await prisma.$transaction(async (tx) => {
      const existing = await tx.settlement.findUnique({ where: { id } });

      if (!existing) {
        throw new Error('Settlement not found.');
      }

      const updatedSettlement = await tx.settlement.update({
        where: { id },
        data: {
          status: SettlementStatus.COMPLETED,
          settledAt: new Date(),
        },
      });

      const updatedStats = await updateStatsForSettlement(id, tx);

      return { settlement: updatedSettlement, stats: updatedStats };
    });

    const profile = await getUserStats(stats.userId);

    return res.status(200).json({
      ok: true,
      settlement,
      stats: profile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update settlement.';
    const statusCode = message === 'Settlement not found.' ? 404 : 500;

    return res.status(statusCode).json({
      ok: false,
      message,
    });
  }
});

router.get('/events/:eventId', requireRole(Role.ADMIN), async (req, res) => {
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
