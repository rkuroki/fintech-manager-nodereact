import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, teardownTestDb } from '../../tests/helpers.js';
import { getDb } from '../../db/connection.js';
import { users, userGroups, userGroupMembers, accessRoles, userAccessRoles, groupAccessRoles } from '../../db/schema/users.js';
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
    await db.delete(userGroupMembers).run();
    await db.delete(groupAccessRoles).run();
    await db.delete(userAccessRoles).run();
    await db.delete(userGroups).run();
    await db.delete(accessRoles).run();
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

  describe('GET /api/users/:id', () => {
    it('returns single user for admin', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const res = await app.inject({
        method: 'GET',
        url: `/api/users/${adminId}`,
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<Record<string, unknown>>();
      expect(body['id']).toBe(adminId);
      expect(body).not.toHaveProperty('passwordHash');
    });

    it('returns 404 for non-existent user', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const res = await app.inject({
        method: 'GET',
        url: `/api/users/${uuidv4()}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('updates user fields', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'update@example.com', alias: 'updateuser', password: 'Pass123!', fullName: 'Before Update' },
      });
      const { id } = createRes.json<{ id: string }>();

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { fullName: 'After Update' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<Record<string, unknown>>()['fullName']).toBe('After Update');
    });

    it('returns 404 for non-existent user', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/${uuidv4()}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { fullName: 'Ghost' },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ─── Groups ─────────────────────────────────────────────────────────────────

  describe('Groups CRUD', () => {
    it('creates a group with auto squad role', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const res = await app.inject({
        method: 'POST',
        url: '/api/users/groups',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Tech Team', mnemonic: 'TECH', description: 'Technology squad' },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json<Record<string, unknown>>();
      expect(body['name']).toBe('Tech Team');
      expect(body['mnemonic']).toBe('TECH');
    });

    it('returns 409 on duplicate group mnemonic', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      await app.inject({
        method: 'POST',
        url: '/api/users/groups',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Team A', mnemonic: 'DUPE' },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/users/groups',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Team B', mnemonic: 'DUPE' },
      });
      expect(res.statusCode).toBe(409);
    });

    it('lists groups for admin', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      await app.inject({
        method: 'POST',
        url: '/api/users/groups',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Engineering', mnemonic: 'ENG' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/users/groups',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('updates a group name', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/users/groups',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Old Name', mnemonic: 'OLDM' },
      });
      const { id } = createRes.json<{ id: string }>();

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/groups/${id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'New Name', description: 'Updated' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<Record<string, unknown>>()['name']).toBe('New Name');
    });

    it('soft-deletes a group', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/users/groups',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Temp Group', mnemonic: 'TEMP' },
      });
      const { id } = createRes.json<{ id: string }>();

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/users/groups/${id}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(204);
    });

    it('assigns and removes a user from a group', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const createUserRes = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { authorization: `Bearer ${token}` },
        payload: { email: 'member@test.com', alias: 'member', password: 'Pass123!', fullName: 'Member' },
      });
      const { id: memberId } = createUserRes.json<{ id: string }>();

      const createGroupRes = await app.inject({
        method: 'POST',
        url: '/api/users/groups',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Member Group', mnemonic: 'MEMB' },
      });
      const { id: groupId } = createGroupRes.json<{ id: string }>();

      // Assign user to group
      const assignRes = await app.inject({
        method: 'POST',
        url: `/api/users/groups/${groupId}/members/${memberId}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(assignRes.statusCode).toBe(204);

      const db = getDb();
      const membership = await db.select().from(userGroupMembers).limit(10);
      expect(membership.some((m) => m.userId === memberId && m.groupId === groupId)).toBe(true);

      // Remove user from group
      const removeRes = await app.inject({
        method: 'DELETE',
        url: `/api/users/groups/${groupId}/members/${memberId}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(removeRes.statusCode).toBe(204);
    });
  });

  // ─── Roles ─────────────────────────────────────────────────────────────────

  describe('Roles CRUD', () => {
    it('creates a role', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const res = await app.inject({
        method: 'POST',
        url: '/api/users/roles',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Viewer Role', description: 'Read-only', permissions: ['customers:read'] },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json<Record<string, unknown>>();
      expect(body['name']).toBe('Viewer Role');
      expect(body['permissions']).toEqual(['customers:read']);
    });

    it('lists roles', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const res = await app.inject({
        method: 'GET',
        url: '/api/users/roles',
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toBeInstanceOf(Array);
    });

    it('updates a role', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/users/roles',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Old Role', permissions: ['customers:read'] },
      });
      const { id } = createRes.json<{ id: string }>();

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/roles/${id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Updated Role', permissions: ['customers:read', 'customers:create'] },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<Record<string, unknown>>()['name']).toBe('Updated Role');
    });

    it('returns 404 updating non-existent role', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/users/roles/${uuidv4()}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Ghost' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('deletes a role', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/users/roles',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Temp Role', permissions: [] },
      });
      const { id } = createRes.json<{ id: string }>();

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/users/roles/${id}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(204);
    });

    it('returns 404 deleting non-existent role', async () => {
      const adminId = await insertAdmin();
      const token = await getAdminToken(app, adminId);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/users/roles/${uuidv4()}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
