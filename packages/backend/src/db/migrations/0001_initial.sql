-- Migration: 0001_initial
-- Creates all tables and the immutability trigger for audit_log

CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL UNIQUE,
  `alias` text NOT NULL UNIQUE,
  `password_hash` text NOT NULL,
  `full_name` text NOT NULL,
  `mobile_number` text,
  `identity_id` text,
  `is_admin` integer NOT NULL DEFAULT 0,
  `is_active` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  `updated_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  `deleted_at` text
);

CREATE TABLE IF NOT EXISTS `user_groups` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL UNIQUE,
  `description` text,
  `created_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  `updated_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  `deleted_at` text
);

CREATE TABLE IF NOT EXISTS `user_group_members` (
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `group_id` text NOT NULL REFERENCES `user_groups`(`id`) ON DELETE CASCADE,
  `added_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (`user_id`, `group_id`)
);

CREATE TABLE IF NOT EXISTS `access_roles` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL UNIQUE,
  `description` text,
  `permissions` text NOT NULL DEFAULT '[]',
  `created_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  `updated_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS `user_access_roles` (
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `role_id` text NOT NULL REFERENCES `access_roles`(`id`) ON DELETE CASCADE,
  `assigned_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (`user_id`, `role_id`)
);

CREATE TABLE IF NOT EXISTS `group_access_roles` (
  `group_id` text NOT NULL REFERENCES `user_groups`(`id`) ON DELETE CASCADE,
  `role_id` text NOT NULL REFERENCES `access_roles`(`id`) ON DELETE CASCADE,
  `assigned_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (`group_id`, `role_id`)
);

CREATE TABLE IF NOT EXISTS `customers` (
  `id` text PRIMARY KEY NOT NULL,
  `mnemonic` text NOT NULL UNIQUE,
  `full_name` text NOT NULL,
  `email` text,
  `phone` text,
  `risk_profile` text,
  `investor_notes` text,
  `tax_id_enc` text,
  `date_of_birth_enc` text,
  `address_enc` text,
  `bank_details_enc` text,
  `created_by` text REFERENCES `users`(`id`),
  `created_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  `updated_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  `deleted_at` text
);

CREATE TABLE IF NOT EXISTS `investor_profiles` (
  `id` text PRIMARY KEY NOT NULL,
  `customer_id` text NOT NULL REFERENCES `customers`(`id`) ON DELETE CASCADE,
  `notes` text,
  `form_responses` text,
  `created_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  `updated_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS `customer_documents` (
  `id` text PRIMARY KEY NOT NULL,
  `customer_id` text NOT NULL REFERENCES `customers`(`id`) ON DELETE CASCADE,
  `filename` text NOT NULL,
  `original_name` text NOT NULL,
  `mime_type` text NOT NULL,
  `size_bytes` text NOT NULL,
  `uploaded_by` text NOT NULL REFERENCES `users`(`id`),
  `uploaded_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS `communication_history` (
  `id` text PRIMARY KEY NOT NULL,
  `customer_id` text NOT NULL REFERENCES `customers`(`id`) ON DELETE CASCADE,
  `channel` text NOT NULL,
  `summary` text NOT NULL,
  `occurred_at` text NOT NULL,
  `recorded_by` text NOT NULL REFERENCES `users`(`id`),
  `created_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Audit log: insert-only. The trigger below prevents any UPDATE or DELETE.
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` text PRIMARY KEY NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `action` text NOT NULL,
  `action_by` text NOT NULL,
  `action_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  `before_value` text,
  `after_value` text,
  `ip_address` text,
  `user_agent` text
);

-- Enforce immutability at the database level
CREATE TRIGGER IF NOT EXISTS audit_log_no_update
  BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is immutable: updates are not allowed');
END;

CREATE TRIGGER IF NOT EXISTS audit_log_no_delete
  BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit_log is immutable: deletes are not allowed');
END;

CREATE TABLE IF NOT EXISTS `activity_log` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `action` text NOT NULL,
  `metadata` text,
  `occurred_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_alias ON users(alias);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_customers_mnemonic ON customers(mnemonic);
CREATE INDEX IF NOT EXISTS idx_customers_full_name ON customers(full_name);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_by ON audit_log(action_by);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
