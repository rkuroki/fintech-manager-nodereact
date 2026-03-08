import type { FastifyInstance } from 'fastify';
import { login, logout } from './auth.service.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      security: [], // Login does not require a token
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
    },
    handler: async (request) => {
      const { email, password } = request.body as { email: string; password: string };
      return login(email, password, fastify);
    },
  });

  fastify.post('/logout', {
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Auth'],
    },
    handler: async (request, reply) => {
      logout(request.user.id);
      return reply.status(204).send();
    },
  });

  fastify.get('/me', {
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Auth'],
    },
    handler: async (request) => {
      return request.user;
    },
  });
}
