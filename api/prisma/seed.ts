import { Prisma, PrismaClient, Role, BetStatus, EventStatus, SubCompStatus, SettlementStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.settlement.deleteMany();
  await prisma.result.deleteMany();
  await prisma.bet.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.subCompetition.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  const [user, admin] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'bettor@example.com',
        password: 'password123',
        role: Role.USER,
      },
    }),
    prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: 'password123',
        role: Role.ADMIN,
      },
    }),
  ]);

  const harvestEvent = await prisma.event.create({
    data: {
      name: 'Napa Harvest Festival',
      description: 'Annual wine tasting showdown featuring regional vineyards.',
      status: EventStatus.ACTIVE,
      startsAt: new Date('2024-09-20T18:00:00.000Z'),
      endsAt: new Date('2024-09-22T23:00:00.000Z'),
      subCompetitions: {
        create: [
          {
            name: 'Best Cabernet Sauvignon',
            description: 'Head-to-head blind tasting of regional cabernets.',
            status: SubCompStatus.ACTIVE,
            startsAt: new Date('2024-09-20T19:00:00.000Z'),
            endsAt: new Date('2024-09-20T21:00:00.000Z'),
          },
          {
            name: 'Sparkling Showdown',
            description: 'Top sparkling wines competing for gold.',
            status: SubCompStatus.SCHEDULED,
            startsAt: new Date('2024-09-21T20:00:00.000Z'),
            endsAt: new Date('2024-09-21T22:00:00.000Z'),
          },
        ],
      },
    },
    include: {
      subCompetitions: true,
    },
  });

  const cabernet = harvestEvent.subCompetitions.find((sub) => sub.name === 'Best Cabernet Sauvignon');
  const sparkling = harvestEvent.subCompetitions.find((sub) => sub.name === 'Sparkling Showdown');

  if (!cabernet || !sparkling) {
    throw new Error('Failed to seed sub-competitions.');
  }

  const cabernetParticipants = await Promise.all([
    prisma.participant.create({
      data: {
        name: 'Oak Valley Estate',
        alias: 'Oak Valley',
        eventId: harvestEvent.id,
        subCompetitionId: cabernet.id,
      },
    }),
    prisma.participant.create({
      data: {
        name: 'Suncrest Vineyards',
        alias: 'Suncrest',
        eventId: harvestEvent.id,
        subCompetitionId: cabernet.id,
      },
    }),
  ]);

  const sparklingParticipants = await Promise.all([
    prisma.participant.create({
      data: {
        name: 'Golden Bubbles Winery',
        alias: 'Golden Bubbles',
        eventId: harvestEvent.id,
        subCompetitionId: sparkling.id,
      },
    }),
    prisma.participant.create({
      data: {
        name: 'Celebration Cellars',
        alias: 'Celebration',
        eventId: harvestEvent.id,
        subCompetitionId: sparkling.id,
      },
    }),
  ]);

  const [oakValley, suncrest] = cabernetParticipants;

  const bets = await Promise.all([
    prisma.bet.create({
      data: {
        userId: user.id,
        subCompetitionId: cabernet.id,
        participantId: oakValley.id,
        amount: new Prisma.Decimal('50.00'),
        odds: new Prisma.Decimal('2.20'),
        status: BetStatus.PENDING,
      },
      include: {
        participant: true,
      },
    }),
    prisma.bet.create({
      data: {
        userId: user.id,
        subCompetitionId: cabernet.id,
        participantId: suncrest.id,
        amount: new Prisma.Decimal('25.00'),
        odds: new Prisma.Decimal('3.10'),
        status: BetStatus.PENDING,
      },
      include: {
        participant: true,
      },
    }),
    prisma.bet.create({
      data: {
        userId: admin.id,
        subCompetitionId: sparkling.id,
        participantId: sparklingParticipants[0]!.id,
        amount: new Prisma.Decimal('40.00'),
        odds: new Prisma.Decimal('1.80'),
        status: BetStatus.PENDING,
      },
      include: {
        participant: true,
      },
    }),
  ]);

  const cabernetResult = await prisma.result.create({
    data: {
      subCompetitionId: cabernet.id,
      participantId: oakValley.id,
      outcome: 'Winner',
      bets: {
        connect: {
          id: bets[0]!.id,
        },
      },
    },
  });

  await prisma.bet.update({
    where: { id: bets[0]!.id },
    data: {
      status: BetStatus.WON,
      resultId: cabernetResult.id,
    },
  });

  await prisma.settlement.create({
    data: {
      betId: bets[0]!.id,
      resultId: cabernetResult.id,
      status: SettlementStatus.COMPLETED,
      settledAt: new Date('2024-09-20T22:00:00.000Z'),
      payout: new Prisma.Decimal('110.00'),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
