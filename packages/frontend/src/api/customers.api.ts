import { apiClient } from './client.js';
import type {
  Customer,
  CustomerWithSensitive,
  PaginatedResponse,
  PaginationParams,
  InvestorProfile,
  CommunicationRecord,
  CustomerDocument,
  CustomerAccessRole,
  CustomerNote,
} from '@investor-backoffice/shared';
import type {
  CreateCustomerDto,
  UpdateCustomerDto,
  CreateCommunicationDto,
  UpdateCommunicationDto,
  UpdateInvestorProfileDto,
  CreateNoteDto,
  UpdateNoteDto,
} from '@investor-backoffice/shared';

export const customersApi = {
  list: (params?: PaginationParams): Promise<PaginatedResponse<Customer>> =>
    apiClient.get<PaginatedResponse<Customer>>('/customers', { params }).then((r) => r.data),

  get: (id: string): Promise<Customer | CustomerWithSensitive> =>
    apiClient.get<Customer | CustomerWithSensitive>(`/customers/${id}`).then((r) => r.data),

  getByMnemonic: (mnemonic: string): Promise<Customer | CustomerWithSensitive> =>
    apiClient
      .get<Customer | CustomerWithSensitive>(`/customers/by-mnemonic/${mnemonic}`)
      .then((r) => r.data),

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

  updateCommunication: (
    customerId: string,
    commId: string,
    dto: UpdateCommunicationDto,
  ): Promise<CommunicationRecord> =>
    apiClient
      .put<CommunicationRecord>(`/customers/${customerId}/communications/${commId}`, dto)
      .then((r) => r.data),

  deleteCommunication: (customerId: string, commId: string): Promise<void> =>
    apiClient
      .delete(`/customers/${customerId}/communications/${commId}`)
      .then(() => undefined),

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

  downloadDocument: (customerId: string, documentId: string): Promise<Blob> =>
    apiClient
      .get(`/customers/${customerId}/documents/${documentId}/download`, { responseType: 'blob' })
      .then((r) => r.data as Blob),

  // Access Roles
  listRoles: (customerId: string): Promise<CustomerAccessRole[]> =>
    apiClient.get<CustomerAccessRole[]>(`/customers/${customerId}/roles`).then((r) => r.data),

  updateRoles: (customerId: string, roleIds: string[]): Promise<void> =>
    apiClient.put(`/customers/${customerId}/roles`, { roleIds }).then(() => undefined),

  // Notes
  listNotes: (customerId: string): Promise<CustomerNote[]> =>
    apiClient.get<CustomerNote[]>(`/customers/${customerId}/notes`).then((r) => r.data),

  createNote: (customerId: string, dto: CreateNoteDto): Promise<CustomerNote> =>
    apiClient.post<CustomerNote>(`/customers/${customerId}/notes`, dto).then((r) => r.data),

  updateNote: (customerId: string, noteId: string, dto: UpdateNoteDto): Promise<CustomerNote> =>
    apiClient
      .put<CustomerNote>(`/customers/${customerId}/notes/${noteId}`, dto)
      .then((r) => r.data),

  deleteNote: (customerId: string, noteId: string): Promise<void> =>
    apiClient.delete(`/customers/${customerId}/notes/${noteId}`).then(() => undefined),
};
