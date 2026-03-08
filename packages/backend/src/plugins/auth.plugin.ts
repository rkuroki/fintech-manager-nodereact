import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { CurrentUser } from '@investor-backoffice/shared';
import { config } from '../config.js';
import { UnauthorizedError } from '../utils/errors.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      isAdmin: boolean;
    };
    // request.user is replaced with the DB-loaded CurrentUser after jwtVerify()
    user: CurrentUser;
  }
}

export const authPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(fastifyJwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: '8h', // Business-day sessions; short enough to limit exposure
    },
  });

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        await request.jwtVerify();
      } catch {
        throw new UnauthorizedError('Invalid or expired token');
      }

      // Load user from DB each request to catch deactivated accounts mid-session.
      // This is a deliberate design choice: permissions must always be fresh.
      // Cast to raw JWT payload to read .sub before we overwrite request.user
      const rawPayload = request.user as unknown as { sub: string };
      const { getUserById } = await import('../domains/users/users.repository.js');
      const user = await getUserById(rawPayload.sub);

      if (!user || !user.isActive || user.deletedAt) {
        return reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
      }

      // Resolve permissions from roles (direct + via groups)
      const { getUserPermissions } = await import('../domains/users/users.repository.js');
      const permissions = await getUserPermissions(user.id, user.isAdmin);

      request.user = {
        id: user.id,
        email: user.email,
        alias: user.alias,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
        permissions,
      };
    },
  );
});
