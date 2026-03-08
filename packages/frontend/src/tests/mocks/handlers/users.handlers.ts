import { http, HttpResponse } from 'msw';
import type { User, PaginatedResponse } from '@investor-backoffice/shared';

export const mockUser: User = {
  id: 'user-001',
  email: 'admin@example.com',
  alias: 'admin',
  fullName: 'Test Admin',
  mobileNumber: null,
  identityId: null,
  isAdmin: true,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  deletedAt: null,
};

export const usersHandlers = [
  http.get('/api/users', () =>
    HttpResponse.json<PaginatedResponse<User>>({
      data: [mockUser],
      total: 1,
      page: 1,
      pageSize: 20,
    }),
  ),

  http.get('/api/users/:id', ({ params }) => {
    if (params['id'] === mockUser.id) return HttpResponse.json(mockUser);
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json() as Partial<User>;
    return HttpResponse.json({ ...mockUser, ...body, id: 'new-user-id' }, { status: 201 });
  }),

  http.put('/api/users/:id', async ({ params, request }) => {
    const body = await request.json() as Partial<User>;
    if (params['id'] === mockUser.id) return HttpResponse.json({ ...mockUser, ...body });
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  http.delete('/api/users/:id', () => new HttpResponse(null, { status: 204 })),
];
