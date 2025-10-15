import { Router } from 'express';
import { EventRole, SettlementStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { generateSettlements } from '../modules/settlements/settlements.service';
import { getUserStats, updateStatsForSettlement } from '../services/stats.service';
import { requireAuth } from '../middleware/requireAuth';
import { rateLimitAccount } from '../middleware/rateLimitAccount';
import { audit } from '../middleware/audit';
import { requireEventRole } from '../services/acl.service';
import { notify, notifyMany } from '../services/notify.service';

const router = Router();

router.use(requireAuth);
router.use(rateLimitAccount);
router.use(audit);

router.get('/', async (req, res) => {
  const settlements = await prisma.settlement.findMany({
    where: {
      bet: {
        subCompetition: {
          event: {
            memberships: {
              some: {
                userId: req.user!.id,
              },
            },
          },
        },
      },
    },
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

router.post('/:id/mark-received', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ ok: false, message: 'Missing settlement identifier.' });
  }

  try {
    const existing = await prisma.settlement.findUnique({
      where: { id },
      include: {
        bet: {
          include: {
            subCompetition: {
              select: {
                eventId: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Settlement not found.' });
    }

    const eventId = existing.bet?.subCompetition?.eventId;

    if (!eventId) {
      return res.status(400).json({ ok: false, message: 'Unable to determine event for settlement.' });
    }

    await requireEventRole(eventId, req.user!.id, EventRole.ADMIN);

    const { settlement, stats } = await prisma.$transaction(async (tx) => {
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

    const payerId = existing.bet.userId;
    const payeeId = stats.userId;
    const recipients = Array.from(new Set([payerId, payeeId].filter(Boolean)));

    await notifyMany(recipients, 'SETTLEMENT_RECEIVED', {
      obligationId: settlement.id,
    });

    res.locals.audit = {
      eventType: 'settlements:mark-received',
      targetId: id,
      meta: {
        payerId,
        payeeId,
      },
    };

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

router.get('/events/:eventId', async (req, res) => {
  const { eventId } = req.params;

  try {
    await requireEventRole(eventId, req.user!.id, EventRole.ADMIN);
  } catch (error) {
    const status = (error as any)?.statusCode ?? 403;
    const message = error instanceof Error ? error.message : 'Forbidden.';
    return res.status(status).json({ ok: false, message });
  }

  try {
    const data = await generateSettlements(eventId);

    const settlementCounts = new Map<string, number>();

    for (const payout of data.payouts) {
      settlementCounts.set(payout.userId, (settlementCounts.get(payout.userId) ?? 0) + 1);
    }

    await Promise.all(
      Array.from(settlementCounts.entries()).map(([userId, count]) =>
        notify(userId, 'SETTLEMENT_GENERATED', {
          eventId,
          count,
        }),
      ),
    );

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
