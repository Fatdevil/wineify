import { PrismaClient, Role, EventStatus, SubCompStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('changeme', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      displayName: 'Admin User',
      passwordHash,
      role: Role.ADMIN,
      email: 'admin@example.com',
    },
  });

  const event = await prisma.event.upsert({
    where: { joinCode: 'JOIN-CODE-1' },
    update: {},
    create: {
      adminId: admin.id,
      title: 'Autumn Invitational',
      description: 'Seeded friends betting event',
      unitName: 'Godisbilar',
      joinCode: 'JOIN-CODE-1',
      houseCutBps: 0,
      minBetUnits: 1,
      maxBetUnits: 25,
      status: EventStatus.ACTIVE,
      timezone: 'Europe/Stockholm',
      members: {
        create: {
          userId: admin.id,
          role: Role.ADMIN,
        },
      },
    },
  });

  const participantNames = ['Alice', 'Bob', 'Charlie', 'Diana'];
  const participants = [] as { id: number; displayName: string }[];

  for (const name of participantNames) {
    const participant = await prisma.participant.upsert({
      where: {
        eventId_displayName: {
          eventId: event.id,
          displayName: name,
        },
      },
      update: {},
      create: {
        eventId: event.id,
        displayName: name,
        notes: 'Seed participant',
      },
    });
    participants.push({ id: participant.id, displayName: participant.displayName });
  }

  const now = new Date();
  const close = new Date(now.getTime() + 60 * 60 * 1000);

  const existingRoundOne = await prisma.subCompetition.findFirst({
    where: { eventId: event.id, title: 'Round 1 Winner' },
  });

  if (!existingRoundOne) {
    await prisma.subCompetition.create({
      data: {
        eventId: event.id,
        title: 'Round 1 Winner',
        description: 'Who wins the opening round?',
        status: SubCompStatus.OPEN,
        bettingOpensAt: now,
        bettingClosesAt: close,
        entries: {
          create: participants.slice(0, 3).map((participant, index) => ({
            participantId: participant.id,
            label: participant.displayName,
            orderIndex: index,
          })),
        },
      },
    });
  }

  const existingClosest = await prisma.subCompetition.findFirst({
    where: { eventId: event.id, title: 'Closest to Pin' },
  });

  if (!existingClosest) {
    await prisma.subCompetition.create({
      data: {
        eventId: event.id,
        title: 'Closest to Pin',
        description: 'Best shot on hole 7',
        status: SubCompStatus.DRAFT,
        bettingOpensAt: now,
        bettingClosesAt: close,
        entries: {
          create: participants.map((participant, index) => ({
            participantId: participant.id,
            label: `${participant.displayName} Shot`,
            orderIndex: index,
          })),
        },
      },
    });
  }

  console.log('Seed data created successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
