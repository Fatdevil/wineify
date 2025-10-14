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

describe('Authentication flow', () => {
  it('registers, logs in, refreshes, and accesses protected resources', async () => {
    const agent = request(app);
    const registerResponse = await agent.post('/auth/register').send({
      email: 'user@example.com',
      password: 's3cretpass',
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).toHaveProperty('accessToken');
    expect(registerResponse.body).toHaveProperty('refreshToken');

    const loginResponse = await agent.post('/auth/login').send({
      email: 'user@example.com',
      password: 's3cretpass',
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.accessToken).toBeDefined();
    expect(loginResponse.body.refreshToken).toBeDefined();

    const meResponse = await agent
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user.email).toBe('user@example.com');

    const refreshResponse = await agent.post('/auth/refresh').send({
      refreshToken: loginResponse.body.refreshToken,
    });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.accessToken).toBeDefined();
    expect(refreshResponse.body.refreshToken).not.toBe(loginResponse.body.refreshToken);

    const meAfterRefresh = await agent
      .get('/auth/me')
      .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`);

    expect(meAfterRefresh.status).toBe(200);

    const reuseOldRefresh = await agent.post('/auth/refresh').send({
      refreshToken: loginResponse.body.refreshToken,
    });

    expect(reuseOldRefresh.status).toBe(401);
  });

  it('rejects attempts to self-assign admin role during registration', async () => {
    const agent = request(app);
    const response = await agent.post('/auth/register').send({
      email: 'admin@example.com',
      password: 'password123',
      role: 'ADMIN',
    });

    expect(response.status).toBe(400);
  });

  it('revokes refresh tokens on logout', async () => {
    const agent = request(app);
    const login = await agent.post('/auth/register').send({
      email: 'logout@example.com',
      password: 'password123',
    });

    const accessToken = login.body.accessToken as string;
    const refreshToken = login.body.refreshToken as string;

    const logoutResponse = await agent
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });

    expect(logoutResponse.status).toBe(200);

    const refreshResponse = await agent.post('/auth/refresh').send({ refreshToken });

    expect(refreshResponse.status).toBe(401);
  });
});
