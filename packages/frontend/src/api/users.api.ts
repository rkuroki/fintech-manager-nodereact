import { apiClient } from './client.js';
import type { User, PaginatedResponse, PaginationParams, AccessRole } from '@investor-backoffice/shared';
import type { CreateUserDto, UpdateUserDto } from '@investor-backoffice/shared';

export const usersApi = {
  list: (params?: PaginationParams): Promise<PaginatedResponse<User>> =>
    apiClient.get<PaginatedResponse<User>>('/users', { params }).then((r) => r.data),

  get: (id: string): Promise<User> =>
    apiClient.get<User>(`/users/${id}`).then((r) => r.data),

  create: (dto: CreateUserDto): Promise<User> =>
    apiClient.post<User>('/users', dto).then((r) => r.data),

  update: (id: string, dto: UpdateUserDto): Promise<User> =>
    apiClient.put<User>(`/users/${id}`, dto).then((r) => r.data),

  remove: (id: string): Promise<void> =>
    apiClient.delete(`/users/${id}`).then(() => undefined),

  listRoles: (): Promise<AccessRole[]> =>
    apiClient.get<AccessRole[]>('/users/roles').then((r) => r.data),
};
