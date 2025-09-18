module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['**/tests/unit/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  verbose: true
};