import 'dotenv/config';
import { initDb } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { initEncryption } from './utils/crypto.js';
import { config } from './config.js';
import { buildApp } from './app.js';
import { mkdirSync } from 'fs';

async function start() {
  // Ensure uploads directory exists
  mkdirSync(config.UPLOADS_PATH, { recursive: true });

  // Initialize SQLite database
  initDb(config.DATABASE_PATH);

  // Apply database migrations on startup
  runMigrations();

  // Initialize encryption key
  initEncryption(config.ENCRYPTION_KEY);

  // Seed development data if configured
  if (config.NODE_ENV === 'development' && config.SEED_DB) {
    const { runSeeds } = await import('./db/seeds/index.js');
    await runSeeds();
  }

  // Build and start the Fastify app
  const app = await buildApp();

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    console.info(`[server] Running at http://0.0.0.0:${config.PORT}`);
    if (config.NODE_ENV !== 'production') {
      console.info(`[server] API docs: http://0.0.0.0:${config.PORT}/docs`);
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
