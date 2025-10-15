import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';
import { createInMemoryPrisma } from '../utils/inMemoryPrisma';

process.env.JWT_SECRET = 'testsecretvalue12345678901234567890';

const prismaMock = createInMemoryPrisma();

vi.mock('../../src/lib/prisma', () => ({
  prisma: prismaMock.prisma,
}));

let app: Express;
let signAccessToken: typeof import('../../src/services/auth.service')['signAccessToken'];
let recordBetPayout: typeof import('../../src/services/wallet.service')['recordBetPayout'];
let recordBetRefund: typeof import('../../src/services/wallet.service')['recordBetRefund'];
let recordHouseCut: typeof import('../../src/services/wallet.service')['recordHouseCut'];
let recordResult: typeof import('../../src/modules/results/results.service')['recordResult'];
let payoutsModule: typeof import('../../src/modules/results/payouts.service');
let walletServiceModule: typeof import('../../src/services/wallet.service');

beforeAll(async () => {
  ({ app } = await import('../../src/app'));
  ({ signAccessToken } = await import('../../src/services/auth.service'));
  walletServiceModule = await import('../../src/services/wallet.service');
  ({ recordBetPayout, recordBetRefund, recordHouseCut } = walletServiceModule);
  ({ recordResult } = await import('../../src/modules/results/results.service'));
  payoutsModule = await import('../../src/modules/results/payouts.service');
});

beforeEach(() => {
  prismaMock.reset();
  vi.clearAllMocks();
});

describe('Wallet endpoints', () => {
  it('returns wallet balances and history for authenticated users', async () => {
    const agent = request(app);
    const registerResponse = await agent.post('/auth/register').send({
      email: 'ledger@example.com',
      password: 'strongpass',
    });

    expect(registerResponse.status).toBe(201);

    const accessToken = registerResponse.body.accessToken as string;
    const userId = registerResponse.body.user.id as string;

    await recordBetPayout(userId, 50, { referenceType: 'BET', referenceId: 'bet-123' }, prismaMock.prisma);
    await recordBetRefund(userId, 10, { referenceType: 'BET', referenceId: 'bet-123' }, prismaMock.prisma);

    const walletResponse = await agent
      .get('/wallet')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(walletResponse.status).toBe(200);
    expect(walletResponse.body.wallet.balance).toBeCloseTo(60);
    expect(Array.isArray(walletResponse.body.recent)).toBe(true);
    expect(walletResponse.body.recent.length).toBeGreaterThan(0);

    const historyResponse = await agent
      .get('/wallet/history?limit=10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(historyResponse.status).toBe(200);
    const reasons = historyResponse.body.history.map((entry: any) => entry.reason);
    expect(reasons).toContain('BET_PAYOUT');
    expect(reasons).toContain('BET_REFUND');
  });

  it('allows admins to inspect the house wallet', async () => {
    const admin = await prismaMock.prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: 'hash',
        role: Role.ADMIN,
      },
    });

    await recordHouseCut(25, prismaMock.prisma, { referenceType: 'EVENT', referenceId: 'event-42' });

    const token = signAccessToken({ sub: admin.id, role: Role.ADMIN });

    const response = await request(app)
      .get('/admin/house')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.wallet.balance).toBeCloseTo(25);
    expect(response.body.history[0].reason).toBe('HOUSE_CUT');
  });
});

describe('Result settlement integration', () => {
  it('records payouts and house cuts when results are processed', async () => {
    const subCompetitionId = 'sub-1';
    const winningEntryId = 'entry-1';

    const fakeClient: any = {
      subCompetition: {
        findUnique: vi.fn(async () => ({
          id: subCompetitionId,
          status: 'SCHEDULED',
          event: { id: 'event-1', houseCut: 0.1 },
          participants: [{ id: winningEntryId }],
          results: [],
        })),
        update: vi.fn(async () => ({})),
      },
      result: {
        create: vi.fn(async () => ({ id: 'result-1' })),
      },
      bet: {
        update: vi.fn(async () => ({})),
      },
      settlement: {
        upsert: vi.fn(async () => ({
          id: 'settlement-1',
          betId: 'bet-1',
          resultId: 'result-1',
          status: 'PENDING',
          payout: 90,
        })),
      },
      $transaction: async (cb: any) => cb(fakeClient),
    };

    const computeSpy = vi
      .spyOn(payoutsModule, 'computePayouts')
      .mockResolvedValue({
        eventId: 'event-1',
        subCompetitionId,
        resultId: 'result-1',
        totalPool: 100,
        houseCut: 0.1,
        winningStake: 50,
        payoutPerUnit: 2,
        payouts: [
          {
            betId: 'bet-1',
            userId: 'winner-1',
            subCompetitionId,
            resultId: 'result-1',
            participantId: winningEntryId,
            isWinner: true,
            stake: 50,
            payout: 90,
          },
          {
            betId: 'bet-2',
            userId: 'loser-1',
            subCompetitionId,
            resultId: 'result-1',
            participantId: 'entry-2',
            isWinner: false,
            stake: 10,
            payout: 0,
          },
        ],
      });

    const payoutSpy = vi.spyOn(walletServiceModule, 'recordBetPayout').mockResolvedValue({} as any);
    const houseSpy = vi.spyOn(walletServiceModule, 'recordHouseCut').mockResolvedValue({} as any);

    const result = await recordResult(subCompetitionId, winningEntryId, fakeClient);

    expect(computeSpy).toHaveBeenCalledWith(subCompetitionId, fakeClient);
    expect(fakeClient.subCompetition.update).toHaveBeenCalled();
    expect(fakeClient.result.create).toHaveBeenCalled();
    expect(payoutSpy).toHaveBeenCalledTimes(1);
    expect(payoutSpy.mock.calls[0][0]).toBe('winner-1');
    expect(payoutSpy.mock.calls[0][1]).toBe(90);
    expect(payoutSpy.mock.calls[0][3]).toBe(fakeClient);
    expect(houseSpy).toHaveBeenCalledTimes(1);
    const houseAmount = houseSpy.mock.calls[0][0] as any;
    expect(Number(houseAmount)).toBeCloseTo(10);
    expect(houseSpy.mock.calls[0][2]).toEqual(
      expect.objectContaining({ referenceType: 'EVENT', referenceId: 'event-1' }),
    );
    expect(result.settlements.length).toBe(2);
  });
});
