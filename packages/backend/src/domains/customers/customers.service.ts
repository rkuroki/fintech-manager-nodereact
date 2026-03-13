import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, unlinkSync, existsSync, createReadStream } from 'fs';
import { join, extname } from 'path';
import type {
  CreateCustomerDto,
  UpdateCustomerDto,
  CreateCommunicationDto,
  UpdateCommunicationDto,
  UpdateInvestorProfileDto,
  CreateNoteDto,
  UpdateNoteDto,
} from '@investor-backoffice/shared';
import { NotFoundError } from '../../utils/errors.js';
import { encryptIfPresent, decryptIfPresent } from '../../utils/crypto.js';
import { generateMnemonic } from '../../utils/mnemonic.js';
import { config } from '../../config.js';
import type { WriteAuditParams } from '../../plugins/audit.plugin.js';
import * as repo from './customers.repository.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

type AuditFn = (params: WriteAuditParams) => void;

/** Strips encrypted columns and replaces with decrypted values if authorized */
function formatCustomerForResponse(
  row: Awaited<ReturnType<typeof repo.getCustomerById>>,
  canReadSensitive: boolean,
) {
  if (!row) return null;
  const { taxIdEnc, dateOfBirthEnc, addressEnc, bankDetailsEnc, ...base } = row;

  if (!canReadSensitive) {
    // Non-authorized users see no sensitive data
    return base;
  }

  return {
    ...base,
    taxId: decryptIfPresent(taxIdEnc),
    dateOfBirth: decryptIfPresent(dateOfBirthEnc),
    address: decryptIfPresent(addressEnc),
    bankDetails: decryptIfPresent(bankDetailsEnc),
  };
}

export async function createCustomer(
  dto: CreateCustomerDto,
  actorId: string,
  canWriteSensitive: boolean,
  writeAudit: AuditFn,
) {
  // Generate mnemonic if not provided
  let mnemonic = dto.mnemonic;
  if (!mnemonic) {
    const parts = dto.fullName.trim().toUpperCase().split(/\s+/);
    const surname = (parts[parts.length - 1] ?? 'CUST').replace(/[^A-Z]/g, '').substring(0, 6).padEnd(3, 'X');
    const count = await repo.countCustomersByMnemonicPrefix(surname);
    mnemonic = generateMnemonic(dto.fullName, count + 1);
  }

  const sensitive: Partial<typeof repo.insertCustomer extends (v: infer V) => unknown ? V : never> = {};
  if (canWriteSensitive) {
    Object.assign(sensitive, {
      taxIdEnc: encryptIfPresent(dto.taxId),
      dateOfBirthEnc: encryptIfPresent(dto.dateOfBirth),
      addressEnc: encryptIfPresent(dto.address),
      bankDetailsEnc: encryptIfPresent(dto.bankDetails),
    });
  }

  const id = uuidv4();
  const row = await repo.insertCustomer({
    id,
    mnemonic,
    fullName: dto.fullName,
    email: dto.email ?? null,
    phone: dto.phone ?? null,
    riskProfile: dto.riskProfile ?? null,
    investorNotes: dto.investorNotes ?? null,
    createdBy: actorId,
    ...sensitive,
  });

  // Auto-assign squad roles from the creating user's groups
  const squadRoleIds = await repo.getSquadRoleIdsForUser(actorId);
  if (squadRoleIds.length > 0) {
    await repo.addCustomerRoles(id, squadRoleIds);
  }

  writeAudit({
    entityType: 'customer',
    entityId: id,
    action: 'CREATE',
    after: {
      mnemonic,
      fullName: dto.fullName,
      email: dto.email,
      // Never log sensitive plaintext
      taxId: dto.taxId ? '[ENCRYPTED]' : undefined,
      dateOfBirth: dto.dateOfBirth ? '[ENCRYPTED]' : undefined,
      address: dto.address ? '[ENCRYPTED]' : undefined,
      bankDetails: dto.bankDetails ? '[ENCRYPTED]' : undefined,
    },
  });

  return formatCustomerForResponse(row, canWriteSensitive);
}

export async function getCustomer(id: string, canReadSensitive: boolean, writeAudit: AuditFn) {
  const row = await repo.getCustomerById(id);
  if (!row || row.deletedAt) throw new NotFoundError('Customer not found');

  if (canReadSensitive && (row.taxIdEnc || row.dateOfBirthEnc || row.addressEnc || row.bankDetailsEnc)) {
    writeAudit({ entityType: 'customer', entityId: id, action: 'READ_SENSITIVE' });
  }

  return formatCustomerForResponse(row, canReadSensitive);
}

export async function listCustomers(opts: { page?: number; pageSize?: number; search?: string }) {
  return repo.listCustomers(opts);
}

export async function updateCustomer(
  id: string,
  dto: UpdateCustomerDto,
  canWriteSensitive: boolean,
  writeAudit: AuditFn,
) {
  const existing = await repo.getCustomerById(id);
  if (!existing || existing.deletedAt) throw new NotFoundError('Customer not found');

  const updates: Record<string, unknown> = {};
  if (dto.fullName !== undefined) updates['fullName'] = dto.fullName;
  if (dto.email !== undefined) updates['email'] = dto.email;
  if (dto.phone !== undefined) updates['phone'] = dto.phone;
  if (dto.riskProfile !== undefined) updates['riskProfile'] = dto.riskProfile;
  if (dto.investorNotes !== undefined) updates['investorNotes'] = dto.investorNotes;

  if (canWriteSensitive) {
    if (dto.taxId !== undefined) updates['taxIdEnc'] = encryptIfPresent(dto.taxId);
    if (dto.dateOfBirth !== undefined) updates['dateOfBirthEnc'] = encryptIfPresent(dto.dateOfBirth);
    if (dto.address !== undefined) updates['addressEnc'] = encryptIfPresent(dto.address);
    if (dto.bankDetails !== undefined) updates['bankDetailsEnc'] = encryptIfPresent(dto.bankDetails);
  }

  const updated = await repo.updateCustomer(id, updates);

  writeAudit({
    entityType: 'customer',
    entityId: id,
    action: 'UPDATE',
    before: { fullName: existing.fullName, email: existing.email },
    after: {
      fullName: updated?.fullName,
      email: updated?.email,
      ...(dto.taxId !== undefined && { taxId: '[ENCRYPTED]' }),
    },
  });

  return formatCustomerForResponse(updated, canWriteSensitive);
}

export async function deleteCustomer(id: string, writeAudit: AuditFn) {
  const existing = await repo.getCustomerById(id);
  if (!existing || existing.deletedAt) throw new NotFoundError('Customer not found');

  await repo.softDeleteCustomer(id);
  writeAudit({
    entityType: 'customer',
    entityId: id,
    action: 'DELETE',
    before: { mnemonic: existing.mnemonic, fullName: existing.fullName },
  });
}

// Investor Profile

export async function getInvestorProfile(customerId: string) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');
  const profile = await repo.getInvestorProfile(customerId);
  return profile ? { ...profile, formResponses: profile.formResponses ? JSON.parse(profile.formResponses) : null } : null;
}

export async function updateInvestorProfile(
  customerId: string,
  dto: UpdateInvestorProfileDto,
  writeAudit: AuditFn,
) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');

  const profileId = uuidv4();
  const updated = await repo.upsertInvestorProfile(customerId, profileId, {
    notes: dto.notes ?? null,
    formResponses: dto.formResponses ? JSON.stringify(dto.formResponses) : null,
  });

  writeAudit({
    entityType: 'investor_profile',
    entityId: customerId,
    action: 'UPDATE',
  });

  return updated ? { ...updated, formResponses: updated.formResponses ? JSON.parse(updated.formResponses) : null } : null;
}

// Communications

export async function listCommunications(customerId: string, opts: { page?: number; pageSize?: number }) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');
  return repo.listCommunications(customerId, opts);
}

export async function createCommunication(
  customerId: string,
  dto: CreateCommunicationDto,
  actorId: string,
  writeAudit: AuditFn,
) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');

  const id = uuidv4();
  await repo.insertCommunication({
    id,
    customerId,
    channel: dto.channel,
    summary: dto.summary,
    occurredAt: dto.occurredAt,
    recordedBy: actorId,
  });

  writeAudit({
    entityType: 'communication_record',
    entityId: id,
    action: 'CREATE',
    after: { customerId, channel: dto.channel, occurredAt: dto.occurredAt },
  });

  return { id, customerId, ...dto, recordedBy: actorId };
}

// Documents

export async function listDocuments(customerId: string) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');
  return repo.listDocuments(customerId);
}

export async function uploadDocument(
  customerId: string,
  file: { filename: string; mimetype: string; data: Buffer },
  actorId: string,
  writeAudit: AuditFn,
) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw new Error(`File type ${file.mimetype} is not allowed`);
  }
  if (file.data.length > MAX_FILE_SIZE) {
    throw new Error('File exceeds maximum size of 10 MB');
  }

  const ext = extname(file.filename) || '';
  const storedName = `${uuidv4()}${ext}`;
  const storagePath = join(config.UPLOADS_PATH, customerId);
  const { mkdirSync } = await import('fs');
  mkdirSync(storagePath, { recursive: true });
  writeFileSync(join(storagePath, storedName), file.data);

  const id = uuidv4();
  const doc = await repo.insertDocument({
    id,
    customerId,
    filename: storedName,
    originalName: file.filename,
    mimeType: file.mimetype,
    sizeBytes: String(file.data.length),
    uploadedBy: actorId,
  });

  writeAudit({
    entityType: 'customer_document',
    entityId: id,
    action: 'CREATE',
    after: { customerId, originalName: file.filename, mimeType: file.mimetype },
  });

  return doc;
}

export async function removeDocument(
  customerId: string,
  documentId: string,
  writeAudit: AuditFn,
) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');

  const doc = await repo.getDocument(documentId);
  if (!doc || doc.customerId !== customerId) throw new NotFoundError('Document not found');

  const filePath = join(config.UPLOADS_PATH, customerId, doc.filename);
  if (existsSync(filePath)) unlinkSync(filePath);

  await repo.deleteDocument(documentId);

  writeAudit({
    entityType: 'customer_document',
    entityId: documentId,
    action: 'DELETE',
    before: { customerId, originalName: doc.originalName },
  });
}

export async function downloadDocument(customerId: string, documentId: string) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');

  const doc = await repo.getDocument(documentId);
  if (!doc || doc.customerId !== customerId) throw new NotFoundError('Document not found');

  const filePath = join(config.UPLOADS_PATH, customerId, doc.filename);
  if (!existsSync(filePath)) throw new NotFoundError('File not found on disk');

  return { doc, stream: createReadStream(filePath) };
}

// Communication update/delete

export async function updateCommunication(
  customerId: string,
  communicationId: string,
  dto: UpdateCommunicationDto,
  writeAudit: AuditFn,
) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');

  const existing = await repo.getCommunicationById(communicationId);
  if (!existing || existing.customerId !== customerId) throw new NotFoundError('Communication not found');

  const updates: Record<string, string> = {};
  if (dto.channel !== undefined) updates['channel'] = dto.channel;
  if (dto.summary !== undefined) updates['summary'] = dto.summary;
  if (dto.occurredAt !== undefined) updates['occurredAt'] = dto.occurredAt;

  const updated = await repo.updateCommunication(communicationId, updates);

  writeAudit({
    entityType: 'communication_record',
    entityId: communicationId,
    action: 'UPDATE',
    before: { channel: existing.channel, occurredAt: existing.occurredAt },
    after: { channel: updated?.channel, occurredAt: updated?.occurredAt },
  });

  return updated;
}

export async function deleteCommunication(
  customerId: string,
  communicationId: string,
  writeAudit: AuditFn,
) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');

  const existing = await repo.getCommunicationById(communicationId);
  if (!existing || existing.customerId !== customerId) throw new NotFoundError('Communication not found');

  await repo.deleteCommunication(communicationId);

  writeAudit({
    entityType: 'communication_record',
    entityId: communicationId,
    action: 'DELETE',
    before: { customerId, channel: existing.channel },
  });
}

// Customer Access Roles

export async function getCustomerRoles(customerId: string) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');
  return repo.getCustomerRoles(customerId);
}

export async function setCustomerRoles(
  customerId: string,
  roleIds: string[],
  writeAudit: AuditFn,
) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');

  const before = await repo.getCustomerRoles(customerId);
  await repo.setCustomerRoles(customerId, roleIds);

  writeAudit({
    entityType: 'customer',
    entityId: customerId,
    action: 'UPDATE',
    before: { accessRoles: before.map((r) => r.roleName) },
    after: { accessRoles: roleIds },
  });
}

// Customer Notes

export async function listNotes(customerId: string) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');
  return repo.listNotes(customerId);
}

export async function createNote(customerId: string, dto: CreateNoteDto, actorId: string, writeAudit: AuditFn) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');

  const id = uuidv4();
  const note = await repo.insertNote({ id, customerId, content: dto.content, noteDate: dto.noteDate, createdBy: actorId });

  writeAudit({ entityType: 'customer_note', entityId: id, action: 'CREATE', after: { customerId } });
  return note;
}

export async function updateNote(customerId: string, noteId: string, dto: UpdateNoteDto, writeAudit: AuditFn) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');

  const existing = await repo.getNoteById(noteId);
  if (!existing || existing.customerId !== customerId) throw new NotFoundError('Note not found');

  const updates: Record<string, string> = {};
  if (dto.content !== undefined) updates['content'] = dto.content;
  if (dto.noteDate !== undefined) updates['noteDate'] = dto.noteDate;

  const updated = await repo.updateNote(noteId, updates);
  writeAudit({ entityType: 'customer_note', entityId: noteId, action: 'UPDATE' });
  return updated;
}

export async function deleteNote(customerId: string, noteId: string, writeAudit: AuditFn) {
  const customer = await repo.getCustomerById(customerId);
  if (!customer || customer.deletedAt) throw new NotFoundError('Customer not found');

  const existing = await repo.getNoteById(noteId);
  if (!existing || existing.customerId !== customerId) throw new NotFoundError('Note not found');

  await repo.deleteNote(noteId);
  writeAudit({ entityType: 'customer_note', entityId: noteId, action: 'DELETE' });
}

// Get customer by mnemonic
export async function getCustomerByMnemonic(mnemonic: string, canReadSensitive: boolean, writeAudit: AuditFn) {
  const row = await repo.getCustomerByMnemonic(mnemonic);
  if (!row || row.deletedAt) throw new NotFoundError('Customer not found');

  if (canReadSensitive && (row.taxIdEnc || row.dateOfBirthEnc || row.addressEnc || row.bankDetailsEnc)) {
    writeAudit({ entityType: 'customer', entityId: row.id, action: 'READ_SENSITIVE' });
  }

  return formatCustomerForResponse(row, canReadSensitive);
}
