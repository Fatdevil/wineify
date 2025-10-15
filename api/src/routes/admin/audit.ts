import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { rateLimitAccount } from '../../middleware/rateLimitAccount';

const router = Router();

router.use(requireAuth);
router.use(rateLimitAccount);
router.use(requireRole(Role.ADMIN));

router.get('/', async (req, res) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  const eventType = typeof req.query.eventType === 'string' ? req.query.eventType : undefined;
  const limitRaw = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : undefined;
  const take = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw!, 1), 200) : 50;

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(eventType ? { eventType } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take,
  });

  return res.status(200).json({ ok: true, logs });
});

export default router;
