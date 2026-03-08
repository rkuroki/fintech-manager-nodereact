import { readFileSync, readdirSync } from 'fs';
import { getSqliteClient } from './connection.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Runs all pending SQL migrations from the migrations folder.
 * Uses better-sqlite3's exec() which supports multiple statements per file.
 * Called automatically on server startup before the app starts listening.
 */
export function runMigrations() {
  const sqlite = getSqliteClient();
  const migrationsFolder = join(__dirname, 'migrations');

  // Create a simple migrations tracking table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);

  // Find all .sql files sorted by name
  const files = readdirSync(migrationsFolder)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const applied = sqlite.prepare('SELECT 1 FROM __migrations WHERE filename = ?').get(file);

    if (!applied) {
      const sql = readFileSync(join(migrationsFolder, file), 'utf-8');
      sqlite.exec(sql);
      sqlite.prepare('INSERT INTO __migrations (filename) VALUES (?)').run(file);
      console.info(`[db] Applied migration: ${file}`);
    }
  }

  console.info('[db] Migrations applied successfully.');
}
