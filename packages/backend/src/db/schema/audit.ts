import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';

/**
 * IMMUTABLE audit log.
 * A SQLite trigger (created in the initial migration) prevents any UPDATE or DELETE
 * on this table. The application layer also has no delete path.
 * Sensitive plaintext is NEVER stored here — only "[ENCRYPTED]" markers.
 */
export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(), // 'user'|'customer'|etc
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(), // 'CREATE'|'UPDATE'|'DELETE'|'READ_SENSITIVE'
  actionBy: text('action_by').notNull(), // user id (or 'system' for automated actions)
  actionAt: text('action_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  beforeValue: text('before_value'), // JSON string — sensitive fields shown as [ENCRYPTED]
  afterValue: text('after_value'), // JSON string — sensitive fields shown as [ENCRYPTED]
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

export const activityLog = sqliteTable('activity_log', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  action: text('action').notNull(), // e.g. 'LOGIN', 'LOGOUT', 'VIEW_CUSTOMER'
  metadata: text('metadata'), // JSON
  occurredAt: text('occurred_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});
