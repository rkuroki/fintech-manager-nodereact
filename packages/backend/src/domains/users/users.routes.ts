import type { FastifyInstance } from 'fastify';
import { PERMISSIONS } from '@investor-backoffice/shared';
import * as service from './users.service.js';
import * as repo from './users.repository.js';

export async function usersRoutes(fastify: FastifyInstance) {
  // All user routes require authentication
  fastify.addHook('onRequest', fastify.authenticate);

  // ─── Users ────────────────────────────────────────────────────────────────

  fastify.get('/', {
    preHandler: fastify.requireAdmin(),
    schema: {
      tags: ['Users'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
        },
      },
    },
    handler: async (request) => {
      const q = request.query as Record<string, string | undefined>;
      const opts: { page: number; pageSize: number; search?: string } = {
        page: Number(q['page']),
        pageSize: Number(q['pageSize']),
      };
      if (q['search']) opts.search = q['search'];
      return service.listUsers(opts);
    },
  });

  fastify.get('/:id', {
    preHandler: fastify.requireAdmin(),
    schema: { tags: ['Users'] },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      return service.getUserById(id);
    },
  });

  fastify.post('/', {
    preHandler: fastify.requireAdmin(),
    schema: { tags: ['Users'] },
    handler: async (request, reply) => {
      const user = await service.createUser(request.body as never, request.writeAudit);
      return reply.status(201).send(user);
    },
  });

  fastify.put('/:id', {
    preHandler: fastify.requireAdmin(),
    schema: { tags: ['Users'] },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      return service.updateUser(id, request.body as never, request.writeAudit);
    },
  });

  fastify.delete('/:id', {
    preHandler: fastify.requireAdmin(),
    schema: { tags: ['Users'] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      // Prevent self-deletion
      if (request.user.id === id) {
        return reply.status(400).send({ error: 'Cannot delete your own account', statusCode: 400 });
      }
      await service.deleteUser(id, request.writeAudit);
      return reply.status(204).send();
    },
  });

  // ─── Groups ───────────────────────────────────────────────────────────────

  fastify.get('/groups', {
    preHandler: fastify.requirePermission(PERMISSIONS.GROUPS_READ),
    schema: { tags: ['Groups'] },
    handler: async (request) => {
      const q = request.query as Record<string, string | undefined>;
      const opts: { page: number; pageSize: number; search?: string } = {
        page: Number(q['page']),
        pageSize: Number(q['pageSize']),
      };
      if (q['search']) opts.search = q['search'];
      return repo.listGroups(opts);
    },
  });

  fastify.post('/groups', {
    preHandler: fastify.requireAdmin(),
    schema: { tags: ['Groups'] },
    handler: async (request, reply) => {
      const group = await service.createGroup(request.body as never, request.writeAudit);
      return reply.status(201).send(group);
    },
  });

  fastify.put('/groups/:id', {
    preHandler: fastify.requireAdmin(),
    schema: { tags: ['Groups'] },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      return service.updateGroup(id, request.body as never, request.writeAudit);
    },
  });

  fastify.delete('/groups/:id', {
    preHandler: fastify.requireAdmin(),
    schema: { tags: ['Groups'] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      await service.deleteGroup(id, request.writeAudit);
      return reply.status(204).send();
    },
  });

  fastify.post('/groups/:groupId/members/:userId', {
    preHandler: fastify.requireAdmin(),
    schema: { tags: ['Groups'] },
    handler: async (request, reply) => {
      const { groupId, userId } = request.params as { groupId: string; userId: string };
      await service.assignUserToGroup(userId, groupId);
      return reply.status(204).send();
    },
  });

  fastify.delete('/groups/:groupId/members/:userId', {
    preHandler: fastify.requireAdmin(),
    schema: { tags: ['Groups'] },
    handler: async (request, reply) => {
      const { groupId, userId } = request.params as { groupId: string; userId: string };
      await service.removeUserFromGroup(userId, groupId);
      return reply.status(204).send();
    },
  });

  // ─── Roles ────────────────────────────────────────────────────────────────

  fastify.get('/roles', {
    preHandler: fastify.requirePermission(PERMISSIONS.ROLES_READ),
    schema: { tags: ['Roles'] },
    handler: async () => service.listRoles(),
  });

  fastify.post('/roles', {
    preHandler: fastify.requireAdmin(),
    schema: { tags: ['Roles'] },
    handler: async (request, reply) => {
      const role = await service.createRole(request.body as never, request.writeAudit);
      return reply.status(201).send(role);
    },
  });

  fastify.put('/roles/:id', {
    preHandler: fastify.requireAdmin(),
    schema: { tags: ['Roles'] },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      return service.updateRole(id, request.body as never, request.writeAudit);
    },
  });

  fastify.delete('/roles/:id', {
    preHandler: fastify.requireAdmin(),
    schema: { tags: ['Roles'] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      await service.deleteRole(id, request.writeAudit);
      return reply.status(204).send();
    },
  });
}
