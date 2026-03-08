import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Permission } from '@investor-backoffice/shared';
import { ForbiddenError } from '../utils/errors.js';

type PermissionCheck = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

declare module 'fastify' {
  interface FastifyInstance {
    requirePermission: (permission: Permission) => PermissionCheck;
    requireAdmin: () => PermissionCheck;
  }
}

export const rbacPlugin = fp(async (fastify: FastifyInstance) => {
  /**
   * Returns a preHandler function that verifies the authenticated user has a specific permission.
   * Admin users bypass all permission checks.
   *
   * Usage in routes:
   *   preHandler: [fastify.authenticate, fastify.requirePermission(PERMISSIONS.USERS_CREATE)]
   */
  fastify.decorate('requirePermission', (permission: Permission): PermissionCheck => {
    return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      const user = request.user;
      // Admin users have all permissions
      if (user.isAdmin) return;
      if (!user.permissions.includes(permission)) {
        throw new ForbiddenError(
          `Permission required: ${permission}`,
        );
      }
    };
  });

  /**
   * Returns a preHandler function that allows only admin users.
   * Used for user/group/role management endpoints.
   */
  fastify.decorate('requireAdmin', (): PermissionCheck => {
    return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      if (!request.user.isAdmin) {
        throw new ForbiddenError('Admin access required');
      }
    };
  });
});
