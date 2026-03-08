import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const staticPlugin = fp(async (fastify: FastifyInstance) => {
  // In production, the React build is copied to dist/public/ by the Dockerfile
  const publicPath = join(__dirname, '..', 'public');

  await fastify.register(fastifyStatic, {
    root: publicPath,
    prefix: '/',
    wildcard: false,
  });

  // SPA fallback: serve index.html for any non-API route
  fastify.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api')) {
      return reply.status(404).send({
        error: 'NotFound',
        message: 'Route not found',
        statusCode: 404,
      });
    }
    return reply.sendFile('index.html', publicPath);
  });
});
