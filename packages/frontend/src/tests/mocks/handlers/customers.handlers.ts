import { http, HttpResponse } from 'msw';
import type { Customer, PaginatedResponse } from '@investor-backoffice/shared';

export const mockCustomer: Customer = {
  id: 'cust-001',
  mnemonic: 'SILVA001',
  fullName: 'João da Silva',
  email: 'joao@example.com',
  phone: '+55 11 99999-0001',
  riskProfile: 'moderate',
  investorNotes: 'Test notes',
  createdBy: 'user-001',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  deletedAt: null,
};

const mockList: PaginatedResponse<Customer> = {
  data: [mockCustomer],
  total: 1,
  page: 1,
  pageSize: 20,
};

export const customersHandlers = [
  http.get('/api/customers', () => HttpResponse.json(mockList)),

  http.get('/api/customers/:id', ({ params }) => {
    if (params['id'] === mockCustomer.id) {
      return HttpResponse.json(mockCustomer);
    }
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  http.post('/api/customers', async ({ request }) => {
    const body = await request.json() as Partial<Customer>;
    return HttpResponse.json(
      { ...mockCustomer, ...body, id: 'new-customer-id' },
      { status: 201 },
    );
  }),

  http.put('/api/customers/:id', async ({ params, request }) => {
    const body = await request.json() as Partial<Customer>;
    if (params['id'] === mockCustomer.id) {
      return HttpResponse.json({ ...mockCustomer, ...body });
    }
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  http.delete('/api/customers/:id', () =>
    new HttpResponse(null, { status: 204 }),
  ),

  http.get('/api/customers/:id/profile', () =>
    HttpResponse.json({ id: 'profile-001', customerId: 'cust-001', notes: 'Test', formResponses: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z' }),
  ),

  http.get('/api/customers/:id/communications', () =>
    HttpResponse.json({ data: [], total: 0, page: 1, pageSize: 20 }),
  ),
];
