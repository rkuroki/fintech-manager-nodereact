import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { authPlugin } from './plugins/auth.plugin.js';
import { rbacPlugin } from './plugins/rbac.plugin.js';
import { auditPlugin } from './plugins/audit.plugin.js';
import { swaggerPlugin } from './plugins/swagger.plugin.js';
import { corsPlugin } from './plugins/cors.plugin.js';
import fastifyMultipart from '@fastify/multipart';
import { authRoutes } from './domains/auth/auth.routes.js';
import { usersRoutes } from './domains/users/users.routes.js';
import { customersRoutes } from './domains/customers/customers.routes.js';
import { auditRoutes } from './domains/audit/audit.routes.js';
import { healthRoutes } from './domains/health/health.routes.js';
import { gmailRoutes } from './domains/gmail/gmail.routes.js';
import { errorHandler } from './utils/errors.js';
import { config } from './config.js';

interface BuildAppOptions {
  /** Set to true in tests to suppress logging and use in-memory DB */
  testing?: boolean;
}

/**
 * Creates and fully configures the Fastify application.
 * Exported separately from server.ts so tests can import it without starting the server.
 */
export async function buildApp(opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const loggerConfig =
    config.NODE_ENV === 'development'
      ? { level: 'info' as const, transport: { target: 'pino-pretty', options: { colorize: true } } }
      : { level: 'info' as const };

  const app = Fastify({
    logger: opts.testing ? false : loggerConfig,
  });

  // ─── Plugins (order matters) ────────────────────────────────────────────

  // Swagger docs (non-production only)
  if (config.NODE_ENV !== 'production') {
    await app.register(swaggerPlugin);
  }

  // CORS (development only — in production, same origin)
  if (config.NODE_ENV === 'development') {
    await app.register(corsPlugin);
  }

  // Multipart (file uploads)
  await app.register(fastifyMultipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  // Auth + RBAC + Audit
  await app.register(authPlugin);
  await app.register(rbacPlugin);
  await app.register(auditPlugin);

  // ─── Routes ─────────────────────────────────────────────────────────────

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(usersRoutes, { prefix: '/api/users' });
  await app.register(customersRoutes, { prefix: '/api/customers' });
  await app.register(auditRoutes, { prefix: '/api' });
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(gmailRoutes, { prefix: '/api/gmail' });

  // ─── Production static file serving ─────────────────────────────────────

  if (config.NODE_ENV === 'production') {
    const { staticPlugin } = await import('./plugins/static.plugin.js');
    await app.register(staticPlugin);
  }

  // ─── Error handler ───────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.setErrorHandler(errorHandler as any);

  return app as FastifyInstance;
}
