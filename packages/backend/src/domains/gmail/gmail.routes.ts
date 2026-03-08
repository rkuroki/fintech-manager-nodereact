import type { FastifyInstance } from 'fastify';
import { PERMISSIONS } from '@investor-backoffice/shared';
import { isGmailConfigured } from '../../config.js';
import * as service from './gmail.service.js';

export async function gmailRoutes(fastify: FastifyInstance) {
  // ─── OAuth2 callback (public — Google redirects here) ──────────────────
  // Registered in its own encapsulated context so the auth hook doesn't apply
  await fastify.register(async (publicRoutes) => {
    publicRoutes.get('/callback', {
      schema: { tags: ['Gmail'] },
      handler: async (request, reply) => {
        const { code, state } = request.query as { code?: string; state?: string };
        if (!code || !state) {
          return reply.status(400).send({ error: 'Missing code or state parameter' });
        }
        await service.handleCallback(code, state);
        // Redirect to frontend with success indicator
        return reply.redirect('/?gmailConnected=true');
      },
    });
  });

  // ─── Authenticated routes ──────────────────────────────────────────────
  await fastify.register(async (protectedRoutes) => {
    protectedRoutes.addHook('onRequest', fastify.authenticate);

    // GET /api/gmail/status — user's Gmail connection status
    protectedRoutes.get('/status', {
      preHandler: fastify.requirePermission(PERMISSIONS.GMAIL_CONNECT),
      schema: { tags: ['Gmail'] },
      handler: async (request) => {
        if (!isGmailConfigured()) {
          // Still check DB for connection status even if not configured,
          // so frontend can show existing connections
          const status = await service.getConnectionStatus(request.user.id);
          return { ...status, configured: false };
        }
        const status = await service.getConnectionStatus(request.user.id);
        return { ...status, configured: true };
      },
    });

    // GET /api/gmail/auth — get Google OAuth2 consent URL
    protectedRoutes.get('/auth', {
      preHandler: fastify.requirePermission(PERMISSIONS.GMAIL_CONNECT),
      schema: { tags: ['Gmail'] },
      handler: async (request) => {
        const authUrl = service.getAuthUrl(request.user.id);
        return { authUrl };
      },
    });

    // DELETE /api/gmail/disconnect — revoke Gmail connection
    protectedRoutes.delete('/disconnect', {
      preHandler: fastify.requirePermission(PERMISSIONS.GMAIL_CONNECT),
      schema: { tags: ['Gmail'] },
      handler: async (request, reply) => {
        await service.disconnect(request.user.id);
        return reply.status(204).send();
      },
    });

    // POST /api/gmail/sync/:customerId — trigger email sync for a customer
    protectedRoutes.post('/sync/:customerId', {
      preHandler: fastify.requirePermission(PERMISSIONS.GMAIL_SYNC),
      schema: { tags: ['Gmail'] },
      handler: async (request) => {
        const { customerId } = request.params as { customerId: string };
        return service.syncEmails(request.user.id, customerId);
      },
    });

    // GET /api/gmail/timeline/:customerId — unified timeline (manual + Gmail)
    protectedRoutes.get('/timeline/:customerId', {
      preHandler: fastify.requirePermission(PERMISSIONS.COMMUNICATIONS_READ),
      schema: { tags: ['Gmail'] },
      handler: async (request) => {
        const { customerId } = request.params as { customerId: string };
        const q = request.query as Record<string, string | undefined>;
        return service.getTimeline(request.user.id, customerId, {
          page: Number(q['page'] ?? 1),
          pageSize: Number(q['pageSize'] ?? 20),
        });
      },
    });
  });
}
