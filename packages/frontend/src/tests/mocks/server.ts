import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/auth.handlers.js';
import { customersHandlers } from './handlers/customers.handlers.js';
import { usersHandlers } from './handlers/users.handlers.js';

export const server = setupServer(
  ...authHandlers,
  ...customersHandlers,
  ...usersHandlers,
);
