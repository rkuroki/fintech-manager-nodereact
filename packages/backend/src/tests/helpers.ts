import { initDb, resetDb } from '../db/connection.js';
import { runMigrations } from '../db/migrate.js';
import { initEncryption } from '../utils/crypto.js';
import { buildApp } from '../app.js';

const TEST_ENCRYPTION_KEY = '0'.repeat(64);
const TEST_JWT_SECRET = 'test-secret-minimum-32-characters-long-for-testing';

/**
 * Sets up an isolated in-memory SQLite database for tests.
 * Call in beforeAll or beforeEach depending on isolation needs.
 */
export function setupTestDb() {
  // Each test gets a fresh in-memory DB
  process.env['DATABASE_PATH'] = ':memory:';
  process.env['JWT_SECRET'] = TEST_JWT_SECRET;
  process.env['ENCRYPTION_KEY'] = TEST_ENCRYPTION_KEY;
  process.env['NODE_ENV'] = 'test';
  process.env['UPLOADS_PATH'] = '/tmp/test-uploads';

  initDb(':memory:');
  runMigrations();
  initEncryption(TEST_ENCRYPTION_KEY);
}

export function teardownTestDb() {
  resetDb();
}

/**
 * Creates a fully configured Fastify test app with in-memory SQLite.
 * Uses app.inject() for in-process HTTP testing — no real network calls.
 */
export async function createTestApp() {
  setupTestDb();
  const app = await buildApp({ testing: true });
  await app.ready();
  return app;
}

/**
 * Creates a JWT token for test requests.
 * Uses the test JWT secret.
 */
export async function createTestToken(
  app: Awaited<ReturnType<typeof createTestApp>>,
  payload: { sub: string; email: string; isAdmin: boolean },
): Promise<string> {
  return app.jwt.sign(payload);
}

/** Returns Authorization header for test requests */
export async function authHeader(
  app: Awaited<ReturnType<typeof createTestApp>>,
  opts: { isAdmin?: boolean } = {},
): Promise<{ authorization: string }> {
  const token = await createTestToken(app, {
    sub: opts.isAdmin ? 'admin-test-id' : 'user-test-id',
    email: opts.isAdmin ? 'admin@test.com' : 'user@test.com',
    isAdmin: opts.isAdmin ?? false,
  });
  return { authorization: `Bearer ${token}` };
}
