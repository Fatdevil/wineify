import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { rateLimitAccount } from '../middleware/rateLimitAccount';
import { audit } from '../middleware/audit';
import { getWalletForUser, getWalletHistory } from '../services/wallet.service';

const router = Router();

router.use(requireAuth);
router.use(rateLimitAccount);
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

router.get('/', async (req, res) => {
  const wallet = await getWalletForUser(req.user!.id, prisma);
  const history = await getWalletHistory(wallet.id, { take: 5 }, prisma);

  return res.status(200).json({
    ok: true,
    wallet: serializeWallet(wallet),
    recent: history.map(serializeTransaction),
  });
});

router.get('/history', async (req, res) => {
  const wallet = await getWalletForUser(req.user!.id, prisma);
  const limit = Number.parseInt(String(req.query.limit ?? ''), 10);
  const offset = Number.parseInt(String(req.query.offset ?? ''), 10);
  const history = await getWalletHistory(
    wallet.id,
    {
      take: Number.isFinite(limit) ? limit : undefined,
      skip: Number.isFinite(offset) ? offset : undefined,
    },
    prisma,
  );

  return res.status(200).json({
    ok: true,
    wallet: serializeWallet(wallet),
    history: history.map(serializeTransaction),
  });
});

export default router;
