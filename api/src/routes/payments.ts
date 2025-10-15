import { randomUUID } from 'crypto';
import { PurchaseStatus } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';
import { rateLimitAccount } from '../middleware/rateLimitAccount';
import { audit } from '../middleware/audit';
import {
  convertUnitsToCurrency,
  creditWalletOnSuccess,
  markPurchaseComplete,
  recordPurchase,
} from '../services/monetisation.service';

const router = Router();

router.use(requireAuth);
router.use(rateLimitAccount);
router.use(audit);

const toNumber = (value: unknown) => Number.parseInt(String(value ?? ''), 10);

const serializePurchase = (purchase: {
  id: string;
  sessionId: string;
  userId: string;
  units: number;
  amountEUR: any;
  currencyCode: string;
  currencyAmount: any;
  paymentMethod: string;
  status: PurchaseStatus;
  txnRef: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  walletCreditedAt: Date | null;
}) => ({
  id: purchase.id,
  sessionId: purchase.sessionId,
  units: purchase.units,
  amountEUR: Number(purchase.amountEUR.toString()),
  currencyCode: purchase.currencyCode,
  currencyAmount: Number(purchase.currencyAmount.toString()),
  paymentMethod: purchase.paymentMethod,
  status: purchase.status,
  txnRef: purchase.txnRef,
  createdAt: purchase.createdAt,
  updatedAt: purchase.updatedAt,
  completedAt: purchase.completedAt,
  walletCreditedAt: purchase.walletCreditedAt,
});

router.post('/create-session', async (req, res) => {
  const rawUnits = req.body?.units;
  const currency = typeof req.body?.currency === 'string' ? req.body.currency : 'EUR';
  const units = typeof rawUnits === 'number' ? rawUnits : Number.parseInt(String(rawUnits ?? ''), 10);

  if (!Number.isFinite(units) || units <= 0) {
    return res.status(400).json({ ok: false, error: 'Units must be a positive number.' });
  }

  try {
    const quote = await convertUnitsToCurrency(units, currency);
    const purchase = await recordPurchase(req.user!.id, units, quote.amountEUR, 'mock', {
      currencyCode: quote.currencyCode,
      currencyAmount: quote.amount,
    });

    return res.status(201).json({
      ok: true,
      sessionId: purchase.sessionId,
      quote: {
        currency: quote.currencyCode,
        amount: Number(quote.amount.toString()),
        amountEUR: Number(quote.amountEUR.toString()),
        rate: Number(quote.rate.toString()),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create purchase session.';

    return res.status(400).json({ ok: false, error: message });
  }
});

router.post('/confirm', async (req, res) => {
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : null;

  if (!sessionId) {
    return res.status(400).json({ ok: false, error: 'sessionId is required.' });
  }

  const purchase = await prisma.purchase.findUnique({ where: { sessionId } });

  if (!purchase || purchase.userId !== req.user!.id) {
    return res.status(404).json({ ok: false, error: 'Purchase session not found.' });
  }

  let updated = purchase;

  if (purchase.status !== PurchaseStatus.COMPLETED) {
    const txnRef = purchase.txnRef ?? `MOCK-${randomUUID()}`;
    updated = await markPurchaseComplete(purchase.id, txnRef);
  }

  const credited = await creditWalletOnSuccess(updated.id);

  return res.status(200).json({
    ok: true,
    purchase: serializePurchase(credited),
  });
});

router.get('/history', async (req, res) => {
  const limit = toNumber(req.query.limit);
  const offset = toNumber(req.query.offset);

  const take = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 20;
  const skip = Number.isFinite(offset) && offset > 0 ? offset : 0;

  const purchases = await prisma.purchase.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  });

  return res.status(200).json({
    ok: true,
    purchases: purchases.map(serializePurchase),
  });
});

export default router;
