# TASK-003: DB Migration & Drizzle Schema

## Goal
Create the database tables for storing Gmail OAuth tokens and cached email messages.

## Changes

### 1. `packages/backend/src/db/migrations/0003_gmail_integration.sql` (NEW)
```sql
-- Gmail OAuth tokens (per-user, encrypted)
CREATE TABLE IF NOT EXISTS user_gmail_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_email TEXT NOT NULL,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  token_expiry TEXT NOT NULL,
  connected_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_gmail_tokens_user_id ON user_gmail_tokens(user_id);

-- Cached Gmail messages (per-customer, per-user)
CREATE TABLE IF NOT EXISTS gmail_messages (
  id TEXT PRIMARY KEY,
  gmail_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  snippet TEXT,
  received_at TEXT NOT NULL,
  label_ids TEXT,
  is_read INTEGER NOT NULL DEFAULT 1,
  synced_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gmail_messages_gmail_id ON gmail_messages(gmail_id);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_customer_id ON gmail_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_gmail_messages_user_id ON gmail_messages(user_id);
```

### 2. `packages/backend/src/db/schema/gmail.ts` (NEW)
Drizzle schema following existing pattern from `customers.ts`:
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';
import { customers } from './customers.js';

export const userGmailTokens = sqliteTable('user_gmail_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gmailEmail: text('gmail_email').notNull(),
  accessTokenEnc: text('access_token_enc').notNull(),
  refreshTokenEnc: text('refresh_token_enc').notNull(),
  tokenExpiry: text('token_expiry').notNull(),
  connectedAt: text('connected_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const gmailMessages = sqliteTable('gmail_messages', {
  id: text('id').primaryKey(),
  gmailId: text('gmail_id').notNull(),
  threadId: text('thread_id').notNull(),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  direction: text('direction').notNull(), // 'inbound' | 'outbound'
  fromAddress: text('from_address').notNull(),
  toAddress: text('to_address').notNull(),
  subject: text('subject'),
  snippet: text('snippet'),
  receivedAt: text('received_at').notNull(),
  labelIds: text('label_ids'), // JSON array as string
  isRead: integer('is_read').notNull().default(1),
  syncedAt: text('synced_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});
```

### 3. `packages/backend/src/db/schema/index.ts`
Add: `export * from './gmail.js';`

## Files to Change
| File | Action |
|---|---|
| `packages/backend/src/db/migrations/0003_gmail_integration.sql` | Create |
| `packages/backend/src/db/schema/gmail.ts` | Create |
| `packages/backend/src/db/schema/index.ts` | Add export |

## Verification
- Migration runs successfully on in-memory SQLite (existing tests still pass)
- Drizzle schema compiles without TypeScript errors
- Tables are created with correct columns and constraints
