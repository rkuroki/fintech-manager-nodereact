import { getDb } from '../connection.js';
import { users, userAccessRoles } from '../schema/users.js';
import { hashPassword } from '../../utils/password.js';
import { SEED_ROLE_IDS } from './roles.seed.js';

// Fixed UUIDs so tests can reference known IDs without additional queries
export const SEED_USER_IDS = {
  admin: '01900000-0000-7000-8000-000000000001',
  manager: '01900000-0000-7000-8000-000000000002',
  analyst: '01900000-0000-7000-8000-000000000003',
} as const;

export async function seedUsers() {
  const db = getDb();

  const [adminHash, managerHash, analystHash] = await Promise.all([
    hashPassword('Admin123!'),
    hashPassword('Manager123!'),
    hashPassword('Analyst123!'),
  ]);

  db.insert(users)
    .values([
      {
        id: SEED_USER_IDS.admin,
        email: 'admin@example.com',
        alias: 'admin',
        passwordHash: adminHash,
        fullName: 'System Administrator',
        isAdmin: true,
        isActive: true,
      },
      {
        id: SEED_USER_IDS.manager,
        email: 'manager@example.com',
        alias: 'manager',
        passwordHash: managerHash,
        fullName: 'John Manager',
        isAdmin: false,
        isActive: true,
      },
      {
        id: SEED_USER_IDS.analyst,
        email: 'analyst@example.com',
        alias: 'analyst',
        passwordHash: analystHash,
        fullName: 'Jane Analyst',
        isAdmin: false,
        isActive: true,
      },
    ])
    .onConflictDoNothing()
    .run();

  // Assign roles to non-admin users
  db.insert(userAccessRoles)
    .values([
      { userId: SEED_USER_IDS.manager, roleId: SEED_ROLE_IDS.manager },
      { userId: SEED_USER_IDS.analyst, roleId: SEED_ROLE_IDS.analyst },
    ])
    .onConflictDoNothing()
    .run();

  console.info('[seed] Users seeded.');
  console.info('  admin@example.com   / Admin123!   (admin)');
  console.info('  manager@example.com / Manager123! (manager role)');
  console.info('  analyst@example.com / Analyst123! (analyst role)');
}
