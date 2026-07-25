export default {
  testEnvironment: 'node',
  testMatch: ['**/src/tests/**/*.test.js'],
  clearMocks: true,
  restoreMocks: true,
  // Real Postgres round-trips over the Supabase pooler need more than the 5s default.
  testTimeout: 20_000,
};
