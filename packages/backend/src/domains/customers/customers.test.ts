import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, teardownTestDb } from '../../tests/helpers.js';
import { getDb } from '../../db/connection.js';
import { users } from '../../db/schema/users.js';
import { customers } from '../../db/schema/customers.js';
import { activityLog } from '../../db/schema/audit.js';
import { accessRoles, userAccessRoles } from '../../db/schema/users.js';
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

  // Create manager role
  const mgrRoleId = uuidv4();
  await db.insert(accessRoles).values({
    id: mgrRoleId,
    name: 'Manager',
    permissions: JSON.stringify(MANAGER_PERMISSIONS),
  }).run();

  // Assign manager role to manager user
  await db.insert(userAccessRoles).values({ userId: MANAGER_ID, roleId: mgrRoleId }).run();

  // Create analyst role
  const analystRoleId = uuidv4();
  await db.insert(accessRoles).values({
    id: analystRoleId,
    name: 'Analyst',
    permissions: JSON.stringify(DEFAULT_USER_PERMISSIONS),
  }).run();

  await db.insert(userAccessRoles).values({ userId: ANALYST_ID, roleId: analystRoleId }).run();
}

describe('Customers API', () => {
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
    await db.delete(customers).run();
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

  describe('POST /api/customers', () => {
    it('creates customer with auto-generated mnemonic', async () => {
      const token = managerToken();
      const res = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          fullName: 'João da Silva',
          email: 'joao@example.com',
          phone: '+5511999999999',
          riskProfile: 'moderate',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json<Record<string, unknown>>();
      expect(body['mnemonic']).toMatch(/^SILVA\d{3}$/);
      expect(body['fullName']).toBe('João da Silva');
      expect(body['email']).toBe('joao@example.com');
    });

    it('creates customer with custom mnemonic', async () => {
      const token = adminToken();
      const res = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          fullName: 'Custom Client',
          mnemonic: 'CUSTOM01',
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json<Record<string, unknown>>()['mnemonic']).toBe('CUSTOM01');
    });

    it('creates customer with sensitive data when authorized', async () => {
      const token = managerToken();
      const res = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          fullName: 'Sensitive Client',
          taxId: '123.456.789-00',
          dateOfBirth: '1990-01-15',
          address: '123 Main St',
          bankDetails: 'Bank ABC, Agency 001',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json<Record<string, unknown>>();
      // Manager can read sensitive data back
      expect(body['taxId']).toBe('123.456.789-00');
      expect(body['bankDetails']).toBe('Bank ABC, Agency 001');
    });
  });

  describe('GET /api/customers', () => {
    it('returns paginated customer list', async () => {
      const token = analystToken();
      // Create some customers first (as admin)
      const aToken = adminToken();
      await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${aToken}` },
        payload: { fullName: 'Customer A' },
      });
      await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${aToken}` },
        payload: { fullName: 'Customer B' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/customers?page=1&pageSize=10',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: unknown[]; total: number }>();
      expect(body.data).toHaveLength(2);
      expect(body.total).toBe(2);
    });
  });

  describe('GET /api/customers/:id', () => {
    it('returns customer without sensitive data for analyst', async () => {
      const aToken = adminToken();
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${aToken}` },
        payload: {
          fullName: 'Restricted Client',
          taxId: '999.888.777-66',
        },
      });
      const { id } = createRes.json<{ id: string }>();

      const res = await app.inject({
        method: 'GET',
        url: `/api/customers/${id}`,
        headers: { authorization: `Bearer ${analystToken()}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<Record<string, unknown>>();
      expect(body['fullName']).toBe('Restricted Client');
      // Analyst should NOT see sensitive data
      expect(body).not.toHaveProperty('taxId');
    });

    it('returns customer with decrypted sensitive data for manager', async () => {
      const mToken = managerToken();
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${mToken}` },
        payload: {
          fullName: 'Visible Client',
          taxId: '111.222.333-44',
          address: '456 Oak Ave',
        },
      });
      const { id } = createRes.json<{ id: string }>();

      const res = await app.inject({
        method: 'GET',
        url: `/api/customers/${id}`,
        headers: { authorization: `Bearer ${mToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<Record<string, unknown>>();
      expect(body['taxId']).toBe('111.222.333-44');
      expect(body['address']).toBe('456 Oak Ave');
    });

    it('returns 404 for non-existent customer', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/customers/${uuidv4()}`,
        headers: { authorization: `Bearer ${analystToken()}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/customers/:id', () => {
    it('updates customer fields', async () => {
      const token = managerToken();
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${token}` },
        payload: { fullName: 'Before Update' },
      });
      const { id } = createRes.json<{ id: string }>();

      const res = await app.inject({
        method: 'PUT',
        url: `/api/customers/${id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { fullName: 'After Update', email: 'updated@test.com' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<Record<string, unknown>>()['fullName']).toBe('After Update');
    });
  });

  describe('DELETE /api/customers/:id', () => {
    it('soft-deletes customer', async () => {
      const token = adminToken();
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${token}` },
        payload: { fullName: 'To Delete' },
      });
      const { id } = createRes.json<{ id: string }>();

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/customers/${id}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(deleteRes.statusCode).toBe(204);

      // Verify deleted customer returns 404
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/customers/${id}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(getRes.statusCode).toBe(404);
    });
  });

  describe('Investor Profile', () => {
    it('creates and retrieves investor profile', async () => {
      const token = managerToken();
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${token}` },
        payload: { fullName: 'Profile Client' },
      });
      const { id } = createRes.json<{ id: string }>();

      // Update profile
      const putRes = await app.inject({
        method: 'PUT',
        url: `/api/customers/${id}/profile`,
        headers: { authorization: `Bearer ${token}` },
        payload: { notes: 'Prefers conservative investments', formResponses: { q1: 'answer1' } },
      });
      expect(putRes.statusCode).toBe(200);

      // Get profile
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/customers/${id}/profile`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(getRes.statusCode).toBe(200);
      const profile = getRes.json<Record<string, unknown>>();
      expect(profile['notes']).toBe('Prefers conservative investments');
    });
  });

  describe('Communications', () => {
    it('creates and lists communications', async () => {
      const token = managerToken();
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${token}` },
        payload: { fullName: 'Comm Client' },
      });
      const { id } = createRes.json<{ id: string }>();

      // Create a communication
      const commRes = await app.inject({
        method: 'POST',
        url: `/api/customers/${id}/communications`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          channel: 'email',
          summary: 'Discussed portfolio rebalancing',
          occurredAt: '2024-01-15T10:00:00Z',
        },
      });
      expect(commRes.statusCode).toBe(201);

      // List communications
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/customers/${id}/communications`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(listRes.statusCode).toBe(200);
      const body = listRes.json<{ data: unknown[]; total: number }>();
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
    });
  });

  describe('Health endpoint', () => {
    it('returns ok without auth', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/health' });
      expect(res.statusCode).toBe(200);
      expect(res.json<{ status: string }>().status).toBe('ok');
    });
  });

  describe('GET /api/customers/by-mnemonic/:mnemonic', () => {
    it('returns customer by mnemonic without sensitive data for analyst', async () => {
      const aToken = adminToken();
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${aToken}` },
        payload: { fullName: 'João da Silva', taxId: '123.456.789-00' },
      });
      const { mnemonic } = createRes.json<{ mnemonic: string }>();

      const res = await app.inject({
        method: 'GET',
        url: `/api/customers/by-mnemonic/${mnemonic}`,
        headers: { authorization: `Bearer ${analystToken()}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<Record<string, unknown>>();
      expect(body['mnemonic']).toBe(mnemonic);
      expect(body).not.toHaveProperty('taxId');
    });

    it('returns 404 for non-existent mnemonic', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/customers/by-mnemonic/NOTEXIST999',
        headers: { authorization: `Bearer ${analystToken()}` },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Communication update/delete', () => {
    it('updates a communication record', async () => {
      const token = managerToken();
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${token}` },
        payload: { fullName: 'Comm Update Client' },
      });
      const { id } = createRes.json<{ id: string }>();

      const commRes = await app.inject({
        method: 'POST',
        url: `/api/customers/${id}/communications`,
        headers: { authorization: `Bearer ${token}` },
        payload: { channel: 'email', summary: 'Initial summary', occurredAt: '2024-01-15T10:00:00Z' },
      });
      const { id: commId } = commRes.json<{ id: string }>();

      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/customers/${id}/communications/${commId}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { summary: 'Updated summary' },
      });
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.json<Record<string, unknown>>()['summary']).toBe('Updated summary');
    });

    it('deletes a communication record', async () => {
      const token = managerToken();
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${token}` },
        payload: { fullName: 'Comm Delete Client' },
      });
      const { id } = createRes.json<{ id: string }>();

      const commRes = await app.inject({
        method: 'POST',
        url: `/api/customers/${id}/communications`,
        headers: { authorization: `Bearer ${token}` },
        payload: { channel: 'phone', summary: 'To be deleted', occurredAt: '2024-02-01T09:00:00Z' },
      });
      const { id: commId } = commRes.json<{ id: string }>();

      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/customers/${id}/communications/${commId}`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(deleteRes.statusCode).toBe(204);
    });
  });

  describe('Customer Roles', () => {
    it('gets customer roles (initially empty)', async () => {
      const token = managerToken();
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${token}` },
        payload: { fullName: 'Roles Client' },
      });
      const { id } = createRes.json<{ id: string }>();

      const res = await app.inject({
        method: 'GET',
        url: `/api/customers/${id}/roles`,
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toBeInstanceOf(Array);
    });

    it('sets customer roles as manager (write_sensitive permission)', async () => {
      const aToken = adminToken();
      const mToken = managerToken();

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${mToken}` },
        payload: { fullName: 'Role Assign Client' },
      });
      const { id: customerId } = createRes.json<{ id: string }>();

      const roleRes = await app.inject({
        method: 'POST',
        url: '/api/users/roles',
        headers: { authorization: `Bearer ${aToken}` },
        payload: { name: 'Customer Viewer', permissions: ['customers:read'] },
      });
      const { id: roleId } = roleRes.json<{ id: string }>();

      const setRes = await app.inject({
        method: 'PUT',
        url: `/api/customers/${customerId}/roles`,
        headers: { authorization: `Bearer ${mToken}` },
        payload: { roleIds: [roleId] },
      });
      expect(setRes.statusCode).toBe(204);
    });
  });

  describe('Documents', () => {
    it('lists documents for a customer (initially empty)', async () => {
      const aToken = adminToken();
      const analToken = analystToken();

      const createRes = await app.inject({
        method: 'POST',
        url: '/api/customers',
        headers: { authorization: `Bearer ${aToken}` },
        payload: { fullName: 'Docs Client' },
      });
      const { id } = createRes.json<{ id: string }>();

      const res = await app.inject({
        method: 'GET',
        url: `/api/customers/${id}/documents`,
        headers: { authorization: `Bearer ${analToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toBeInstanceOf(Array);
      expect((res.json() as unknown[]).length).toBe(0);
    });
  });
});
