import { afterEach, beforeAll, vi } from 'vitest';

beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_jwt_secret_value_that_is_long_enough_123';
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/test';
  process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
  process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '30d';
  process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS ?? '4';
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
