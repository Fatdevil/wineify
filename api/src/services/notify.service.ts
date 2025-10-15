import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export type NotificationPayload = Prisma.InputJsonValue;

export async function notify(userId: string, type: string, payload: NotificationPayload) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      payload,
    },
  });
}

export async function notifyMany(userIds: string[], type: string, payload: NotificationPayload) {
  if (userIds.length === 0) {
    return [];
  }

  const uniqueUserIds = Array.from(new Set(userIds));

  return prisma.$transaction(
    uniqueUserIds.map((userId) =>
      prisma.notification.create({
        data: {
          userId,
          type,
          payload,
        },
      }),
    ),
  );
}

export async function notifyEventMembers(eventId: string, type: string, payload: NotificationPayload) {
  const memberships = await prisma.eventMembership.findMany({
    where: { eventId },
    select: { userId: true },
  });

  return notifyMany(
    memberships.map((membership) => membership.userId),
    type,
    payload,
  );
}

export interface ListNotificationsOptions {
  limit?: number;
  afterId?: string;
}

export async function listNotifications(userId: string, options: ListNotificationsOptions = {}) {
  const { limit = 20, afterId } = options;
  const paginationCursor = afterId
    ? await prisma.notification.findUnique({
        where: { id: afterId },
        select: { createdAt: true, id: true },
      })
    : null;

  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    ...(paginationCursor
      ? {
          skip: 1,
          cursor: { id: paginationCursor.id },
        }
      : {}),
  });
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    const error = new Error('Notification not found.');
    (error as any).statusCode = 404;
    throw error;
  }

  if (notification.readAt) {
    return notification;
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}
