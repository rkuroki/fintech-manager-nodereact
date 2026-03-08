import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  alias: text('alias').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  mobileNumber: text('mobile_number'),
  identityId: text('identity_id'), // CPF — not encrypted, used for lookup
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  deletedAt: text('deleted_at'),
});

export const userGroups = sqliteTable('user_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  mnemonic: text('mnemonic').unique(),
  description: text('description'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  deletedAt: text('deleted_at'),
});

export const userGroupMembers = sqliteTable('user_group_members', {
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  groupId: text('group_id')
    .notNull()
    .references(() => userGroups.id, { onDelete: 'cascade' }),
  addedAt: text('added_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const accessRoles = sqliteTable('access_roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  permissions: text('permissions').notNull().default('[]'), // JSON array
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const userAccessRoles = sqliteTable('user_access_roles', {
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  roleId: text('role_id')
    .notNull()
    .references(() => accessRoles.id, { onDelete: 'cascade' }),
  assignedAt: text('assigned_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const groupAccessRoles = sqliteTable('group_access_roles', {
  groupId: text('group_id')
    .notNull()
    .references(() => userGroups.id, { onDelete: 'cascade' }),
  roleId: text('role_id')
    .notNull()
    .references(() => accessRoles.id, { onDelete: 'cascade' }),
  assignedAt: text('assigned_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});
