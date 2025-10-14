import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { EventRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { requireEventRole } from './acl.service';

const INVITE_CODE_LENGTH = 20;
const INVITE_SALT_ROUNDS = 10;

function generateInviteCode(): string {
  let code = '';

  while (code.length < INVITE_CODE_LENGTH) {
    code += crypto.randomBytes(INVITE_CODE_LENGTH).toString('base64url');
  }

  return code.slice(0, INVITE_CODE_LENGTH);
}

function isInviteExpired(expiresAt: Date | null | undefined): boolean {
  return Boolean(expiresAt && expiresAt.getTime() < Date.now());
}

export interface InviteOptions {
  expiresAt?: Date | null;
  maxUses?: number | null;
}

export async function createInvite(
  eventId: string,
  creatorUserId: string,
  options: InviteOptions = {},
): Promise<{ inviteId: string; inviteCode: string }> {
  await requireEventRole(eventId, creatorUserId, EventRole.ADMIN);

  const inviteCode = generateInviteCode();
  const codeHash = await bcrypt.hash(inviteCode, INVITE_SALT_ROUNDS);

  const record = await prisma.eventInvite.create({
    data: {
      eventId,
      codeHash,
      createdBy: creatorUserId,
      expiresAt: options.expiresAt ?? null,
      maxUses: options.maxUses ?? null,
    },
  });

  return { inviteId: record.id, inviteCode };
}

export async function joinWithInvite(inviteCode: string, userId: string) {
  if (inviteCode.length < 12) {
    throw Object.assign(new Error('Invite code is invalid.'), { statusCode: 400 });
  }

  const candidateInvites = await prisma.eventInvite.findMany({
    where: {
      revokedAt: null,
    },
    include: {
      event: true,
    },
  });

  let matchedInvite: (typeof candidateInvites)[number] | null = null;

  for (const invite of candidateInvites) {
    const matches = await bcrypt.compare(inviteCode, invite.codeHash);

    if (matches) {
      matchedInvite = invite;
      break;
    }
  }

  if (!matchedInvite) {
    throw Object.assign(new Error('Invite could not be found or has been revoked.'), { statusCode: 404 });
  }

  if (isInviteExpired(matchedInvite.expiresAt)) {
    throw Object.assign(new Error('Invite has expired.'), { statusCode: 410 });
  }

  if (matchedInvite.maxUses !== null && matchedInvite.usedCount >= matchedInvite.maxUses) {
    throw Object.assign(new Error('Invite has reached its maximum number of uses.'), { statusCode: 429 });
  }

  const membership = await prisma.$transaction(async (tx) => {
    const invite = await tx.eventInvite.findUnique({
      where: { id: matchedInvite!.id },
    });

    if (!invite) {
      throw Object.assign(new Error('Invite could not be found or has been revoked.'), { statusCode: 404 });
    }

    if (isInviteExpired(invite.expiresAt)) {
      throw Object.assign(new Error('Invite has expired.'), { statusCode: 410 });
    }

    if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
      throw Object.assign(new Error('Invite has reached its maximum number of uses.'), { statusCode: 429 });
    }

    const existingMembership = await tx.eventMembership.findUnique({
      where: {
        eventId_userId: {
          eventId: matchedInvite!.eventId,
          userId,
        },
      },
    });

    if (existingMembership) {
      return existingMembership;
    }

    const createdMembership = await tx.eventMembership.create({
      data: {
        eventId: matchedInvite!.eventId,
        userId,
        role: EventRole.MEMBER,
      },
    });

    await tx.eventInvite.update({
      where: { id: matchedInvite!.id },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    });

    return createdMembership;
  });

  return membership;
}

export async function revokeInvite(inviteId: string, adminUserId: string) {
  const invite = await prisma.eventInvite.findUnique({
    where: { id: inviteId },
  });

  if (!invite) {
    throw Object.assign(new Error('Invite not found.'), { statusCode: 404 });
  }

  await requireEventRole(invite.eventId, adminUserId, EventRole.ADMIN);

  if (invite.revokedAt) {
    return invite;
  }

  return prisma.eventInvite.update({
    where: { id: inviteId },
    data: { revokedAt: new Date() },
  });
}
