# TASK-004: Gmail Domain — Repository

## Goal
Create the data access layer for Gmail tokens and cached messages. Follows the existing repository pattern used in customers domain.

## Changes

### `packages/backend/src/domains/gmail/gmail.repository.ts` (NEW)

**Token operations:**
- `saveTokens(params: { userId, gmailEmail, accessTokenEnc, refreshTokenEnc, tokenExpiry })` — Upsert (insert or update on conflict user_id) the encrypted OAuth tokens
- `getTokens(userId: string)` — Get user's encrypted Gmail tokens row, or null
- `deleteTokens(userId: string)` — Delete user's Gmail tokens (disconnect)

**Message operations:**
- `upsertMessages(messages: NewGmailMessage[])` — Batch insert/upsert messages (ON CONFLICT gmail_id DO UPDATE to handle re-syncs)
- `getMessagesByCustomer(customerId: string, userId: string, opts: { page, pageSize })` — Paginated query for cached messages by customer
- `getLatestMessageDate(userId: string, customerId: string)` — Get the `received_at` of the newest cached message for incremental sync
- `deleteMessagesByUser(userId: string)` — Delete all cached messages for a user (used on disconnect)

## Files to Create
| File | Action |
|---|---|
| `packages/backend/src/domains/gmail/gmail.repository.ts` | Create |

## Verification
- TypeScript compiles cleanly
- Repository functions use Drizzle ORM with parameterized queries (no raw SQL string concatenation)
- Upsert logic correctly handles duplicate gmail_id
