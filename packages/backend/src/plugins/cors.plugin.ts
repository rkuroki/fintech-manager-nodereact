import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';

export const corsPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(fastifyCors, {
    // In development, allow the Vite dev server to call the backend
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
});
