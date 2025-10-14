import { Router } from 'express';
import { getLeaderboard, getUserStats } from '../services/stats.service';

const router = Router();

router.get('/leaderboard', async (_req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    return res.status(200).json({ ok: true, leaderboard });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load leaderboard.';
    return res.status(500).json({ ok: false, message });
  }
});

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ ok: false, message: 'Missing user identifier.' });
  }

  try {
    const stats = await getUserStats(userId);
    return res.status(200).json({ ok: true, stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load user stats.';
    return res.status(500).json({ ok: false, message });
  }
});

export default router;
