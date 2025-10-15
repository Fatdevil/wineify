-- CreateEnum
CREATE TYPE "public"."WalletType" AS ENUM ('USER', 'HOUSE');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "public"."TransactionReason" AS ENUM ('BET_PLACED', 'BET_PAYOUT', 'BET_REFUND', 'HOUSE_CUT', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "public"."Wallet" (
    "id" TEXT NOT NULL,
    "type" "public"."WalletType" NOT NULL DEFAULT 'USER',
    "code" TEXT,
    "userId" TEXT,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "reason" "public"."TransactionReason" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_code_key" ON "public"."Wallet"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "public"."Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_type_idx" ON "public"."Wallet"("type");

-- CreateIndex
CREATE INDEX "Transaction_walletId_createdAt_idx" ON "public"."Transaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_referenceType_referenceId_idx" ON "public"."Transaction"("referenceType", "referenceId");

-- AddForeignKey
ALTER TABLE "public"."Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
