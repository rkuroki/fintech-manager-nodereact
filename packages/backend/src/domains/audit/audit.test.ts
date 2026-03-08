import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, teardownTestDb } from '../../tests/helpers.js';
import { getDb } from '../../db/connection.js';
import { users, accessRoles, userAccessRoles } from '../../db/schema/users.js';
import { auditLog, activityLog } from '../../db/schema/audit.js';
import { hashPassword } from '../../utils/password.js';
import { v4 as uuidv4 } from 'uuid';
import { MANAGER_PERMISSIONS, DEFAULT_USER_PERMISSIONS } from '@investor-backoffice/shared';

const ADMIN_ID = uuidv4();
const MANAGER_ID = uuidv4();
const ANALYST_ID = uuidv4();

async function seedTestUsers() {
  const db = getDb();
  const hash = await hashPassword('Pass123!');

  await db.insert(users).values([
    { id: ADMIN_ID, email: 'admin@test.com', alias: 'admin', passwordHash: hash, fullName: 'Admin', isAdmin: true, isActive: true },
    { id: MANAGER_ID, email: 'manager@test.com', alias: 'manager', passwordHash: hash, fullName: 'Manager', isAdmin: false, isActive: true },
    { id: ANALYST_ID, email: 'analyst@test.com', alias: 'analyst', passwordHash: hash, fullName: 'Analyst', isAdmin: false, isActive: true },
  ]).run();

  const mgrRoleId = uuidv4();
  await db.insert(accessRoles).values({
    id: mgrRoleId,
    name: 'Manager',
    permissions: JSON.stringify(MANAGER_PERMISSIONS),
  }).run();
  await db.insert(userAccessRoles).values({ userId: MANAGER_ID, roleId: mgrRoleId }).run();

  const analystRoleId = uuidv4();
  await db.insert(accessRoles).values({
    id: analystRoleId,
    name: 'Analyst',
    permissions: JSON.stringify(DEFAULT_USER_PERMISSIONS),
  }).run();
  await db.insert(userAccessRoles).values({ userId: ANALYST_ID, roleId: analystRoleId }).run();
}

describe('Audit API', () => {
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
    await db.delete(activityLog).run();
    await db.delete(userAccessRoles).run();
    await db.delete(accessRoles).run();
    await db.delete(users).run();
    await seedTestUsers();
  });

  function adminToken() {
    return app.jwt.sign({ sub: ADMIN_ID, email: 'admin@test.com', isAdmin: true });
  }

  function managerToken() {
    return app.jwt.sign({ sub: MANAGER_ID, email: 'manager@test.com', isAdmin: false });
  }

  function analystToken() {
    return app.jwt.sign({ sub: ANALYST_ID, email: 'analyst@test.com', isAdmin: false });
  }

  describe('GET /api/audit', () => {
    it('returns paginated audit log for admin', async () => {
      const db = getDb();
      // Insert a test audit log entry
      await db.insert(auditLog).values({
        id: uuidv4(),
        entityType: 'user',
        entityId: ADMIN_ID,
        action: 'CREATE',
        actionBy: ADMIN_ID,
      }).run();

      const res = await app.inject({
        method: 'GET',
        url: '/api/audit?page=1&pageSize=10',
        headers: { authorization: `Bearer ${adminToken()}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: unknown[]; page: number; pageSize: number }>();
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(10);
    });

    it('returns audit log for manager (has AUDIT_READ permission)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: { authorization: `Bearer ${managerToken()}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 403 for analyst (no AUDIT_READ permission)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/audit',
        headers: { authorization: `Bearer ${analystToken()}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 401 without auth token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/audit' });
      expect(res.statusCode).toBe(401);
    });

    it('filters by entityType when provided', async () => {
      const db = getDb();
      await db.insert(auditLog).values([
        { id: uuidv4(), entityType: 'user', entityId: ADMIN_ID, action: 'CREATE', actionBy: ADMIN_ID },
        { id: uuidv4(), entityType: 'customer', entityId: uuidv4(), action: 'CREATE', actionBy: ADMIN_ID },
      ]).run();

      const res = await app.inject({
        method: 'GET',
        url: '/api/audit?entityType=user',
        headers: { authorization: `Bearer ${adminToken()}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: Array<{ entityType: string }> }>();
      // All returned entries should be of type 'user'
      body.data.forEach((entry) => {
        expect(entry.entityType).toBe('user');
      });
    });
  });

  describe('GET /api/activity', () => {
    it('returns paginated activity log for admin', async () => {
      const db = getDb();
      await db.insert(activityLog).values({
        id: uuidv4(),
        userId: ADMIN_ID,
        action: 'LOGIN',
        occurredAt: new Date().toISOString(),
      }).run();

      const res = await app.inject({
        method: 'GET',
        url: '/api/activity?page=1&pageSize=10',
        headers: { authorization: `Bearer ${adminToken()}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: unknown[]; page: number; pageSize: number }>();
      expect(body.data).toBeInstanceOf(Array);
      expect(body.page).toBe(1);
    });

    it('returns 403 for manager (no ACTIVITY_READ permission)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/activity',
        headers: { authorization: `Bearer ${managerToken()}` },
      });
      // Manager doesn't have ACTIVITY_READ, only admin does
      expect(res.statusCode).toBe(403);
    });

    it('returns 401 without auth token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/activity' });
      expect(res.statusCode).toBe(401);
    });
  });
});
