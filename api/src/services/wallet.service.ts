import { Prisma, PrismaClient, TransactionReason, TransactionType, Wallet, WalletType } from '@prisma/client';
import type { Prisma as PrismaNamespace } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const HOUSE_WALLET_CODE = 'HOUSE';

const ZERO = new Prisma.Decimal(0);

type TransactionClient = PrismaClient | PrismaNamespace.TransactionClient;

type NumericInput = Prisma.Decimal | number | string;

type WalletWithBalance = Pick<Wallet, 'id' | 'balance'>;

interface TransactionOptions {
  referenceType?: string;
  referenceId?: string;
  metadata?: Prisma.InputJsonValue;
}

interface HistoryOptions {
  take?: number;
  skip?: number;
}

const asDecimal = (value: NumericInput): Prisma.Decimal => {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  return new Prisma.Decimal(value);
};

const getClient = (client?: TransactionClient): TransactionClient => client ?? prisma;

const ensurePositive = (amount: Prisma.Decimal) => {
  if (amount.lte(ZERO)) {
    throw new Error('Transaction amount must be greater than zero.');
  }
};

export const ensureHouseWallet = async (client?: TransactionClient) => {
  const db = getClient(client);

  return db.wallet.upsert({
    where: { code: HOUSE_WALLET_CODE },
    update: {},
    create: {
      code: HOUSE_WALLET_CODE,
      type: WalletType.HOUSE,
      balance: ZERO,
    },
  });
};

export const ensureUserWallet = async (userId: string, client?: TransactionClient) => {
  const db = getClient(client);

  return db.wallet.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      type: WalletType.USER,
      balance: ZERO,
    },
  });
};

const applyTransaction = async (
  wallet: WalletWithBalance,
  amount: Prisma.Decimal,
  type: TransactionType,
  reason: TransactionReason,
  client: TransactionClient,
  options?: TransactionOptions,
) => {
  ensurePositive(amount);

  const db = getClient(client);
  const currentRecord = await db.wallet.findUnique({ where: { id: wallet.id } });

  if (!currentRecord) {
    throw new Error('Wallet not found.');
  }

  const currentBalance = asDecimal(currentRecord.balance as unknown as NumericInput);
  const nextBalance =
    type === TransactionType.CREDIT ? currentBalance.add(amount) : currentBalance.sub(amount);

  if (type === TransactionType.DEBIT && nextBalance.lt(ZERO)) {
    throw new Error('Insufficient wallet balance.');
  }

  const updatedWallet = await db.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: nextBalance,
    },
  });

  const transaction = await db.transaction.create({
    data: {
      walletId: wallet.id,
      type,
      reason,
      amount,
      balance: nextBalance,
      referenceType: options?.referenceType,
      referenceId: options?.referenceId,
      metadata: options?.metadata ?? undefined,
    },
  });

  return { wallet: updatedWallet, transaction };
};

export const creditWallet = async (
  wallet: Wallet,
  amount: NumericInput,
  reason: TransactionReason,
  client?: TransactionClient,
  options?: TransactionOptions,
) => {
  return applyTransaction(wallet, asDecimal(amount), TransactionType.CREDIT, reason, getClient(client), options);
};

export const debitWallet = async (
  wallet: Wallet,
  amount: NumericInput,
  reason: TransactionReason,
  client?: TransactionClient,
  options?: TransactionOptions,
) => {
  return applyTransaction(wallet, asDecimal(amount), TransactionType.DEBIT, reason, getClient(client), options);
};

export const getWalletForUser = async (userId: string, client?: TransactionClient) => {
  return ensureUserWallet(userId, client);
};

export const getWalletHistory = async (
  walletId: string,
  options?: HistoryOptions,
  client?: TransactionClient,
) => {
  const db = getClient(client);

  const take = options?.take && options.take > 0 ? Math.min(options.take, 100) : 50;
  const skip = options?.skip && options.skip > 0 ? options.skip : 0;

  return db.transaction.findMany({
    where: { walletId },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  });
};

export const recordHouseCut = async (
  amount: NumericInput,
  client?: TransactionClient,
  options?: TransactionOptions,
) => {
  const db = getClient(client);
  const wallet = await ensureHouseWallet(db);

  return creditWallet(wallet, amount, TransactionReason.HOUSE_CUT, db, options);
};

export const recordBetPayout = async (
  userId: string,
  amount: NumericInput,
  options?: TransactionOptions,
  client?: TransactionClient,
) => {
  const db = getClient(client);
  const wallet = await ensureUserWallet(userId, db);

  return creditWallet(wallet, amount, TransactionReason.BET_PAYOUT, db, options);
};

export const recordBetRefund = async (
  userId: string,
  amount: NumericInput,
  options?: TransactionOptions,
  client?: TransactionClient,
) => {
  const db = getClient(client);
  const wallet = await ensureUserWallet(userId, db);

  return creditWallet(wallet, amount, TransactionReason.BET_REFUND, db, options);
};

export const recordBetPlacement = async (
  userId: string,
  amount: NumericInput,
  options?: TransactionOptions,
  client?: TransactionClient,
) => {
  const db = getClient(client);
  const wallet = await ensureUserWallet(userId, db);

  return debitWallet(wallet, amount, TransactionReason.BET_PLACED, db, options);
};
