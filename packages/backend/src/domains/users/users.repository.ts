import { eq, and, isNull, like, or, sql } from 'drizzle-orm';
import { getDb } from '../../db/connection.js';
import {
  users,
  userGroups,
  userGroupMembers,
  accessRoles,
  userAccessRoles,
  groupAccessRoles,
} from '../../db/schema/users.js';
import { ADMIN_PERMISSIONS } from '@investor-backoffice/shared';
import type { CreateUserDto, UpdateUserDto } from '@investor-backoffice/shared';
import { parsePagination } from '../../utils/pagination.js';

export type UserRow = typeof users.$inferSelect;

export async function getUserById(id: string): Promise<UserRow | null> {
  const db = getDb();
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  const db = getDb();
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);
  return result[0] ?? null;
}

export async function getUserByAlias(alias: string): Promise<UserRow | null> {
  const db = getDb();
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.alias, alias), isNull(users.deletedAt)))
    .limit(1);
  return result[0] ?? null;
}

export async function listUsers(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const db = getDb();
  const { limit, offset, page, pageSize } = parsePagination(opts);

  const where = and(
    isNull(users.deletedAt),
    opts.search
      ? or(
          like(users.fullName, `%${opts.search}%`),
          like(users.email, `%${opts.search}%`),
          like(users.alias, `%${opts.search}%`),
        )
      : undefined,
  );

  const [data, totalResult] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        alias: users.alias,
        fullName: users.fullName,
        mobileNumber: users.mobileNumber,
        identityId: users.identityId,
        isAdmin: users.isAdmin,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(where)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(users).where(where),
  ]);

  return { data, total: Number(totalResult[0]?.count ?? 0), page, pageSize };
}

export async function createUser(
  id: string,
  dto: CreateUserDto,
  passwordHash: string,
): Promise<UserRow> {
  const db = getDb();
  await db.insert(users).values({
    id,
    email: dto.email,
    alias: dto.alias,
    passwordHash,
    fullName: dto.fullName,
    mobileNumber: dto.mobileNumber ?? null,
    identityId: dto.identityId ?? null,
    isAdmin: dto.isAdmin ?? false,
  });
  const created = await getUserById(id);
  if (!created) throw new Error('Failed to create user');
  return created;
}

export async function updateUser(id: string, dto: UpdateUserDto): Promise<UserRow | null> {
  const db = getDb();
  const now = new Date().toISOString();
  await db
    .update(users)
    .set({
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.alias !== undefined && { alias: dto.alias }),
      ...(dto.fullName !== undefined && { fullName: dto.fullName }),
      ...(dto.mobileNumber !== undefined && { mobileNumber: dto.mobileNumber }),
      ...(dto.identityId !== undefined && { identityId: dto.identityId }),
      ...(dto.isAdmin !== undefined && { isAdmin: dto.isAdmin }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      updatedAt: now,
    })
    .where(and(eq(users.id, id), isNull(users.deletedAt)));
  return getUserById(id);
}

export async function softDeleteUser(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({ deletedAt: new Date().toISOString(), isActive: false })
    .where(eq(users.id, id));
}

/**
 * Resolves all permissions for a user.
 * Admin users receive all permissions (bypass check).
 * Otherwise: union of direct role permissions + group role permissions.
 */
export async function getUserPermissions(userId: string, isAdmin: boolean): Promise<string[]> {
  if (isAdmin) {
    return ADMIN_PERMISSIONS;
  }

  const db = getDb();

  // Direct role permissions
  const directRoles = await db
    .select({ permissions: accessRoles.permissions })
    .from(userAccessRoles)
    .innerJoin(accessRoles, eq(userAccessRoles.roleId, accessRoles.id))
    .where(eq(userAccessRoles.userId, userId));

  // Group role permissions
  const groupRoles = await db
    .select({ permissions: accessRoles.permissions })
    .from(userGroupMembers)
    .innerJoin(groupAccessRoles, eq(userGroupMembers.groupId, groupAccessRoles.groupId))
    .innerJoin(accessRoles, eq(groupAccessRoles.roleId, accessRoles.id))
    .where(eq(userGroupMembers.userId, userId));

  const all = [...directRoles, ...groupRoles];
  const permSet = new Set<string>();
  for (const row of all) {
    const perms: string[] = JSON.parse(row.permissions ?? '[]');
    for (const p of perms) permSet.add(p);
  }
  return Array.from(permSet);
}

// Groups

export type GroupRow = typeof userGroups.$inferSelect;

export async function getGroupById(id: string): Promise<GroupRow | null> {
  const db = getDb();
  const result = await db.select().from(userGroups).where(eq(userGroups.id, id)).limit(1);
  return result[0] ?? null;
}

export async function listGroups(opts: { page?: number; pageSize?: number; search?: string }) {
  const db = getDb();
  const { limit, offset, page, pageSize } = parsePagination(opts);
  const where = and(
    isNull(userGroups.deletedAt),
    opts.search ? like(userGroups.name, `%${opts.search}%`) : undefined,
  );
  const [data, totalResult] = await Promise.all([
    db.select().from(userGroups).where(where).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(userGroups).where(where),
  ]);
  return { data, total: Number(totalResult[0]?.count ?? 0), page, pageSize };
}

// Roles

export type RoleRow = typeof accessRoles.$inferSelect;

export async function getRoleById(id: string): Promise<RoleRow | null> {
  const db = getDb();
  const result = await db.select().from(accessRoles).where(eq(accessRoles.id, id)).limit(1);
  return result[0] ?? null;
}

export async function listRoles() {
  const db = getDb();
  return db.select().from(accessRoles);
}
