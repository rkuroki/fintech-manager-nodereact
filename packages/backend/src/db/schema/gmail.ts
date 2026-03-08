import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';
import { customers } from './customers.js';

/**
 * Per-user encrypted Gmail OAuth tokens.
 * access_token_enc and refresh_token_enc are AES-256-GCM encrypted.
 * One row per user — UNIQUE index on user_id.
 */
export const userGmailTokens = sqliteTable('user_gmail_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  gmailEmail: text('gmail_email').notNull(),
  accessTokenEnc: text('access_token_enc').notNull(),
  refreshTokenEnc: text('refresh_token_enc').notNull(),
  tokenExpiry: text('token_expiry').notNull(),
  connectedAt: text('connected_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

/**
 * Cached Gmail messages — email metadata synced from Gmail API.
 * Linked to both customer (for timeline) and user (who synced it).
 * Direction: 'inbound' = customer→analyst, 'outbound' = analyst→customer.
 */
export const gmailMessages = sqliteTable('gmail_messages', {
  id: text('id').primaryKey(),
  gmailId: text('gmail_id').notNull(),
  threadId: text('thread_id').notNull(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  direction: text('direction').notNull(), // 'inbound' | 'outbound'
  fromAddress: text('from_address').notNull(),
  toAddress: text('to_address').notNull(),
  subject: text('subject'),
  snippet: text('snippet'),
  receivedAt: text('received_at').notNull(),
  labelIds: text('label_ids'), // JSON array as string
  isRead: integer('is_read').notNull().default(1),
  syncedAt: text('synced_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});
