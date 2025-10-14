import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { checkAndGrantAchievements } from '../services/achievements.service';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const achievements = await (prisma as any).achievement.findMany({
      orderBy: { xpReward: 'desc' },
    });
    return res.status(200).json({ ok: true, achievements });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load achievements.';
    return res.status(500).json({ ok: false, message });
  }
});

router.get('/mine', async (req, res) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : null;

  if (!userId) {
    return res.status(400).json({ ok: false, message: 'Missing user identifier.' });
  }

  try {
    const userAchievements = await (prisma as any).userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: { achievedAt: 'asc' },
    });

    return res.status(200).json({ ok: true, achievements: userAchievements });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load user achievements.';
    return res.status(500).json({ ok: false, message });
  }
});

router.post('/check', async (req, res) => {
  const { userId } = req.body ?? {};

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ ok: false, message: 'Missing user identifier.' });
  }

  try {
    const result = await checkAndGrantAchievements(userId);
    return res.status(200).json({ ok: true, granted: result.granted });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to trigger achievement checks.';
    return res.status(500).json({ ok: false, message });
  }
});

export default router;
