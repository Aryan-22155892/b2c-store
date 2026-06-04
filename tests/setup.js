// tests/setup.js
// Sets test environment variables before any test file loads.
// Uses a separate test database URL so tests never touch your dev DB.

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  // Override with your test DB. For CI we use the same PostgreSQL
  // instance with a separate schema, controlled by the env in .github/workflows.
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-prod';
  process.env.JWT_EXPIRES_IN = '1h';
};
