import type { FastifyInstance } from 'fastify';
import { getUserByEmail, getUserPermissions } from '../users/users.repository.js';
import { verifyPassword } from '../../utils/password.js';
import { UnauthorizedError } from '../../utils/errors.js';
import { getDb } from '../../db/connection.js';
import { activityLog } from '../../db/schema/audit.js';
import { v4 as uuidv4 } from 'uuid';

export async function login(email: string, password: string, fastify: FastifyInstance) {
  const user = await getUserByEmail(email);

  if (!user || !user.isActive) {
    // Avoid timing attacks: always run password verification even on not-found
    await verifyPassword('$argon2id$v=19$m=65536,t=3,p=1$dummy', password).catch(() => {});
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const permissions = await getUserPermissions(user.id, user.isAdmin);

  const token = fastify.jwt.sign({
    sub: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
  });

  // Log login activity
  const db = getDb();
  db.insert(activityLog)
    .values({
      id: uuidv4(),
      userId: user.id,
      action: 'LOGIN',
      metadata: null,
    })
    .run();

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      alias: user.alias,
      fullName: user.fullName,
      isAdmin: user.isAdmin,
      permissions,
    },
  };
}

export function logout(userId: string) {
  // JWT is stateless — logout is client-side (discard the token).
  // We log the event for audit purposes.
  const db = getDb();
  db.insert(activityLog)
    .values({
      id: uuidv4(),
      userId,
      action: 'LOGOUT',
      metadata: null,
    })
    .run();
}
