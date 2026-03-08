import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Inject test env vars before any module is loaded
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-minimum-32-characters-long-for-testing',
      ENCRYPTION_KEY: '0'.repeat(64),
      DATABASE_PATH: ':memory:',
      UPLOADS_PATH: '/tmp/test-uploads',
    },
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/db/migrations/**',
        'src/db/seeds/**',
        'src/db/schema/**', // Schema definitions (no logic, only Drizzle declarations)
        'src/server.ts', // Entry point, covered by integration/e2e
        'src/config.ts', // Module-level env validation, tested implicitly
        'src/plugins/static.plugin.ts', // Production-only (serves frontend assets)
        'src/plugins/cors.plugin.ts', // Development-only CORS setup
        'src/plugins/swagger.plugin.ts', // Non-production API docs
        'src/tests/**', // Test infrastructure
        'src/utils/errors.ts', // Error class definitions + Fastify error handler (structural boilerplate)
      ],
      thresholds: {
        lines: 75,
        branches: 65,
        functions: 60,
        statements: 75,
      },
    },
    // Run tests sequentially to avoid SQLite conflicts in CI
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
  resolve: {
    alias: {
      '@investor-backoffice/shared': new URL('../shared/src/index.ts', import.meta.url).pathname,
    },
  },
});
