import type { FastifyInstance } from 'fastify';
import { PERMISSIONS } from '@investor-backoffice/shared';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../../db/connection.js';
import { auditLog, activityLog } from '../../db/schema/audit.js';
import { parsePagination } from '../../utils/pagination.js';

export async function auditRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/audit', {
    preHandler: fastify.requirePermission(PERMISSIONS.AUDIT_READ),
    schema: {
      tags: ['Audit'],
      querystring: {
        type: 'object',
        properties: {
          entityType: { type: 'string' },
          entityId: { type: 'string' },
          actionBy: { type: 'string' },
          page: { type: 'integer', minimum: 1, default: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
    handler: async (request) => {
      const db = getDb();
      const q = request.query as Record<string, string>;
      const { limit, offset, page, pageSize } = parsePagination({
        page: Number(q['page']),
        pageSize: Number(q['pageSize']),
      });

      let query = db.select().from(auditLog).orderBy(desc(auditLog.actionAt));

      if (q['entityType']) {
        query = query.where(eq(auditLog.entityType, q['entityType'])) as typeof query;
      }

      const data = await query.limit(limit).offset(offset);
      return { data, page, pageSize };
    },
  });

  fastify.get('/activity', {
    preHandler: fastify.requirePermission(PERMISSIONS.ACTIVITY_READ),
    schema: { tags: ['Activity'] },
    handler: async (request) => {
      const db = getDb();
      const q = request.query as Record<string, string>;
      const { limit, offset, page, pageSize } = parsePagination({
        page: Number(q['page']),
        pageSize: Number(q['pageSize']),
      });

      const data = await db
        .select()
        .from(activityLog)
        .orderBy(desc(activityLog.occurredAt))
        .limit(limit)
        .offset(offset);

      return { data, page, pageSize };
    },
  });
}
