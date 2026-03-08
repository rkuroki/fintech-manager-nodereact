import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createTestApp, teardownTestDb } from '../../tests/helpers.js';
import { getDb } from '../../db/connection.js';
import { users, accessRoles, userAccessRoles } from '../../db/schema/users.js';
import { customers, communicationHistory } from '../../db/schema/customers.js';
import { userGmailTokens, gmailMessages } from '../../db/schema/gmail.js';
import { auditLog, activityLog } from '../../db/schema/audit.js';
import { hashPassword } from '../../utils/password.js';
import { encrypt } from '../../utils/crypto.js';
import { v4 as uuidv4 } from 'uuid';
import { MANAGER_PERMISSIONS, DEFAULT_USER_PERMISSIONS } from '@investor-backoffice/shared';

const ADMIN_ID = uuidv4();
const MANAGER_ID = uuidv4();
const ANALYST_ID = uuidv4();
const CUSTOMER_ID = uuidv4();

async function seedTestData() {
  const db = getDb();
  const hash = await hashPassword('Pass123!');

  await db.insert(users).values([
    { id: ADMIN_ID, email: 'admin@test.com', alias: 'admin', passwordHash: hash, fullName: 'Admin', isAdmin: true, isActive: true },
    { id: MANAGER_ID, email: 'manager@test.com', alias: 'manager', passwordHash: hash, fullName: 'Manager', isAdmin: false, isActive: true },
    { id: ANALYST_ID, email: 'analyst@test.com', alias: 'analyst', passwordHash: hash, fullName: 'Analyst', isAdmin: false, isActive: true },
  ]).run();

  // Manager role (includes GMAIL_CONNECT + GMAIL_SYNC)
  const mgrRoleId = uuidv4();
  await db.insert(accessRoles).values({
    id: mgrRoleId,
    name: 'Manager',
    permissions: JSON.stringify(MANAGER_PERMISSIONS),
  }).run();
  await db.insert(userAccessRoles).values({ userId: MANAGER_ID, roleId: mgrRoleId }).run();

  // Analyst role (no GMAIL_CONNECT/GMAIL_SYNC)
  const analystRoleId = uuidv4();
  await db.insert(accessRoles).values({
    id: analystRoleId,
    name: 'Analyst',
    permissions: JSON.stringify(DEFAULT_USER_PERMISSIONS),
  }).run();
  await db.insert(userAccessRoles).values({ userId: ANALYST_ID, roleId: analystRoleId }).run();

  // Test customer with email
  await db.insert(customers).values({
    id: CUSTOMER_ID,
    mnemonic: 'TESTCUST001',
    fullName: 'Test Customer',
    email: 'customer@example.com',
    createdBy: ADMIN_ID,
  }).run();
}

describe('Gmail API', () => {
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
    // Clean up in correct order (FK constraints)
    await db.delete(gmailMessages).run();
    await db.delete(userGmailTokens).run();
    await db.delete(communicationHistory).run();
    await db.delete(customers).run();
    await db.delete(activityLog).run();
    await db.delete(auditLog).run();
    await db.delete(userAccessRoles).run();
    await db.delete(accessRoles).run();
    await db.delete(users).run();
    await seedTestData();
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

  // ─── GET /api/gmail/status ───────────────────────────────────────────

  describe('GET /api/gmail/status', () => {
    it('returns not configured when Google env vars are missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/gmail/status',
        headers: { authorization: `Bearer ${adminToken()}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json<{ connected: boolean; configured: boolean }>();
      expect(body.connected).toBe(false);
      expect(body.configured).toBe(false);
    });

    it('returns connected: false for user with no tokens', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/gmail/status',
        headers: { authorization: `Bearer ${managerToken()}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json<{ connected: boolean }>();
      expect(body.connected).toBe(false);
    });

    it('returns connected: true when user has stored tokens', async () => {
      const db = getDb();
      await db.insert(userGmailTokens).values({
        id: uuidv4(),
        userId: MANAGER_ID,
        gmailEmail: 'manager@company.com',
        accessTokenEnc: encrypt('fake-access-token'),
        refreshTokenEnc: encrypt('fake-refresh-token'),
        tokenExpiry: new Date(Date.now() + 3600_000).toISOString(),
      }).run();

      const res = await app.inject({
        method: 'GET',
        url: '/api/gmail/status',
        headers: { authorization: `Bearer ${managerToken()}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json<{ connected: boolean; email: string; configured: boolean }>();
      // Token exists in DB — connected should be true even if Google env is not configured
      expect(body.connected).toBe(true);
      expect(body.email).toBe('manager@company.com');
      expect(body.configured).toBe(false); // env vars not set in test environment
    });

    it('returns 403 for analyst (no GMAIL_CONNECT)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/gmail/status',
        headers: { authorization: `Bearer ${analystToken()}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 401 without auth token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/gmail/status' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── GET /api/gmail/auth ─────────────────────────────────────────────

  describe('GET /api/gmail/auth', () => {
    it('returns 501 when Google env vars are not configured', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/gmail/auth',
        headers: { authorization: `Bearer ${managerToken()}` },
      });
      // The route should return 501 since GOOGLE_CLIENT_ID is not set
      expect(res.statusCode).toBe(501);
    });

    it('returns 403 for analyst (no GMAIL_CONNECT)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/gmail/auth',
        headers: { authorization: `Bearer ${analystToken()}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 401 without auth token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/gmail/auth' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── DELETE /api/gmail/disconnect ─────────────────────────────────────

  describe('DELETE /api/gmail/disconnect', () => {
    it('removes tokens and cached messages on disconnect', async () => {
      const db = getDb();

      // Insert tokens
      await db.insert(userGmailTokens).values({
        id: uuidv4(),
        userId: MANAGER_ID,
        gmailEmail: 'manager@company.com',
        accessTokenEnc: encrypt('fake-access-token'),
        refreshTokenEnc: encrypt('fake-refresh-token'),
        tokenExpiry: new Date(Date.now() + 3600_000).toISOString(),
      }).run();

      // Insert cached messages
      await db.insert(gmailMessages).values({
        id: uuidv4(),
        gmailId: 'msg-001',
        threadId: 'thread-001',
        customerId: CUSTOMER_ID,
        userId: MANAGER_ID,
        direction: 'inbound',
        fromAddress: 'customer@example.com',
        toAddress: 'manager@company.com',
        subject: 'Test email',
        receivedAt: new Date().toISOString(),
      }).run();

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/gmail/disconnect',
        headers: { authorization: `Bearer ${managerToken()}` },
      });
      expect(res.statusCode).toBe(204);

      // Verify tokens removed
      const tokens = await db.select().from(userGmailTokens).all();
      expect(tokens).toHaveLength(0);

      // Verify cached messages removed
      const msgs = await db.select().from(gmailMessages).all();
      expect(msgs).toHaveLength(0);
    });

    it('returns 204 even if no tokens exist (idempotent)', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/gmail/disconnect',
        headers: { authorization: `Bearer ${managerToken()}` },
      });
      expect(res.statusCode).toBe(204);
    });

    it('returns 403 for analyst (no GMAIL_CONNECT)', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/gmail/disconnect',
        headers: { authorization: `Bearer ${analystToken()}` },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // ─── POST /api/gmail/sync/:customerId ─────────────────────────────────

  describe('POST /api/gmail/sync/:customerId', () => {
    it('returns 501 when Google env vars are not configured', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/gmail/sync/${CUSTOMER_ID}`,
        headers: { authorization: `Bearer ${managerToken()}` },
      });
      expect(res.statusCode).toBe(501);
    });

    it('returns 403 for analyst (no GMAIL_SYNC)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/gmail/sync/${CUSTOMER_ID}`,
        headers: { authorization: `Bearer ${analystToken()}` },
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 401 without auth token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/gmail/sync/${CUSTOMER_ID}`,
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── GET /api/gmail/timeline/:customerId ──────────────────────────────

  describe('GET /api/gmail/timeline/:customerId', () => {
    it('returns empty timeline for customer with no entries', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/gmail/timeline/${CUSTOMER_ID}`,
        headers: { authorization: `Bearer ${managerToken()}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: unknown[]; total: number }>();
      expect(body.data).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('returns manual entries only when no Gmail messages exist', async () => {
      const db = getDb();
      const commId = uuidv4();
      await db.insert(communicationHistory).values({
        id: commId,
        customerId: CUSTOMER_ID,
        channel: 'phone',
        summary: 'Called about portfolio',
        occurredAt: '2026-03-07T15:00:00.000Z',
        recordedBy: MANAGER_ID,
      }).run();

      const res = await app.inject({
        method: 'GET',
        url: `/api/gmail/timeline/${CUSTOMER_ID}`,
        headers: { authorization: `Bearer ${managerToken()}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: Array<{ type: string; id: string }>; total: number }>();
      expect(body.total).toBe(1);
      expect(body.data[0]!.type).toBe('manual');
    });

    it('returns Gmail entries when cached messages exist', async () => {
      const db = getDb();
      const msgId = uuidv4();
      await db.insert(gmailMessages).values({
        id: msgId,
        gmailId: 'gmail-001',
        threadId: 'thread-001',
        customerId: CUSTOMER_ID,
        userId: MANAGER_ID,
        direction: 'inbound',
        fromAddress: 'customer@example.com',
        toAddress: 'manager@company.com',
        subject: 'Investment Update',
        snippet: 'Here is the latest report...',
        receivedAt: '2026-03-08T10:00:00.000Z',
        labelIds: JSON.stringify(['INBOX']),
        isRead: 1,
      }).run();

      const res = await app.inject({
        method: 'GET',
        url: `/api/gmail/timeline/${CUSTOMER_ID}`,
        headers: { authorization: `Bearer ${managerToken()}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: Array<{ type: string; data: { subject?: string } }>; total: number }>();
      expect(body.total).toBe(1);
      expect(body.data[0]!.type).toBe('gmail');
      expect(body.data[0]!.data.subject).toBe('Investment Update');
    });

    it('merges manual + Gmail entries sorted by timestamp desc', async () => {
      const db = getDb();

      // Insert manual record (older)
      await db.insert(communicationHistory).values({
        id: uuidv4(),
        customerId: CUSTOMER_ID,
        channel: 'phone',
        summary: 'Phone call',
        occurredAt: '2026-03-06T10:00:00.000Z',
        recordedBy: MANAGER_ID,
      }).run();

      // Insert Gmail message (newer)
      await db.insert(gmailMessages).values({
        id: uuidv4(),
        gmailId: 'gmail-002',
        threadId: 'thread-002',
        customerId: CUSTOMER_ID,
        userId: MANAGER_ID,
        direction: 'outbound',
        fromAddress: 'manager@company.com',
        toAddress: 'customer@example.com',
        subject: 'Follow up',
        receivedAt: '2026-03-08T14:00:00.000Z',
      }).run();

      // Insert another manual record (middle)
      await db.insert(communicationHistory).values({
        id: uuidv4(),
        customerId: CUSTOMER_ID,
        channel: 'email',
        summary: 'Sent report',
        occurredAt: '2026-03-07T09:00:00.000Z',
        recordedBy: MANAGER_ID,
      }).run();

      const res = await app.inject({
        method: 'GET',
        url: `/api/gmail/timeline/${CUSTOMER_ID}`,
        headers: { authorization: `Bearer ${managerToken()}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: Array<{ type: string; timestamp: string }>; total: number }>();
      expect(body.total).toBe(3);

      // Should be sorted descending: gmail (Mar 8), manual (Mar 7), manual (Mar 6)
      expect(body.data[0]!.type).toBe('gmail');
      expect(body.data[1]!.type).toBe('manual');
      expect(body.data[2]!.type).toBe('manual');
      expect(new Date(body.data[0]!.timestamp).getTime()).toBeGreaterThan(
        new Date(body.data[1]!.timestamp).getTime(),
      );
      expect(new Date(body.data[1]!.timestamp).getTime()).toBeGreaterThan(
        new Date(body.data[2]!.timestamp).getTime(),
      );
    });

    it('supports pagination', async () => {
      const db = getDb();
      // Insert 3 manual records
      for (let i = 1; i <= 3; i++) {
        await db.insert(communicationHistory).values({
          id: uuidv4(),
          customerId: CUSTOMER_ID,
          channel: 'phone',
          summary: `Call ${i}`,
          occurredAt: `2026-03-0${i}T10:00:00.000Z`,
          recordedBy: MANAGER_ID,
        }).run();
      }

      const res = await app.inject({
        method: 'GET',
        url: `/api/gmail/timeline/${CUSTOMER_ID}?page=1&pageSize=2`,
        headers: { authorization: `Bearer ${managerToken()}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: unknown[]; total: number; page: number; pageSize: number }>();
      expect(body.data).toHaveLength(2);
      expect(body.total).toBe(3);
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(2);
    });

    it('returns 404 for non-existent customer', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/gmail/timeline/${uuidv4()}`,
        headers: { authorization: `Bearer ${managerToken()}` },
      });
      expect(res.statusCode).toBe(404);
    });

    it('analyst can view timeline (has COMMUNICATIONS_READ)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/gmail/timeline/${CUSTOMER_ID}`,
        headers: { authorization: `Bearer ${analystToken()}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it('returns 401 without auth token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/gmail/timeline/${CUSTOMER_ID}`,
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── GET /api/gmail/callback ──────────────────────────────────────────

  describe('GET /api/gmail/callback', () => {
    it('returns 400 when code or state is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/gmail/callback',
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when only code is provided', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/gmail/callback?code=test-code',
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
