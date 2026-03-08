-- Gmail OAuth tokens (per-user, encrypted at rest with AES-256-GCM)
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
