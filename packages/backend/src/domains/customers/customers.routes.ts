import type { FastifyInstance } from 'fastify';
import { PERMISSIONS } from '@investor-backoffice/shared';
import * as service from './customers.service.js';

export async function customersRoutes(fastify: FastifyInstance) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/', {
    preHandler: fastify.requirePermission(PERMISSIONS.CUSTOMERS_READ),
    schema: { tags: ['Customers'] },
    handler: async (request) => {
      const q = request.query as Record<string, string | undefined>;
      const opts: { page: number; pageSize: number; search?: string } = {
        page: Number(q['page']),
        pageSize: Number(q['pageSize']),
      };
      if (q['search']) opts.search = q['search'];
      return service.listCustomers(opts);
    },
  });

  fastify.get('/:id', {
    preHandler: fastify.requirePermission(PERMISSIONS.CUSTOMERS_READ),
    schema: { tags: ['Customers'] },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const canReadSensitive = request.user.permissions.includes(PERMISSIONS.CUSTOMERS_READ_SENSITIVE);
      return service.getCustomer(id, canReadSensitive, request.writeAudit);
    },
  });

  fastify.post('/', {
    preHandler: fastify.requirePermission(PERMISSIONS.CUSTOMERS_CREATE),
    schema: { tags: ['Customers'] },
    handler: async (request, reply) => {
      const canWriteSensitive = request.user.permissions.includes(PERMISSIONS.CUSTOMERS_WRITE_SENSITIVE);
      const customer = await service.createCustomer(
        request.body as never,
        request.user.id,
        canWriteSensitive,
        request.writeAudit,
      );
      return reply.status(201).send(customer);
    },
  });

  fastify.put('/:id', {
    preHandler: fastify.requirePermission(PERMISSIONS.CUSTOMERS_UPDATE),
    schema: { tags: ['Customers'] },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const canWriteSensitive = request.user.permissions.includes(PERMISSIONS.CUSTOMERS_WRITE_SENSITIVE);
      return service.updateCustomer(id, request.body as never, canWriteSensitive, request.writeAudit);
    },
  });

  fastify.delete('/:id', {
    preHandler: fastify.requirePermission(PERMISSIONS.CUSTOMERS_DELETE),
    schema: { tags: ['Customers'] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      await service.deleteCustomer(id, request.writeAudit);
      return reply.status(204).send();
    },
  });

  // Investor profile
  fastify.get('/:id/profile', {
    preHandler: fastify.requirePermission(PERMISSIONS.INVESTOR_PROFILES_READ),
    schema: { tags: ['Investor Profiles'] },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      return service.getInvestorProfile(id);
    },
  });

  fastify.put('/:id/profile', {
    preHandler: fastify.requirePermission(PERMISSIONS.INVESTOR_PROFILES_UPDATE),
    schema: { tags: ['Investor Profiles'] },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      return service.updateInvestorProfile(id, request.body as never, request.writeAudit);
    },
  });

  // Communications
  fastify.get('/:id/communications', {
    preHandler: fastify.requirePermission(PERMISSIONS.COMMUNICATIONS_READ),
    schema: { tags: ['Communications'] },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const q = request.query as Record<string, string>;
      return service.listCommunications(id, { page: Number(q['page']), pageSize: Number(q['pageSize']) });
    },
  });

  fastify.post('/:id/communications', {
    preHandler: fastify.requirePermission(PERMISSIONS.COMMUNICATIONS_CREATE),
    schema: { tags: ['Communications'] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const record = await service.createCommunication(
        id,
        request.body as never,
        request.user.id,
        request.writeAudit,
      );
      return reply.status(201).send(record);
    },
  });

  // Documents
  fastify.get('/:id/documents', {
    preHandler: fastify.requirePermission(PERMISSIONS.DOCUMENTS_READ),
    schema: { tags: ['Documents'] },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      return service.listDocuments(id);
    },
  });

  fastify.post('/:id/documents', {
    preHandler: fastify.requirePermission(PERMISSIONS.DOCUMENTS_UPLOAD),
    schema: { tags: ['Documents'], consumes: ['multipart/form-data'] },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = await request.file();
      if (!data) return reply.status(400).send({ error: 'No file uploaded' });

      const buffer = await data.toBuffer();
      const doc = await service.uploadDocument(
        id,
        { filename: data.filename, mimetype: data.mimetype, data: buffer },
        request.user.id,
        request.writeAudit,
      );
      return reply.status(201).send(doc);
    },
  });

  fastify.delete('/:id/documents/:docId', {
    preHandler: fastify.requirePermission(PERMISSIONS.DOCUMENTS_DELETE),
    schema: { tags: ['Documents'] },
    handler: async (request, reply) => {
      const { id, docId } = request.params as { id: string; docId: string };
      await service.removeDocument(id, docId, request.writeAudit);
      return reply.status(204).send();
    },
  });
}
