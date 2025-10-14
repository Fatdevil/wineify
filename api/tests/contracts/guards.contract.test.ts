import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInMemoryPrisma } from '../utils/inMemoryPrisma';

const prismaMock = createInMemoryPrisma();

vi.mock('../../src/lib/prisma', () => ({
  prisma: prismaMock.prisma,
}));

let app: Express;

beforeAll(async () => {
  ({ app } = await import('../../src/app'));
});

beforeEach(() => {
  prismaMock.reset();
});

describe('Route guards', () => {
  it('requires authentication for protected routes', async () => {
    const agent = request(app);
    const response = await agent.get('/bets');

    expect(response.status).toBe(401);
  });

  it('prevents non-admin users from accessing admin endpoints', async () => {
    const agent = request(app);

    const login = await agent.post('/auth/register').send({
      email: 'member@example.com',
      password: 'password123',
    });

    const accessToken = login.body.accessToken as string;

    const response = await agent
      .post('/results')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ subCompetitionId: 'abc', winningEntryId: 'def' });

    expect(response.status).toBe(403);
  });
});
