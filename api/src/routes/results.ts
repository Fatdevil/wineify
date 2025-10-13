import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { recordResult } from '../modules/results/results.service';
import { computePayouts } from '../modules/results/payouts.service';

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

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const result = await prisma.result.findUnique({
    where: { id },
    include: {
      subCompetition: true,
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

  const payouts = await computePayouts(result.subCompetitionId);

  return res.status(200).json({
    ok: true,
    data: {
      result,
      payouts,
    },
  });
});

router.post('/', async (req, res) => {
  const { subCompetitionId, winningEntryId } = req.body ?? {};

  if (!subCompetitionId || !winningEntryId) {
    return res.status(400).json({
      ok: false,
      message: 'subCompetitionId and winningEntryId are required.',
    });
  }

  try {
    const payload = await recordResult(subCompetitionId, winningEntryId);

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
