import type { UUID, ISODateString } from './common.types.js';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'READ_SENSITIVE';

export type AuditEntityType =
  | 'user'
  | 'user_group'
  | 'access_role'
  | 'customer'
  | 'investor_profile'
  | 'customer_document'
  | 'communication_record';

export interface AuditLogEntry {
  id: UUID;
  entityType: AuditEntityType;
  entityId: UUID;
  action: AuditAction;
  actionBy: UUID;
  actionAt: ISODateString;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface ActivityLogEntry {
  id: UUID;
  userId: UUID;
  action: string;
  metadata: Record<string, unknown> | null;
  occurredAt: ISODateString;
}
