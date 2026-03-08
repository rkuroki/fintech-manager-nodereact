import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema/index.js';

let _db: ReturnType<typeof drizzle> | null = null;
let _sqlite: Database.Database | null = null;

/**
 * Returns (or creates) the Drizzle database instance.
 * Call initDb() before using db in production.
 * In tests, call initDb(':memory:') for isolation.
 */
export function getDb() {
  if (!_db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return _db;
}

/** Returns the underlying better-sqlite3 Database instance for raw SQL operations */
export function getSqliteClient(): Database.Database {
  if (!_sqlite) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return _sqlite;
}

export function initDb(databasePath: string): ReturnType<typeof drizzle> {
  const sqlite = new Database(databasePath);

  // WAL mode for concurrent reads alongside writes
  sqlite.pragma('journal_mode = WAL');
  // Enforce foreign key constraints
  sqlite.pragma('foreign_keys = ON');
  // Avoid "database is locked" errors under brief write contention
  sqlite.pragma('busy_timeout = 5000');

  _sqlite = sqlite;
  _db = drizzle(sqlite, { schema, logger: process.env['NODE_ENV'] === 'development' });
  return _db;
}

export function resetDb() {
  _sqlite = null;
  _db = null;
}
