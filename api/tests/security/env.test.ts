import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe('environment hardening', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('throws when JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET;

    await expect(import('../../src/config/env')).rejects.toThrow('JWT_SECRET environment variable is required.');
  });

  it('throws when JWT_SECRET is too weak', async () => {
    process.env.JWT_SECRET = 'short';

    await expect(import('../../src/config/env')).rejects.toThrow('JWT_SECRET must be at least 32 bytes and not a default placeholder.');
  });

  it('throws when JWT_SECRET uses a default placeholder', async () => {
    process.env.JWT_SECRET = 'your_secret_key';

    await expect(import('../../src/config/env')).rejects.toThrow('JWT_SECRET must be at least 32 bytes and not a default placeholder.');
  });
});
