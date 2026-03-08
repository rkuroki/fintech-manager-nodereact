import { http, HttpResponse } from 'msw';
import type { CurrentUser } from '@investor-backoffice/shared';
import { MANAGER_PERMISSIONS } from '@investor-backoffice/shared';

export const mockCurrentUser: CurrentUser = {
  id: 'user-001',
  email: 'admin@example.com',
  alias: 'admin',
  fullName: 'Test Admin',
  isAdmin: true,
  permissions: [],
};

export const mockManagerUser: CurrentUser = {
  id: 'user-002',
  email: 'manager@example.com',
  alias: 'manager',
  fullName: 'Test Manager',
  isAdmin: false,
  permissions: MANAGER_PERMISSIONS,
};

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };

    if (body.email === 'admin@example.com' && body.password === 'Admin123!') {
      return HttpResponse.json({ token: 'mock-token', user: mockCurrentUser });
    }
    if (body.email === 'manager@example.com' && body.password === 'Manager123!') {
      return HttpResponse.json({ token: 'mock-manager-token', user: mockManagerUser });
    }

    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }),

  http.get('/api/auth/me', () =>
    HttpResponse.json(mockCurrentUser),
  ),

  http.post('/api/auth/logout', () =>
    new HttpResponse(null, { status: 204 }),
  ),
];
