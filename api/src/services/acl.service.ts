import { EventRole } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const EVENT_ROLE_WEIGHT: Record<EventRole, number> = {
  [EventRole.MEMBER]: 0,
  [EventRole.ADMIN]: 1,
  [EventRole.OWNER]: 2,
};

export class EventAccessError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 403) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'EventAccessError';
  }
}

export async function isEventMember(userId: string, eventId: string): Promise<boolean> {
  const membership = await prisma.eventMembership.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
  });

  return Boolean(membership);
}

export async function requireEventRole(eventId: string, userId: string, minRole: EventRole) {
  const membership = await prisma.eventMembership.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
  });

  if (!membership) {
    throw new EventAccessError('You must join this event to continue.', 403);
  }

  if (EVENT_ROLE_WEIGHT[membership.role] < EVENT_ROLE_WEIGHT[minRole]) {
    throw new EventAccessError('You do not have permission to perform this action.', 403);
  }

  return membership;
}

export async function changeMemberRole(
  eventId: string,
  targetUserId: string,
  newRole: EventRole,
  actorUserId: string,
) {
  const actorMembership = await prisma.eventMembership.findUnique({
    where: {
      eventId_userId: { eventId, userId: actorUserId },
    },
  });

  if (!actorMembership) {
    throw new EventAccessError('Only event members can manage roles.', 403);
  }

  if (EVENT_ROLE_WEIGHT[actorMembership.role] < EVENT_ROLE_WEIGHT[EventRole.ADMIN]) {
    throw new EventAccessError('You do not have permission to manage event roles.', 403);
  }

  if (actorUserId === targetUserId) {
    throw new EventAccessError('You cannot modify your own role.', 400);
  }

  const targetMembership = await prisma.eventMembership.findUnique({
    where: {
      eventId_userId: { eventId, userId: targetUserId },
    },
  });

  if (!targetMembership) {
    throw new EventAccessError('The specified user is not a member of this event.', 404);
  }

  if (targetMembership.role === EventRole.OWNER && actorMembership.role !== EventRole.OWNER) {
    throw new EventAccessError('Only an event owner can modify another owner.', 403);
  }

  if (newRole === EventRole.OWNER && actorMembership.role !== EventRole.OWNER) {
    throw new EventAccessError('Only an event owner can assign ownership.', 403);
  }

  return prisma.eventMembership.update({
    where: { id: targetMembership.id },
    data: { role: newRole },
  });
}
