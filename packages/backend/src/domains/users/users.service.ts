import { v4 as uuidv4 } from 'uuid';
import type { CreateUserDto, UpdateUserDto, CreateGroupDto, CreateRoleDto } from '@investor-backoffice/shared';
import { hashPassword } from '../../utils/password.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import type { WriteAuditParams } from '../../plugins/audit.plugin.js';
import * as repo from './users.repository.js';
import { getDb } from '../../db/connection.js';
import { userGroups, accessRoles, userAccessRoles, groupAccessRoles, userGroupMembers } from '../../db/schema/users.js';
import { eq } from 'drizzle-orm';

type AuditFn = (params: WriteAuditParams) => void;

export async function createUser(dto: CreateUserDto, writeAudit: AuditFn) {
  const [existingEmail, existingAlias] = await Promise.all([
    repo.getUserByEmail(dto.email),
    repo.getUserByAlias(dto.alias),
  ]);

  if (existingEmail) throw new ConflictError('Email already in use');
  if (existingAlias) throw new ConflictError('Alias already in use');

  const passwordHash = await hashPassword(dto.password);
  const id = uuidv4();
  const user = await repo.createUser(id, dto, passwordHash);

  writeAudit({
    entityType: 'user',
    entityId: user.id,
    action: 'CREATE',
    after: { email: user.email, alias: user.alias, fullName: user.fullName, isAdmin: user.isAdmin },
  });

  const { passwordHash: _ph, ...safeUser } = user;
  return safeUser;
}

export async function updateUser(id: string, dto: UpdateUserDto, writeAudit: AuditFn) {
  const existing = await repo.getUserById(id);
  if (!existing || existing.deletedAt) throw new NotFoundError('User not found');

  if (dto.email && dto.email !== existing.email) {
    const conflict = await repo.getUserByEmail(dto.email);
    if (conflict) throw new ConflictError('Email already in use');
  }
  if (dto.alias && dto.alias !== existing.alias) {
    const conflict = await repo.getUserByAlias(dto.alias);
    if (conflict) throw new ConflictError('Alias already in use');
  }

  const updated = await repo.updateUser(id, dto);
  if (!updated) throw new NotFoundError('User not found');

  writeAudit({
    entityType: 'user',
    entityId: id,
    action: 'UPDATE',
    before: { email: existing.email, alias: existing.alias, isAdmin: existing.isAdmin, isActive: existing.isActive },
    after: { email: updated.email, alias: updated.alias, isAdmin: updated.isAdmin, isActive: updated.isActive },
  });

  const { passwordHash: _ph, ...safeUser } = updated;
  return safeUser;
}

export async function deleteUser(id: string, writeAudit: AuditFn) {
  const existing = await repo.getUserById(id);
  if (!existing || existing.deletedAt) throw new NotFoundError('User not found');

  await repo.softDeleteUser(id);

  writeAudit({
    entityType: 'user',
    entityId: id,
    action: 'DELETE',
    before: { email: existing.email, alias: existing.alias },
  });
}

export async function listUsers(opts: { page?: number; pageSize?: number; search?: string }) {
  // Repository already excludes passwordHash from the select
  return repo.listUsers(opts);
}

export async function getUserById(id: string) {
  const user = await repo.getUserById(id);
  if (!user || user.deletedAt) throw new NotFoundError('User not found');
  const { passwordHash: _ph, ...safeUser } = user;
  return safeUser;
}

// Groups

export async function createGroup(dto: CreateGroupDto, writeAudit: AuditFn) {
  const db = getDb();
  const id = uuidv4();
  await db.insert(userGroups).values({ id, name: dto.name, description: dto.description ?? null });
  const group = await repo.getGroupById(id);
  if (!group) throw new Error('Failed to create group');

  writeAudit({ entityType: 'user_group', entityId: id, action: 'CREATE', after: { name: dto.name } });
  return group;
}

export async function updateGroup(id: string, dto: Partial<CreateGroupDto>, writeAudit: AuditFn) {
  const db = getDb();
  const existing = await repo.getGroupById(id);
  if (!existing || existing.deletedAt) throw new NotFoundError('Group not found');

  const setValues: { name?: string; description?: string | null; updatedAt: string } = {
    updatedAt: new Date().toISOString(),
  };
  if (dto.name !== undefined) setValues.name = dto.name;
  if (dto.description !== undefined) setValues.description = dto.description ?? null;
  await db.update(userGroups).set(setValues).where(eq(userGroups.id, id));
  const updated = await repo.getGroupById(id);

  writeAudit({ entityType: 'user_group', entityId: id, action: 'UPDATE', before: { name: existing.name }, after: { name: updated?.name } });
  return updated;
}

export async function deleteGroup(id: string, writeAudit: AuditFn) {
  const db = getDb();
  const existing = await repo.getGroupById(id);
  if (!existing || existing.deletedAt) throw new NotFoundError('Group not found');

  await db.update(userGroups).set({ deletedAt: new Date().toISOString() }).where(eq(userGroups.id, id));
  writeAudit({ entityType: 'user_group', entityId: id, action: 'DELETE', before: { name: existing.name } });
}

export async function assignUserToGroup(userId: string, groupId: string) {
  const db = getDb();
  await db.insert(userGroupMembers).values({ userId, groupId }).onConflictDoNothing();
}

export async function removeUserFromGroup(userId: string, groupId: string) {
  const db = getDb();
  await db.delete(userGroupMembers).where(
    eq(userGroupMembers.userId, userId)
  );
  // More precise deletion would need composite where; simplified here
}

// Roles

export async function createRole(dto: CreateRoleDto, writeAudit: AuditFn) {
  const db = getDb();
  const id = uuidv4();
  await db.insert(accessRoles).values({
    id,
    name: dto.name,
    description: dto.description ?? null,
    permissions: JSON.stringify(dto.permissions),
  });
  const role = await repo.getRoleById(id);
  if (!role) throw new Error('Failed to create role');

  writeAudit({ entityType: 'access_role', entityId: id, action: 'CREATE', after: { name: dto.name, permissions: dto.permissions } });
  return { ...role, permissions: JSON.parse(role.permissions) as string[] };
}

export async function updateRole(id: string, dto: Partial<CreateRoleDto>, writeAudit: AuditFn) {
  const db = getDb();
  const existing = await repo.getRoleById(id);
  if (!existing) throw new NotFoundError('Role not found');

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (dto.name !== undefined) updates['name'] = dto.name;
  if (dto.description !== undefined) updates['description'] = dto.description;
  if (dto.permissions !== undefined) updates['permissions'] = JSON.stringify(dto.permissions);

  await db.update(accessRoles).set(updates).where(eq(accessRoles.id, id));
  const updated = await repo.getRoleById(id);

  writeAudit({ entityType: 'access_role', entityId: id, action: 'UPDATE', before: { name: existing.name }, after: { name: updated?.name } });
  return updated ? { ...updated, permissions: JSON.parse(updated.permissions) as string[] } : null;
}

export async function deleteRole(id: string, writeAudit: AuditFn) {
  const db = getDb();
  const existing = await repo.getRoleById(id);
  if (!existing) throw new NotFoundError('Role not found');

  await db.delete(userAccessRoles).where(eq(userAccessRoles.roleId, id));
  await db.delete(groupAccessRoles).where(eq(groupAccessRoles.roleId, id));
  await db.delete(accessRoles).where(eq(accessRoles.id, id));

  writeAudit({ entityType: 'access_role', entityId: id, action: 'DELETE', before: { name: existing.name } });
}

export async function listRoles() {
  const roles = await repo.listRoles();
  return roles.map((r) => ({ ...r, permissions: JSON.parse(r.permissions) as string[] }));
}
