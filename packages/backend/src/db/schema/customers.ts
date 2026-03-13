import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users, accessRoles } from './users.js';

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  mnemonic: text('mnemonic').notNull().unique(), // e.g. "SILVA001"
  fullName: text('full_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  riskProfile: text('risk_profile'), // 'conservative'|'moderate'|'aggressive'
  investorNotes: text('investor_notes'),

  // Sensitive fields — stored as AES-256-GCM encrypted blobs (base64-encoded)
  // Format: base64(iv[12] + authTag[16] + ciphertext)
  // null = field was never set; non-null = encrypted value
  taxIdEnc: text('tax_id_enc'),
  dateOfBirthEnc: text('date_of_birth_enc'),
  addressEnc: text('address_enc'),
  bankDetailsEnc: text('bank_details_enc'),

  createdBy: text('created_by').references(() => users.id),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  deletedAt: text('deleted_at'),
});

export const investorProfiles = sqliteTable('investor_profiles', {
  id: text('id').primaryKey(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  notes: text('notes'),
  formResponses: text('form_responses'), // JSON
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const customerDocuments = sqliteTable('customer_documents', {
  id: text('id').primaryKey(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(), // storage filename (UUID-based)
  originalName: text('original_name').notNull(), // original uploaded filename
  mimeType: text('mime_type').notNull(),
  sizeBytes: text('size_bytes').notNull(), // stored as text for SQLite integer safety
  uploadedBy: text('uploaded_by')
    .notNull()
    .references(() => users.id),
  uploadedAt: text('uploaded_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const communicationHistory = sqliteTable('communication_history', {
  id: text('id').primaryKey(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull(), // 'email'|'phone'|'whatsapp'|'meeting'|'other'
  summary: text('summary').notNull(),
  occurredAt: text('occurred_at').notNull(),
  recordedBy: text('recorded_by')
    .notNull()
    .references(() => users.id),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const customerAccessRoles = sqliteTable('customer_access_roles', {
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  roleId: text('role_id')
    .notNull()
    .references(() => accessRoles.id, { onDelete: 'cascade' }),
  assignedAt: text('assigned_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});

export const customerNotes = sqliteTable('customer_notes', {
  id: text('id').primaryKey(),
  customerId: text('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  noteDate: text('note_date').notNull(),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
});
