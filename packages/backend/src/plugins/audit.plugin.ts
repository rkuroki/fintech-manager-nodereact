import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuditAction, AuditEntityType } from '@investor-backoffice/shared';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection.js';
import { auditLog } from '../db/schema/audit.js';

export interface WriteAuditParams {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

type WriteAuditFn = (params: WriteAuditParams) => void;

declare module 'fastify' {
  interface FastifyRequest {
    writeAudit: WriteAuditFn;
  }
}

export const auditPlugin = fp(async (fastify: FastifyInstance) => {
  /**
   * Decorates each request with a writeAudit() function.
   * Called explicitly from the service layer — NOT automatic middleware.
   *
   * Why explicit? Auto-middleware cannot know:
   * - The `before_value` without a pre-fetch
   * - Which fields are sensitive (must be masked as [ENCRYPTED])
   * - Whether a mutation was meaningful vs a no-op
   *
   * Sensitive fields must NEVER appear in the audit log as plaintext.
   * Service layer is responsible for substituting [ENCRYPTED] markers.
   */
  fastify.decorateRequest('writeAudit', null);

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    request.writeAudit = (params: WriteAuditParams): void => {
      const db = getDb();
      db.insert(auditLog)
        .values({
          id: uuidv4(),
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          actionBy: (request as FastifyRequest & { user?: { id: string } }).user?.id ?? 'system',
          actionAt: new Date().toISOString(),
          beforeValue: params.before ? JSON.stringify(params.before) : null,
          afterValue: params.after ? JSON.stringify(params.after) : null,
          ipAddress: request.ip ?? null,
          userAgent: request.headers['user-agent'] ?? null,
        })
        .run();
    };
  });
});
