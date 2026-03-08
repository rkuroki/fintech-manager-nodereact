import type { UUID, ISODateString, AuditFields } from './common.types.js';

export interface User extends AuditFields {
  id: UUID;
  email: string;
  alias: string;
  fullName: string;
  mobileNumber: string | null;
  identityId: string | null; // CPF
  isAdmin: boolean;
  isActive: boolean;
}

export interface UserWithGroups extends User {
  groups: string[];
  permissions: string[];
}

export interface CurrentUser {
  id: UUID;
  email: string;
  alias: string;
  fullName: string;
  isAdmin: boolean;
  permissions: string[];
}

export interface UserGroup extends AuditFields {
  id: UUID;
  name: string;
  description: string | null;
}

export interface AccessRole {
  id: UUID;
  name: string;
  description: string | null;
  permissions: string[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
