import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, teardownTestDb } from '../../tests/helpers.js';
import { getDb } from '../../db/connection.js';
import { users } from '../../db/schema/users.js';
import { activityLog } from '../../db/schema/audit.js';
import { hashPassword } from '../../utils/password.js';
import { v4 as uuidv4 } from 'uuid';

describe('Auth API', () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    teardownTestDb();
  });

  beforeEach(async () => {
    const db = getDb();
    // Clean up dependent tables before users (FK constraints)
    await db.delete(activityLog).run();
    await db.delete(users).run();

    // Insert a test user
    const hash = await hashPassword('Password123!');
    await db.insert(users).values({
      id: uuidv4(),
      email: 'test@example.com',
      alias: 'testuser',
      passwordHash: hash,
      fullName: 'Test User',
      isAdmin: false,
      isActive: true,
    }).run();
  });

  describe('POST /api/auth/login', () => {
    it('returns token on valid credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'Password123!' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ token: string; user: { email: string } }>();
      expect(body.token).toBeDefined();
      expect(body.user.email).toBe('test@example.com');
      expect(body.user).not.toHaveProperty('passwordHash');
    });

    it('returns 401 on wrong password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'WrongPassword!' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 401 on unknown email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'nobody@example.com', password: 'Password123!' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('returns 401 for inactive user', async () => {
      const db = getDb();
      await db.update(users).set({ isActive: false }).run();

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'Password123!' },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns current user when authenticated', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'Password123!' },
      });
      const { token } = loginRes.json<{ token: string }>();

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<{ email: string }>().email).toBe('test@example.com');
    });

    it('returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
      expect(res.statusCode).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { authorization: 'Bearer invalid-token' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('returns 204 when authenticated', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com', password: 'Password123!' },
      });
      const { token } = loginRes.json<{ token: string }>();

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(204);
    });
  });
});
