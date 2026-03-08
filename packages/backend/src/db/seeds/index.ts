import { seedRoles } from './roles.seed.js';
import { seedUsers } from './users.seed.js';
import { seedCustomers } from './customers.seed.js';

/**
 * Seeds the database with development/test data.
 * Only runs when NODE_ENV=development and SEED_DB=true.
 * All operations use INSERT OR IGNORE — safe to run multiple times.
 */
export async function runSeeds() {
  console.info('[seed] Starting development data seed...');
  // Order matters: roles → users (references roles) → customers (references users)
  await seedRoles();
  await seedUsers();
  await seedCustomers();
  console.info('[seed] Done.');
}

// Allow running directly: tsx src/db/seeds/index.ts
if (process.argv[1]?.endsWith('seeds/index.ts') || process.argv[1]?.endsWith('seeds/index.js')) {
  import('../../config.js').then(({ config }) => {
    import('../connection.js').then(({ initDb }) => {
      import('../migrate.js').then(({ runMigrations }) => {
        import('../../utils/crypto.js').then(({ initEncryption }) => {
          initDb(config.DATABASE_PATH);
          runMigrations();
          initEncryption(config.ENCRYPTION_KEY);
          runSeeds().catch(console.error);
        });
      });
    });
  });
}
