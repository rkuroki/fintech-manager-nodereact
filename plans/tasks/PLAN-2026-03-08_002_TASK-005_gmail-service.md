# TASK-005: Gmail Domain — Service

## Goal
Core business logic for Gmail OAuth2, email syncing, and unified timeline. Uses native `fetch()` to call Google APIs directly (no `googleapis` npm package).

## Changes

### `packages/backend/src/domains/gmail/gmail.service.ts` (NEW)

**OAuth2 Flow:**

1. **`getAuthUrl(userId: string): string`**
   - Check `isGmailConfigured()` — throw 501 if not
   - Build Google OAuth2 consent URL:
     - `https://accounts.google.com/o/oauth2/v2/auth`
     - Scopes: `https://www.googleapis.com/auth/gmail.readonly`
     - State: encrypt userId for CSRF protection using `crypto.encrypt()`
     - access_type: `offline` (to get refresh token)
     - prompt: `consent` (to always get refresh token)
   - Return URL string

2. **`handleCallback(code: string, state: string): Promise<GmailConnectionStatus>`**
   - Decrypt state → get userId
   - POST to `https://oauth2.googleapis.com/token` with auth code exchange
   - Extract access_token, refresh_token, expires_in
   - Encrypt both tokens using `crypto.encrypt()`
   - Fetch user's Gmail email via `GET /gmail/v1/users/me/profile`
   - Save to `user_gmail_tokens` via repository
   - Return `GmailConnectionStatus`

3. **`refreshAccessToken(userId: string): Promise<string>`**
   - Load encrypted refresh_token from DB → decrypt
   - POST to Google token endpoint with `grant_type=refresh_token`
   - Re-encrypt new access_token → update DB
   - Return decrypted access_token for immediate use

4. **`getConnectionStatus(userId: string): Promise<GmailConnectionStatus>`**
   - Query `user_gmail_tokens` for userId
   - Return `{ connected, email, connectedAt }`

5. **`disconnect(userId: string): Promise<void>`**
   - Load access_token → decrypt → POST to `https://oauth2.googleapis.com/revoke`
   - Delete tokens from DB via repository
   - Delete cached messages for this user via repository

**Email Sync:**

6. **`syncEmails(userId: string, customerId: string): Promise<GmailSyncResult>`**
   - Get customer email from `customers` table — if null, return `{ synced: 0 }`
   - Get user's access_token (refresh if expired)
   - Build Gmail search query: `from:{customerEmail} OR to:{customerEmail}`
   - GET `https://gmail.googleapis.com/gmail/v1/users/me/messages?q={query}&maxResults=50`
   - For each message ID, fetch metadata:
     `GET /gmail/v1/users/me/messages/{id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`
   - Parse headers, determine direction (inbound vs outbound based on user's Gmail address)
   - Batch upsert into `gmail_messages` via repository
   - For incremental sync: use `after:{lastSyncDate}` in Gmail query
   - Return `GmailSyncResult`

**Timeline:**

7. **`getTimeline(userId: string, customerId: string, opts?: PaginationParams): Promise<PaginatedResponse<TimelineEntry>>`**
   - Query `communication_history` for this customer
   - Query `gmail_messages` for this customer + this user
   - Map each to `TimelineEntry` with `type: 'manual' | 'gmail'`
   - Merge and sort by timestamp descending
   - Apply pagination (offset-based)
   - Return paginated response

**Helper:**
- `getValidAccessToken(userId)` — private function that checks token_expiry, refreshes if needed, returns decrypted access_token
- `parseGmailHeaders(headers[])` — extract From, To, Subject, Date from Gmail message metadata

## Files to Create
| File | Action |
|---|---|
| `packages/backend/src/domains/gmail/gmail.service.ts` | Create |

## Key Technical Notes
- All Google API calls use native `fetch()` — no external HTTP library
- OAuth tokens encrypted at rest using existing `crypto.encrypt()` / `crypto.decrypt()`
- Gmail API rate limiting: implement simple retry-after on 429 responses
- Incremental sync: only fetch messages newer than the latest `received_at` in cache
- If customer has no email set, sync returns `{ synced: 0 }` immediately
