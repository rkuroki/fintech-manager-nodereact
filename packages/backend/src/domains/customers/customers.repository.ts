import { eq, and, isNull, like, or, sql, inArray, desc } from 'drizzle-orm';
import { getDb } from '../../db/connection.js';
import { customers, investorProfiles, customerDocuments, communicationHistory, customerAccessRoles, customerNotes } from '../../db/schema/customers.js';
import { accessRoles, groupAccessRoles, userGroupMembers } from '../../db/schema/users.js';
import { parsePagination } from '../../utils/pagination.js';

export type CustomerRow = typeof customers.$inferSelect;

export async function getCustomerById(id: string): Promise<CustomerRow | null> {
  const db = getDb();
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getCustomerByMnemonic(mnemonic: string): Promise<CustomerRow | null> {
  const db = getDb();
  const result = await db
    .select()
    .from(customers)
    .where(and(eq(customers.mnemonic, mnemonic), isNull(customers.deletedAt)))
    .limit(1);
  return result[0] ?? null;
}

export async function listCustomers(opts: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const db = getDb();
  const { limit, offset, page, pageSize } = parsePagination(opts);

  const where = and(
    isNull(customers.deletedAt),
    opts.search
      ? or(
          like(customers.fullName, `%${opts.search}%`),
          like(customers.mnemonic, `%${opts.search}%`),
          like(customers.email, `%${opts.search}%`),
        )
      : undefined,
  );

  const [data, totalResult] = await Promise.all([
    db
      .select({
        id: customers.id,
        mnemonic: customers.mnemonic,
        fullName: customers.fullName,
        email: customers.email,
        phone: customers.phone,
        riskProfile: customers.riskProfile,
        investorNotes: customers.investorNotes,
        createdBy: customers.createdBy,
        createdAt: customers.createdAt,
        updatedAt: customers.updatedAt,
        deletedAt: customers.deletedAt,
        // Include encrypted field presence flags (not the values)
        hasTaxId: sql<number>`CASE WHEN ${customers.taxIdEnc} IS NOT NULL THEN 1 ELSE 0 END`,
        hasDateOfBirth: sql<number>`CASE WHEN ${customers.dateOfBirthEnc} IS NOT NULL THEN 1 ELSE 0 END`,
        hasAddress: sql<number>`CASE WHEN ${customers.addressEnc} IS NOT NULL THEN 1 ELSE 0 END`,
        hasBankDetails: sql<number>`CASE WHEN ${customers.bankDetailsEnc} IS NOT NULL THEN 1 ELSE 0 END`,
      })
      .from(customers)
      .where(where)
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(customers).where(where),
  ]);

  return { data, total: Number(totalResult[0]?.count ?? 0), page, pageSize };
}

export async function countCustomersByMnemonicPrefix(prefix: string): Promise<number> {
  const db = getDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(like(customers.mnemonic, `${prefix}%`));
  return Number(result[0]?.count ?? 0);
}

export async function insertCustomer(values: typeof customers.$inferInsert): Promise<CustomerRow> {
  const db = getDb();
  await db.insert(customers).values(values);
  const created = await getCustomerById(values.id as string);
  if (!created) throw new Error('Failed to create customer');
  return created;
}

export async function updateCustomer(
  id: string,
  values: Partial<typeof customers.$inferInsert>,
): Promise<CustomerRow | null> {
  const db = getDb();
  await db
    .update(customers)
    .set({ ...values, updatedAt: new Date().toISOString() })
    .where(and(eq(customers.id, id), isNull(customers.deletedAt)));
  return getCustomerById(id);
}

export async function softDeleteCustomer(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(customers)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(customers.id, id));
}

// Investor Profiles

export async function getInvestorProfile(customerId: string) {
  const db = getDb();
  const result = await db
    .select()
    .from(investorProfiles)
    .where(eq(investorProfiles.customerId, customerId))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertInvestorProfile(customerId: string, profileId: string, values: Partial<typeof investorProfiles.$inferInsert>) {
  const db = getDb();
  const existing = await getInvestorProfile(customerId);
  if (existing) {
    await db
      .update(investorProfiles)
      .set({ ...values, updatedAt: new Date().toISOString() })
      .where(eq(investorProfiles.customerId, customerId));
  } else {
    await db.insert(investorProfiles).values({ id: profileId, customerId, ...values });
  }
  return getInvestorProfile(customerId);
}

// Documents

export async function listDocuments(customerId: string) {
  const db = getDb();
  return db
    .select()
    .from(customerDocuments)
    .where(eq(customerDocuments.customerId, customerId));
}

export async function getDocument(id: string) {
  const db = getDb();
  const result = await db.select().from(customerDocuments).where(eq(customerDocuments.id, id)).limit(1);
  return result[0] ?? null;
}

export async function insertDocument(values: typeof customerDocuments.$inferInsert) {
  const db = getDb();
  await db.insert(customerDocuments).values(values);
  return getDocument(values.id as string);
}

export async function deleteDocument(id: string) {
  const db = getDb();
  await db.delete(customerDocuments).where(eq(customerDocuments.id, id));
}

// Communications

export async function listCommunications(customerId: string, opts: { page?: number; pageSize?: number }) {
  const db = getDb();
  const { limit, offset, page, pageSize } = parsePagination(opts);
  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(communicationHistory)
      .where(eq(communicationHistory.customerId, customerId))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(communicationHistory).where(eq(communicationHistory.customerId, customerId)),
  ]);
  return { data, total: Number(totalResult[0]?.count ?? 0), page, pageSize };
}

export async function insertCommunication(values: typeof communicationHistory.$inferInsert) {
  const db = getDb();
  await db.insert(communicationHistory).values(values);
}

export async function getCommunicationById(id: string) {
  const db = getDb();
  const result = await db
    .select()
    .from(communicationHistory)
    .where(eq(communicationHistory.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function updateCommunication(id: string, values: Partial<typeof communicationHistory.$inferInsert>) {
  const db = getDb();
  await db.update(communicationHistory).set(values).where(eq(communicationHistory.id, id));
  return getCommunicationById(id);
}

export async function deleteCommunication(id: string) {
  const db = getDb();
  await db.delete(communicationHistory).where(eq(communicationHistory.id, id));
}

// Customer Access Roles

export async function getCustomerRoles(customerId: string) {
  const db = getDb();
  return db
    .select({
      roleId: accessRoles.id,
      roleName: accessRoles.name,
      roleDescription: accessRoles.description,
      assignedAt: customerAccessRoles.assignedAt,
    })
    .from(customerAccessRoles)
    .innerJoin(accessRoles, eq(customerAccessRoles.roleId, accessRoles.id))
    .where(eq(customerAccessRoles.customerId, customerId));
}

export async function setCustomerRoles(customerId: string, roleIds: string[]) {
  const db = getDb();
  // Delete all current assignments
  await db.delete(customerAccessRoles).where(eq(customerAccessRoles.customerId, customerId));
  // Insert new assignments
  if (roleIds.length > 0) {
    await db.insert(customerAccessRoles).values(
      roleIds.map((roleId) => ({ customerId, roleId }))
    );
  }
}

export async function addCustomerRoles(customerId: string, roleIds: string[]) {
  if (roleIds.length === 0) return;
  const db = getDb();
  await db
    .insert(customerAccessRoles)
    .values(roleIds.map((roleId) => ({ customerId, roleId })))
    .onConflictDoNothing();
}

// Customer Notes

export async function listNotes(customerId: string) {
  const db = getDb();
  return db
    .select()
    .from(customerNotes)
    .where(eq(customerNotes.customerId, customerId))
    .orderBy(desc(customerNotes.noteDate));
}

export async function getNoteById(id: string) {
  const db = getDb();
  const result = await db.select().from(customerNotes).where(eq(customerNotes.id, id)).limit(1);
  return result[0] ?? null;
}

export async function insertNote(values: typeof customerNotes.$inferInsert) {
  const db = getDb();
  await db.insert(customerNotes).values(values);
  return getNoteById(values.id as string);
}

export async function updateNote(id: string, values: Partial<typeof customerNotes.$inferInsert>) {
  const db = getDb();
  await db
    .update(customerNotes)
    .set({ ...values, updatedAt: new Date().toISOString() })
    .where(eq(customerNotes.id, id));
  return getNoteById(id);
}

export async function deleteNote(id: string) {
  const db = getDb();
  await db.delete(customerNotes).where(eq(customerNotes.id, id));
}

/** Get squad role IDs for a given user (via their group memberships) */
export async function getSquadRoleIdsForUser(userId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ roleId: groupAccessRoles.roleId })
    .from(userGroupMembers)
    .innerJoin(groupAccessRoles, eq(userGroupMembers.groupId, groupAccessRoles.groupId))
    .innerJoin(accessRoles, eq(groupAccessRoles.roleId, accessRoles.id))
    .where(
      and(
        eq(userGroupMembers.userId, userId),
        // Squad roles are named SQUAD-*
        sql`${accessRoles.name} LIKE 'SQUAD-%'`,
      )
    );
  return rows.map((r) => r.roleId);
}
