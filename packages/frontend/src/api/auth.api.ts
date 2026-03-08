import { apiClient } from './client.js';
import type { CurrentUser } from '@investor-backoffice/shared';

export interface LoginResponse {
  token: string;
  user: CurrentUser;
}

export const authApi = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    apiClient.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data),

  logout: (): Promise<void> =>
    apiClient.post('/auth/logout').then(() => undefined),

  me: (): Promise<CurrentUser> =>
    apiClient.get<CurrentUser>('/auth/me').then((r) => r.data),
};
