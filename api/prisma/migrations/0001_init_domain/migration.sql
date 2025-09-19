-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."SubCompStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'CANCELED', 'SETTLED');

-- CreateEnum
CREATE TYPE "public"."BetStatus" AS ENUM ('PENDING', 'ACTIVE', 'EDITED', 'REFUNDED', 'SETTLED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."SettlementStatus" AS ENUM ('PENDING', 'SENT', 'RECEIVED', 'CONFIRMED', 'DISPUTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('GENERIC', 'BET_CORRECTED', 'BETTING_CLOSED', 'RESULT_RECORDED', 'SETTLEMENT_CREATED', 'SETTLEMENT_SENT', 'SETTLEMENT_RECEIVED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "unitName" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL,
    "houseCutBps" INTEGER NOT NULL DEFAULT 0,
    "minBetUnits" INTEGER NOT NULL DEFAULT 1,
    "maxBetUnits" INTEGER,
    "status" "public"."EventStatus" NOT NULL DEFAULT 'DRAFT',
    "timezone" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventMember" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Participant" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubCompetition" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."SubCompStatus" NOT NULL DEFAULT 'DRAFT',
    "bettingOpensAt" TIMESTAMP(3),
    "bettingClosesAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "minBetUnitsOverride" INTEGER,
    "maxBetUnitsOverride" INTEGER,
    "houseCutBpsOverride" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubCompetition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubCompEntry" (
    "id" SERIAL NOT NULL,
    "subCompetitionId" INTEGER NOT NULL,
    "participantId" INTEGER,
    "label" TEXT NOT NULL,
    "orderIndex" INTEGER,
    "isWithdrawn" BOOLEAN NOT NULL DEFAULT false,
    "withdrawnAt" TIMESTAMP(3),
    "finalOddsDecimal" DECIMAL(18,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubCompEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Bet" (
    "id" SERIAL NOT NULL,
    "subCompetitionId" INTEGER NOT NULL,
    "entryId" INTEGER,
    "bettorId" INTEGER NOT NULL,
    "amountUnits" INTEGER NOT NULL,
    "status" "public"."BetStatus" NOT NULL DEFAULT 'PENDING',
    "oddsSnapshot" DECIMAL(18,6),
    "correctedReason" TEXT,
    "correctedById" INTEGER,
    "correctedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Result" (
    "id" SERIAL NOT NULL,
    "subCompetitionId" INTEGER NOT NULL,
    "winningEntryId" INTEGER,
    "recordedById" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payout" (
    "id" SERIAL NOT NULL,
    "subCompetitionId" INTEGER NOT NULL,
    "betId" INTEGER NOT NULL,
    "entryId" INTEGER,
    "resultId" INTEGER,
    "amount" DECIMAL(14,2) NOT NULL,
    "netAmount" DECIMAL(14,2) NOT NULL,
    "houseCutAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Settlement" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "payerId" INTEGER NOT NULL,
    "payeeId" INTEGER NOT NULL,
    "payoutId" INTEGER,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "public"."SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventId" INTEGER,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER,
    "userId" INTEGER,
    "subCompetitionId" INTEGER,
    "betId" INTEGER,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "public"."User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Event_joinCode_key" ON "public"."Event"("joinCode");

-- CreateIndex
CREATE INDEX "Event_adminId_idx" ON "public"."Event"("adminId");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "public"."Event"("status");

-- CreateIndex
CREATE INDEX "EventMember_userId_idx" ON "public"."EventMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventMember_eventId_userId_key" ON "public"."EventMember"("eventId", "userId");

-- CreateIndex
CREATE INDEX "Participant_eventId_isActive_idx" ON "public"."Participant"("eventId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_eventId_displayName_key" ON "public"."Participant"("eventId", "displayName");

-- CreateIndex
CREATE INDEX "SubCompetition_eventId_idx" ON "public"."SubCompetition"("eventId");

-- CreateIndex
CREATE INDEX "SubCompetition_status_idx" ON "public"."SubCompetition"("status");

-- CreateIndex
CREATE INDEX "SubCompEntry_participantId_idx" ON "public"."SubCompEntry"("participantId");

-- CreateIndex
CREATE INDEX "SubCompEntry_subCompetitionId_isWithdrawn_idx" ON "public"."SubCompEntry"("subCompetitionId", "isWithdrawn");

-- CreateIndex
CREATE UNIQUE INDEX "SubCompEntry_subCompetitionId_label_key" ON "public"."SubCompEntry"("subCompetitionId", "label");

-- CreateIndex
CREATE INDEX "Bet_bettorId_idx" ON "public"."Bet"("bettorId");

-- CreateIndex
CREATE INDEX "Bet_subCompetitionId_status_idx" ON "public"."Bet"("subCompetitionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Result_subCompetitionId_key" ON "public"."Result"("subCompetitionId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_winningEntryId_key" ON "public"."Result"("winningEntryId");

-- CreateIndex
CREATE INDEX "Payout_subCompetitionId_idx" ON "public"."Payout"("subCompetitionId");

-- CreateIndex
CREATE INDEX "Payout_resultId_idx" ON "public"."Payout"("resultId");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_betId_key" ON "public"."Payout"("betId");

-- CreateIndex
CREATE INDEX "Settlement_payerId_idx" ON "public"."Settlement"("payerId");

-- CreateIndex
CREATE INDEX "Settlement_payeeId_idx" ON "public"."Settlement"("payeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_eventId_payerId_payeeId_key" ON "public"."Settlement"("eventId", "payerId", "payeeId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "public"."Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "AuditLog_eventId_idx" ON "public"."AuditLog"("eventId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_subCompetitionId_idx" ON "public"."AuditLog"("subCompetitionId");

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventMember" ADD CONSTRAINT "EventMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventMember" ADD CONSTRAINT "EventMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Participant" ADD CONSTRAINT "Participant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubCompetition" ADD CONSTRAINT "SubCompetition_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubCompEntry" ADD CONSTRAINT "SubCompEntry_subCompetitionId_fkey" FOREIGN KEY ("subCompetitionId") REFERENCES "public"."SubCompetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubCompEntry" ADD CONSTRAINT "SubCompEntry_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."Participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_subCompetitionId_fkey" FOREIGN KEY ("subCompetitionId") REFERENCES "public"."SubCompetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "public"."SubCompEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_bettorId_fkey" FOREIGN KEY ("bettorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Result" ADD CONSTRAINT "Result_subCompetitionId_fkey" FOREIGN KEY ("subCompetitionId") REFERENCES "public"."SubCompetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Result" ADD CONSTRAINT "Result_winningEntryId_fkey" FOREIGN KEY ("winningEntryId") REFERENCES "public"."SubCompEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Result" ADD CONSTRAINT "Result_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_subCompetitionId_fkey" FOREIGN KEY ("subCompetitionId") REFERENCES "public"."SubCompetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_betId_fkey" FOREIGN KEY ("betId") REFERENCES "public"."Bet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "public"."SubCompEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "public"."Result"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Settlement" ADD CONSTRAINT "Settlement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Settlement" ADD CONSTRAINT "Settlement_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Settlement" ADD CONSTRAINT "Settlement_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Settlement" ADD CONSTRAINT "Settlement_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "public"."Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_subCompetitionId_fkey" FOREIGN KEY ("subCompetitionId") REFERENCES "public"."SubCompetition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_betId_fkey" FOREIGN KEY ("betId") REFERENCES "public"."Bet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

