-- Migration: 0002_groups_customers_roles
-- 1. Add mnemonic column to user_groups
-- 2. Add customer_access_roles junction table

ALTER TABLE user_groups ADD COLUMN mnemonic TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_groups_mnemonic ON user_groups(mnemonic);

CREATE TABLE IF NOT EXISTS `customer_access_roles` (
  `customer_id` text NOT NULL REFERENCES `customers`(`id`) ON DELETE CASCADE,
  `role_id` text NOT NULL REFERENCES `access_roles`(`id`) ON DELETE CASCADE,
  `assigned_at` text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (`customer_id`, `role_id`)
);

CREATE INDEX IF NOT EXISTS idx_customer_access_roles_customer
  ON customer_access_roles(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_access_roles_role
  ON customer_access_roles(role_id);
