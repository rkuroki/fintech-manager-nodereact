import { getDb } from '../connection.js';
import { accessRoles } from '../schema/users.js';
import {
  MANAGER_PERMISSIONS,
  DEFAULT_USER_PERMISSIONS,
  ADMIN_PERMISSIONS,
} from '@investor-backoffice/shared';

export const SEED_ROLE_IDS = {
  admin: '01900000-0000-7000-8000-000000000010',
  manager: '01900000-0000-7000-8000-000000000011',
  analyst: '01900000-0000-7000-8000-000000000012',
} as const;

export async function seedRoles() {
  const db = getDb();

  // Use INSERT OR IGNORE to be idempotent
  db.insert(accessRoles)
    .values([
      {
        id: SEED_ROLE_IDS.admin,
        name: 'Admin',
        description: 'Full system access',
        permissions: JSON.stringify(ADMIN_PERMISSIONS),
      },
      {
        id: SEED_ROLE_IDS.manager,
        name: 'Manager',
        description: 'Customer management including sensitive data',
        permissions: JSON.stringify(MANAGER_PERMISSIONS),
      },
      {
        id: SEED_ROLE_IDS.analyst,
        name: 'Analyst',
        description: 'Read-only customer access',
        permissions: JSON.stringify(DEFAULT_USER_PERMISSIONS),
      },
    ])
    .onConflictDoNothing()
    .run();

  console.info('[seed] Roles seeded.');
}
