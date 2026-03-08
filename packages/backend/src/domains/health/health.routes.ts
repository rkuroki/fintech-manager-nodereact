import type { FastifyInstance } from 'fastify';
import { getSqliteClient } from '../../db/connection.js';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', {
    schema: {
      tags: ['System'],
      security: [], // No auth required
    },
    handler: async (_request, reply) => {
      // Verify DB is reachable
      try {
        getSqliteClient().prepare('SELECT 1').run();
        return reply.status(200).send({ status: 'ok', timestamp: new Date().toISOString() });
      } catch {
        return reply.status(503).send({ status: 'unhealthy', timestamp: new Date().toISOString() });
      }
    },
  });
}
