import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { requireAuth, requireRole } from '../../middleware/requireAuth';
import { rateLimitAccount } from '../../middleware/rateLimitAccount';
import { audit } from '../../middleware/audit';
import { ensureHouseWallet, getWalletHistory } from '../../services/wallet.service';

const router = Router();

router.use(requireAuth);
router.use(rateLimitAccount);
router.use(requireRole(Role.ADMIN));
router.use(audit);

const serializeWallet = (wallet: { id: string; balance: unknown; createdAt: Date; updatedAt: Date }) => ({
  id: wallet.id,
  balance: Number(wallet.balance),
  createdAt: wallet.createdAt,
  updatedAt: wallet.updatedAt,
});

const serializeTransaction = (entry: {
  id: string;
  type: string;
  reason: string;
  amount: unknown;
  balance: unknown;
  referenceType: string | null;
  referenceId: string | null;
  metadata: unknown;
  createdAt: Date;
}) => ({
  id: entry.id,
  type: entry.type,
  reason: entry.reason,
  amount: Number(entry.amount),
  balance: Number(entry.balance),
  referenceType: entry.referenceType,
  referenceId: entry.referenceId,
  metadata: entry.metadata ?? null,
  createdAt: entry.createdAt,
});

router.get('/', async (_req, res) => {
  const wallet = await ensureHouseWallet(prisma);
  const history = await getWalletHistory(wallet.id, { take: 20 }, prisma);

  return res.status(200).json({
    ok: true,
    wallet: serializeWallet(wallet),
    history: history.map(serializeTransaction),
  });
});

export default router;
