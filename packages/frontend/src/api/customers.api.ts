import { apiClient } from './client.js';
import type {
  Customer,
  CustomerWithSensitive,
  PaginatedResponse,
  PaginationParams,
  InvestorProfile,
  CommunicationRecord,
  CustomerDocument,
} from '@investor-backoffice/shared';
import type {
  CreateCustomerDto,
  UpdateCustomerDto,
  CreateCommunicationDto,
  UpdateInvestorProfileDto,
} from '@investor-backoffice/shared';

export const customersApi = {
  list: (params?: PaginationParams): Promise<PaginatedResponse<Customer>> =>
    apiClient.get<PaginatedResponse<Customer>>('/customers', { params }).then((r) => r.data),

  get: (id: string): Promise<Customer | CustomerWithSensitive> =>
    apiClient.get<Customer | CustomerWithSensitive>(`/customers/${id}`).then((r) => r.data),

  create: (dto: CreateCustomerDto): Promise<Customer> =>
    apiClient.post<Customer>('/customers', dto).then((r) => r.data),

  update: (id: string, dto: UpdateCustomerDto): Promise<Customer> =>
    apiClient.put<Customer>(`/customers/${id}`, dto).then((r) => r.data),

  remove: (id: string): Promise<void> =>
    apiClient.delete(`/customers/${id}`).then(() => undefined),

  // Investor profile
  getProfile: (customerId: string): Promise<InvestorProfile | null> =>
    apiClient.get<InvestorProfile>(`/customers/${customerId}/profile`).then((r) => r.data),

  updateProfile: (customerId: string, dto: UpdateInvestorProfileDto): Promise<InvestorProfile> =>
    apiClient
      .put<InvestorProfile>(`/customers/${customerId}/profile`, dto)
      .then((r) => r.data),

  // Communications
  listCommunications: (
    customerId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<CommunicationRecord>> =>
    apiClient
      .get<PaginatedResponse<CommunicationRecord>>(`/customers/${customerId}/communications`, {
        params,
      })
      .then((r) => r.data),

  createCommunication: (
    customerId: string,
    dto: CreateCommunicationDto,
  ): Promise<CommunicationRecord> =>
    apiClient
      .post<CommunicationRecord>(`/customers/${customerId}/communications`, dto)
      .then((r) => r.data),

  // Documents
  listDocuments: (customerId: string): Promise<CustomerDocument[]> =>
    apiClient.get<CustomerDocument[]>(`/customers/${customerId}/documents`).then((r) => r.data),

  uploadDocument: (customerId: string, file: File): Promise<CustomerDocument> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient
      .post<CustomerDocument>(`/customers/${customerId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  deleteDocument: (customerId: string, documentId: string): Promise<void> =>
    apiClient.delete(`/customers/${customerId}/documents/${documentId}`).then(() => undefined),
};
