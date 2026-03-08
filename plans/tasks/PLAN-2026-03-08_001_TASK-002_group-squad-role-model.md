# TASK-002: User Group ↔ Squad Role Model

## Current State
- `user_groups` table: `id, name, description, created_at, updated_at, deleted_at`
- `group_access_roles` junction: `group_id → role_id`
- `access_roles` table: `id, name, description, permissions`
- No concept of "mnemonic" on groups or "squad role" convention
- No customer-role relationship

## Requirements
1. A **manager** must be associated with an access group related to their team
2. An access group must have a **squad role** named `SQUAD-{GROUP_MNEMONIC}`
3. An access group may have additional roles beyond its squad role
4. Every **analyst** must have an associated access group
5. A **customer** must be associated with one or more roles
6. When created, a customer auto-inherits the **squad role** of the creating analyst's group

## Database Changes

### Migration `0002_groups_customers_roles.sql`

```sql
-- Add mnemonic column to user_groups
ALTER TABLE user_groups ADD COLUMN mnemonic TEXT UNIQUE;

-- Customer ↔ Role junction table
CREATE TABLE IF NOT EXISTS customer_access_roles (
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES access_roles(id) ON DELETE CASCADE,
  assigned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (customer_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_access_roles_customer
  ON customer_access_roles(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_access_roles_role
  ON customer_access_roles(role_id);
```

### Drizzle Schema Updates

**`packages/backend/src/db/schema/users.ts`**:
```typescript
// Add to userGroups table definition
mnemonic: text('mnemonic').unique(),
```

**`packages/backend/src/db/schema/customers.ts`** — add new table:
```typescript
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
```

## Backend Business Rules

### Group Creation
When creating an access group:
1. `mnemonic` is **required** (3-12 chars, uppercase alphanumeric)
2. Auto-create an `access_roles` record: `name = "SQUAD-{mnemonic}"`, permissions = default analyst permissions
3. Auto-link the squad role to the group via `group_access_roles`

### Group Update
- Changing the mnemonic renames the squad role: `SQUAD-{OLD}` → `SQUAD-{NEW}`

### Manager/Analyst Validation
- On user creation/update: if user has Manager or Analyst role, validate they belong to at least one access group
- Backend returns 400 if validation fails

### Customer Creation (auto-assign squad role)
1. Create the customer record (existing logic)
2. Look up the creating user's group(s) via `user_group_members`
3. For each group, find its squad role (`SQUAD-{group.mnemonic}`) via `group_access_roles`
4. Insert into `customer_access_roles` for each squad role found
5. Edge case: admin users with no group → customer created without auto-assigned roles

## Shared Types Updates

**`packages/shared/src/types/user.types.ts`**:
```typescript
interface UserGroup extends AuditFields {
  id: UUID;
  name: string;
  mnemonic: string | null;  // NEW
  description: string | null;
}
```

**`packages/shared/src/types/customer.types.ts`**:
```typescript
// NEW
interface CustomerAccessRole {
  roleId: UUID;
  roleName: string;
  assignedAt: ISODateString;
}
```

**`packages/shared/src/schemas/user.schema.ts`**:
```typescript
// Update CreateGroupSchema
CreateGroupSchema = z.object({
  name: z.string().min(2).max(100),
  mnemonic: z.string().min(3).max(12).regex(/^[A-Z0-9]+$/),  // NEW
  description: z.string().max(500).optional(),
});
```

## Seed Data Updates

**`roles.seed.ts`**: Add `SQUAD-ALPHA` role with analyst permissions

**`users.seed.ts`**:
- Create group `"Alpha Team"` with mnemonic `"ALPHA"`
- Assign manager and analyst to the Alpha group
- Link `SQUAD-ALPHA` role to the Alpha group via `group_access_roles`

**`customers.seed.ts`**:
- Assign existing customers to `SQUAD-ALPHA` role via `customer_access_roles`

## Files to Change
| File | Action |
|---|---|
| `packages/backend/src/db/migrations/0002_groups_customers_roles.sql` | Create |
| `packages/backend/src/db/schema/users.ts` | Add mnemonic to userGroups |
| `packages/backend/src/db/schema/customers.ts` | Add customerAccessRoles table |
| `packages/backend/src/domains/users/users.service.ts` | Group CRUD + squad role logic |
| `packages/backend/src/domains/users/users.repository.ts` | Group queries |
| `packages/backend/src/domains/customers/customers.service.ts` | Auto-assign squad role on create |
| `packages/backend/src/domains/customers/customers.repository.ts` | customer_access_roles queries |
| `packages/shared/src/types/user.types.ts` | Add mnemonic to UserGroup |
| `packages/shared/src/types/customer.types.ts` | Add CustomerAccessRole type |
| `packages/shared/src/schemas/user.schema.ts` | Add mnemonic to CreateGroupSchema |
| `packages/backend/src/db/seeds/roles.seed.ts` | Add SQUAD-ALPHA |
| `packages/backend/src/db/seeds/users.seed.ts` | Create group, assign members |
| `packages/backend/src/db/seeds/customers.seed.ts` | Assign customer roles |

## Verification
1. Create a group → squad role auto-created and linked
2. Create analyst in group → create customer → customer has squad role
3. Manager without group → 400 error on save
4. Analyst without group → 400 error on save
