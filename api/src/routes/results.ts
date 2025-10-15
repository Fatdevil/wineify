import { Router } from 'express';
import { EventRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { recordResult } from '../modules/results/results.service';
import { computePayouts } from '../modules/results/payouts.service';
import { requireAuth } from '../middleware/requireAuth';
import { rateLimitAccount } from '../middleware/rateLimitAccount';
import { audit } from '../middleware/audit';
import { requireEventRole } from '../services/acl.service';
import { notifyEventMembers } from '../services/notify.service';
import { z } from 'zod';

const router = Router();

router.use(requireAuth);
router.use(rateLimitAccount);
router.use(audit);

router.get('/', async (req, res) => {
  const results = await prisma.result.findMany({
    where: {
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

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const result = await prisma.result.findUnique({
    where: { id },
    include: {
      subCompetition: {
        include: {
          event: {
            select: {
              id: true,
              memberships: {
                select: { userId: true },
              },
            },
          },
        },
      },
      participant: true,
      settlements: {
        include: {
          bet: true,
        },
      },
    },
  });

  if (!result) {
    return res.status(404).json({
      ok: false,
      message: 'Result not found.',
    });
  }

  const isMember = result.subCompetition.event.memberships.some((membership) => membership.userId === req.user!.id);

  if (!isMember) {
    return res.status(403).json({ ok: false, message: 'You must join this event to view results.' });
  }

  const payouts = await computePayouts(result.subCompetitionId);

  return res.status(200).json({
    ok: true,
    data: {
      result,
      payouts,
    },
  });
});

const recordSchema = z
  .object({
    subCompetitionId: z.string().min(1, 'subCompetitionId is required.'),
    winningEntryId: z.string().min(1, 'winningEntryId is required.'),
  })
  .strict();

router.post('/', async (req, res) => {
  const parseResult = recordSchema.safeParse(req.body ?? {});

  if (!parseResult.success) {
    return res.status(400).json({
      ok: false,
      errors: parseResult.error.issues.map((issue) => ({
        path: issue.path.join('.') || undefined,
        message: issue.message,
      })),
    });
  }

  const { subCompetitionId, winningEntryId } = parseResult.data;

  const subCompetition = await prisma.subCompetition.findUnique({
    where: { id: subCompetitionId },
    select: { eventId: true },
  });

  if (!subCompetition) {
    return res.status(404).json({ ok: false, message: 'Sub-competition not found.' });
  }

  try {
    await requireEventRole(subCompetition.eventId, req.user!.id, EventRole.ADMIN);
  } catch (error) {
    const status = (error as any)?.statusCode ?? 403;
    const message = error instanceof Error ? error.message : 'Forbidden.';
    return res.status(status).json({ ok: false, message });
  }

  try {
    const payload = await recordResult(subCompetitionId, winningEntryId);

    res.locals.audit = {
      eventType: 'results:record',
      targetId: subCompetitionId,
      meta: {
        winningEntryId,
      },
    };

    await notifyEventMembers(subCompetition.eventId, 'RESULT_POSTED', {
      eventId: payload.eventId,
      subCompetitionId,
      winnerRef: winningEntryId,
    });

    return res.status(201).json({
      ok: true,
      data: payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to record result.';

    return res.status(400).json({
      ok: false,
      message,
    });
  }
});

export default router;
