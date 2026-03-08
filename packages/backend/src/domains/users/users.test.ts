import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, teardownTestDb } from '../../tests/helpers.js';
import { getDb } from '../../db/connection.js';
import { users } from '../../db/schema/users.js';
import { hashPassword } from '../../utils/password.js';
import { v4 as uuidv4 } from 'uuid';

async function insertAdmin() {
  const db = getDb();
  const hash = await hashPassword('Admin123!');
  const id = uuidv4();
  await db.insert(users).values({
    id,
    email: 'admin@test.com',
    alias: 'admin',
    passwordHash: hash,
    fullName: 'Test Admin',
    isAdmin: true,
    isActive: true,
  }).run();
  return id;
}

async function getAdminToken(app: Awaited<ReturnType<typeof createTestApp>>, adminId: string) {
  return app.jwt.sign({ sub: adminId, email: 'admin@test.com', isAdmin: true });
}

describe('Users API', () => {
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
    await db.delete(users).run();
  });

  describe('GET /api/users', () => {
    it('returns paginated list for admin', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const res = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: unknown[]; total: number }>();
      expect(body.data).toBeInstanceOf(Array);
      expect(typeof body.total).toBe('number');
    });

    it('returns 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/users' });
      expect(res.statusCode).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      const db = getDb();
      const hash = await hashPassword('Pass123!');
      const userId = uuidv4();
      await db.insert(users).values({
        id: userId,
        email: 'user@test.com',
        alias: 'user',
        passwordHash: hash,
        fullName: 'Non Admin',
        isAdmin: false,
        isActive: true,
      }).run();

      const token = app.jwt.sign({ sub: userId, email: 'user@test.com', isAdmin: false });
      const res = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /api/users', () => {
    it('creates user with hashed password', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          email: 'new@example.com',
          alias: 'newuser',
          password: 'NewPass123!',
          fullName: 'New User',
          isAdmin: false,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json<Record<string, unknown>>();
      expect(body['email']).toBe('new@example.com');
      expect(body).not.toHaveProperty('passwordHash');
    });

    it('returns 409 on duplicate email', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'dup@example.com', alias: 'dup1', password: 'Pass123!', fullName: 'Dup' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'dup@example.com', alias: 'dup2', password: 'Pass123!', fullName: 'Dup' },
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('soft-deletes user', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'del@example.com', alias: 'deluser', password: 'Pass123!', fullName: 'Del User' },
      });
      const { id } = createRes.json<{ id: string }>();

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/users/${id}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(deleteRes.statusCode).toBe(204);

      // Verify soft-deleted: user still in DB but deletedAt is set
      const db = getDb();
      const row = await db.select().from(users).limit(100);
      const deleted = row.find((u) => u.id === id);
      expect(deleted?.deletedAt).toBeTruthy();
    });

    it('prevents self-deletion', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/users/${adminId}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
