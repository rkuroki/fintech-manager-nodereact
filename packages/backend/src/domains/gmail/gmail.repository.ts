import { eq, and, sql, desc } from 'drizzle-orm';
import { getDb } from '../../db/connection.js';
import { userGmailTokens, gmailMessages } from '../../db/schema/gmail.js';
import { communicationHistory } from '../../db/schema/customers.js';
import { parsePagination } from '../../utils/pagination.js';

// ─── Token operations ─────────────────────────────────────────────────────

export async function getTokensByUserId(userId: string) {
  const db = getDb();
  const result = await db
    .select()
    .from(userGmailTokens)
    .where(eq(userGmailTokens.userId, userId))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertTokens(values: typeof userGmailTokens.$inferInsert) {
  const db = getDb();
  const existing = await getTokensByUserId(values.userId);
  if (existing) {
    await db
      .update(userGmailTokens)
      .set({
        gmailEmail: values.gmailEmail,
        accessTokenEnc: values.accessTokenEnc,
        refreshTokenEnc: values.refreshTokenEnc,
        tokenExpiry: values.tokenExpiry,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userGmailTokens.userId, values.userId));
    return getTokensByUserId(values.userId);
  } else {
    await db.insert(userGmailTokens).values(values);
    return getTokensByUserId(values.userId);
  }
}

export async function updateTokens(
  userId: string,
  values: { accessTokenEnc: string; tokenExpiry: string },
) {
  const db = getDb();
  await db
    .update(userGmailTokens)
    .set({ ...values, updatedAt: new Date().toISOString() })
    .where(eq(userGmailTokens.userId, userId));
}

export async function deleteTokensByUserId(userId: string) {
  const db = getDb();
  await db.delete(userGmailTokens).where(eq(userGmailTokens.userId, userId));
}

// ─── Message operations ───────────────────────────────────────────────────

export async function upsertMessages(messages: (typeof gmailMessages.$inferInsert)[]) {
  if (messages.length === 0) return;
  const db = getDb();
  const sqlite = db as unknown as { run: (q: unknown) => void };

  // SQLite upsert: INSERT OR REPLACE keyed by id
  // We use a transaction for atomicity
  for (const msg of messages) {
    // Check if message with this gmailId already exists
    const existing = await db
      .select({ id: gmailMessages.id })
      .from(gmailMessages)
      .where(eq(gmailMessages.gmailId, msg.gmailId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(gmailMessages)
        .set({
          subject: msg.subject ?? null,
          snippet: msg.snippet ?? null,
          labelIds: msg.labelIds ?? null,
          isRead: msg.isRead ?? 1,
          syncedAt: new Date().toISOString(),
        })
        .where(eq(gmailMessages.gmailId, msg.gmailId));
    } else {
      // Insert new
      await db.insert(gmailMessages).values(msg);
    }
  }
}

export async function getMessagesByCustomer(
  customerId: string,
  userId: string,
  opts: { page?: number; pageSize?: number } = {},
) {
  const db = getDb();
  const { limit, offset, page, pageSize } = parsePagination(opts);

  const where = and(
    eq(gmailMessages.customerId, customerId),
    eq(gmailMessages.userId, userId),
  );

  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(gmailMessages)
      .where(where)
      .orderBy(desc(gmailMessages.receivedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(gmailMessages).where(where),
  ]);

  return { data, total: Number(totalResult[0]?.count ?? 0), page, pageSize };
}

export async function getLatestMessageDate(
  userId: string,
  customerId: string,
): Promise<string | null> {
  const db = getDb();
  const result = await db
    .select({ receivedAt: gmailMessages.receivedAt })
    .from(gmailMessages)
    .where(
      and(
        eq(gmailMessages.userId, userId),
        eq(gmailMessages.customerId, customerId),
      ),
    )
    .orderBy(desc(gmailMessages.receivedAt))
    .limit(1);
  return result[0]?.receivedAt ?? null;
}

export async function deleteMessagesByUserId(userId: string) {
  const db = getDb();
  await db.delete(gmailMessages).where(eq(gmailMessages.userId, userId));
}

// ─── Communication history (for timeline merge) ──────────────────────────

export async function listCommunicationsForTimeline(customerId: string) {
  const db = getDb();
  return db
    .select()
    .from(communicationHistory)
    .where(eq(communicationHistory.customerId, customerId))
    .orderBy(desc(communicationHistory.occurredAt));
}

export async function listGmailMessagesForTimeline(
  customerId: string,
  userId: string,
) {
  const db = getDb();
  return db
    .select()
    .from(gmailMessages)
    .where(
      and(
        eq(gmailMessages.customerId, customerId),
        eq(gmailMessages.userId, userId),
      ),
    )
    .orderBy(desc(gmailMessages.receivedAt));
}
