beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_jwt_secret_value_that_is_long_enough_123';
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/test';
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});
