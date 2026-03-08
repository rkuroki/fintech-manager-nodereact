import { apiClient } from './client.js';
import type {
  GmailConnectionStatus,
  GmailSyncResult,
  TimelineEntry,
  PaginatedResponse,
  PaginationParams,
} from '@investor-backoffice/shared';

interface GmailStatusResponse extends GmailConnectionStatus {
  configured: boolean;
}

export const gmailApi = {
  /** Get current user's Gmail connection status */
  getStatus: (): Promise<GmailStatusResponse> =>
    apiClient.get<GmailStatusResponse>('/gmail/status').then((r) => r.data),

  /** Get Google OAuth2 consent URL */
  getAuthUrl: (): Promise<{ authUrl: string }> =>
    apiClient.get<{ authUrl: string }>('/gmail/auth').then((r) => r.data),

  /** Disconnect Gmail account */
  disconnect: (): Promise<void> =>
    apiClient.delete('/gmail/disconnect').then(() => undefined),

  /** Trigger email sync for a specific customer */
  syncEmails: (customerId: string): Promise<GmailSyncResult> =>
    apiClient.post<GmailSyncResult>(`/gmail/sync/${customerId}`).then((r) => r.data),

  /** Get unified timeline (manual + Gmail) for a customer */
  getTimeline: (
    customerId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<TimelineEntry>> =>
    apiClient
      .get<PaginatedResponse<TimelineEntry>>(`/gmail/timeline/${customerId}`, { params })
      .then((r) => r.data),
};
