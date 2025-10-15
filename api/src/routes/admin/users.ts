import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { rateLimitAccount } from '../../middleware/rateLimitAccount';
import { audit } from '../../middleware/audit';
import { revokeAll } from '../../services/auth.service';

const router = Router();

router.use(requireAuth);
router.use(rateLimitAccount);
router.use(requireRole(Role.ADMIN));
router.use(audit);

const sanitizeUser = (user: {
  id: string;
  email: string;
  role: Role;
  isBanned: boolean;
  createdAt: Date;
  sessions: { id: string; createdAt: Date; ip: string | null; userAgent: string | null }[];
}) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  isBanned: user.isBanned,
  createdAt: user.createdAt,
  sessions: user.sessions.map((session) => ({
    id: session.id,
    createdAt: session.createdAt,
    ip: session.ip,
    userAgent: session.userAgent,
  })),
});

router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      role: true,
      isBanned: true,
      createdAt: true,
      sessions: {
        where: { revokedAt: null },
        select: {
          id: true,
          createdAt: true,
          ip: true,
          userAgent: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return res.status(200).json({ ok: true, users: users.map(sanitizeUser) });
});

router.post('/:id/ban', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ ok: false, message: 'User identifier is required.' });
  }

  if (req.user!.id === id) {
    return res.status(400).json({ ok: false, message: 'Administrators cannot ban themselves.' });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { isBanned: true },
      select: {
        id: true,
        email: true,
        role: true,
        isBanned: true,
        createdAt: true,
      },
    });

    await revokeAll(id, { prisma });

    const sessions = await prisma.session.findMany({
      where: { userId: id, revokedAt: null },
      select: { id: true, createdAt: true, ip: true, userAgent: true },
      orderBy: { createdAt: 'desc' },
    });

    res.locals.audit = {
      eventType: 'admin:user:ban',
      targetId: id,
    };

    return res.status(200).json({ ok: true, user: sanitizeUser({ ...updated, sessions }) });
  } catch (error) {
    return res.status(404).json({ ok: false, message: 'User not found.' });
  }
});

router.post('/:id/unban', async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ ok: false, message: 'User identifier is required.' });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { isBanned: false },
      select: {
        id: true,
        email: true,
        role: true,
        isBanned: true,
        createdAt: true,
      },
    });

    const sessions = await prisma.session.findMany({
      where: { userId: id, revokedAt: null },
      select: { id: true, createdAt: true, ip: true, userAgent: true },
      orderBy: { createdAt: 'desc' },
    });

    res.locals.audit = {
      eventType: 'admin:user:unban',
      targetId: id,
    };

    return res.status(200).json({ ok: true, user: sanitizeUser({ ...updated, sessions }) });
  } catch (error) {
    return res.status(404).json({ ok: false, message: 'User not found.' });
  }
});

export default router;
