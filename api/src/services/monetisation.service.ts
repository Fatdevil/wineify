import { randomUUID } from 'crypto';
import { Prisma, PurchaseStatus, TransactionReason } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { creditWallet, ensureUserWallet } from './wallet.service';

const EUR_PER_UNIT = new Prisma.Decimal(0.5);

type NumericInput = Prisma.Decimal | number | string;

const asDecimal = (value: NumericInput): Prisma.Decimal => {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  return new Prisma.Decimal(value);
};

const ensurePositiveUnits = (units: number) => {
  if (!Number.isFinite(units) || units <= 0) {
    throw new Error('Units must be a positive number.');
  }
};

const normaliseCurrencyCode = (code?: string) => code?.toUpperCase() ?? 'EUR';

export const convertUnitsToCurrency = async (units: number, code: string) => {
  ensurePositiveUnits(units);

  const currencyCode = normaliseCurrencyCode(code);
  const amountEUR = new Prisma.Decimal(units).mul(EUR_PER_UNIT);

  if (currencyCode === 'EUR') {
    return {
      currencyCode,
      amount: amountEUR,
      amountEUR,
      rate: new Prisma.Decimal(1),
    } as const;
  }

  const rate = await prisma.currencyRate.findUnique({ where: { code: currencyCode } });

  if (!rate) {
    throw new Error(`Currency ${currencyCode} is not supported.`);
  }

  const amount = amountEUR.mul(rate.rate);

  return {
    currencyCode,
    amount,
    amountEUR,
    rate: rate.rate,
  } as const;
};

interface RecordPurchaseOptions {
  currencyCode?: string;
  currencyAmount?: NumericInput;
  sessionId?: string;
}

export const recordPurchase = async (
  userId: string,
  units: number,
  amountEUR: NumericInput,
  method: string,
  options?: RecordPurchaseOptions,
) => {
  ensurePositiveUnits(units);

  const eurAmount = asDecimal(amountEUR);
  const currencyCode = normaliseCurrencyCode(options?.currencyCode);
  const currencyAmount = asDecimal(options?.currencyAmount ?? eurAmount);
  const sessionId = options?.sessionId ?? randomUUID();

  return prisma.purchase.create({
    data: {
      sessionId,
      userId,
      units,
      amountEUR: eurAmount,
      currencyCode,
      currencyAmount,
      paymentMethod: method,
      status: PurchaseStatus.PENDING,
    },
  });
};

export const markPurchaseComplete = async (id: string, txnRef: string) => {
  return prisma.purchase.update({
    where: { id },
    data: {
      status: PurchaseStatus.COMPLETED,
      txnRef,
      completedAt: new Date(),
    },
  });
};

export const creditWalletOnSuccess = async (id: string) => {
  return prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({ where: { id } });

    if (!purchase) {
      throw new Error('Purchase not found.');
    }

    if (purchase.status !== PurchaseStatus.COMPLETED) {
      throw new Error('Purchase has not been completed.');
    }

    if (purchase.walletCreditedAt) {
      return purchase;
    }

    const wallet = await ensureUserWallet(purchase.userId, tx);

    await creditWallet(wallet, purchase.amountEUR, TransactionReason.UNIT_PURCHASE, tx, {
      referenceType: 'purchase',
      referenceId: purchase.id,
      metadata: {
        units: purchase.units,
        currencyCode: purchase.currencyCode,
        currencyAmount: purchase.currencyAmount,
      },
    });

    return tx.purchase.update({
      where: { id: purchase.id },
      data: {
        walletCreditedAt: new Date(),
      },
    });
  });
};
