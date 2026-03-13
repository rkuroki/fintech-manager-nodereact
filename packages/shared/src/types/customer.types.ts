import type { UUID, ISODateString, AuditFields } from './common.types.js';

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';
export type CommunicationChannel = 'email' | 'phone' | 'whatsapp' | 'meeting' | 'other';

export interface Customer extends AuditFields {
  id: UUID;
  mnemonic: string; // e.g. "SILVA001"
  fullName: string;
  email: string | null;
  phone: string | null;
  riskProfile: RiskProfile | null;
  investorNotes: string | null;
  createdBy: UUID;
}

/** Customer with sensitive fields decrypted (only returned for authorized users) */
export interface CustomerWithSensitive extends Customer {
  taxId: string | null;        // CPF/CNPJ
  dateOfBirth: string | null;
  address: string | null;
  bankDetails: string | null;
}

export interface InvestorProfile {
  id: UUID;
  customerId: UUID;
  notes: string | null;
  formResponses: Record<string, unknown> | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CustomerDocument {
  id: UUID;
  customerId: UUID;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: UUID;
  uploadedAt: ISODateString;
}

export interface CommunicationRecord {
  id: UUID;
  customerId: UUID;
  channel: CommunicationChannel;
  summary: string;
  occurredAt: ISODateString;
  recordedBy: UUID;
  createdAt: ISODateString;
}

export interface CustomerAccessRole {
  roleId: UUID;
  roleName: string;
  roleDescription: string | null;
  assignedAt: ISODateString;
}

export interface CustomerNote {
  id: UUID;
  customerId: UUID;
  content: string;
  noteDate: ISODateString;
  createdBy: UUID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
