-- Migration: 0004_customer_notes
-- Creates the customer_notes table for discrete, editable note entries per customer

CREATE TABLE IF NOT EXISTS "customer_notes" (
  "id"          TEXT PRIMARY KEY,
  "customer_id" TEXT NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
  "content"     TEXT NOT NULL,
  "note_date"   TEXT NOT NULL,
  "created_by"  TEXT NOT NULL REFERENCES "users"("id"),
  "created_at"  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updated_at"  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS "idx_customer_notes_customer_id" ON "customer_notes"("customer_id");
CREATE INDEX IF NOT EXISTS "idx_customer_notes_note_date"   ON "customer_notes"("note_date");
