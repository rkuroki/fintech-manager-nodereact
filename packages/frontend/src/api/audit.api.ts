import { apiClient } from './client.js';
import type { AuditLogEntry, ActivityLogEntry } from '@investor-backoffice/shared';

interface AuditListResponse {
  data: AuditLogEntry[];
  page: number;
  pageSize: number;
}

export const auditApi = {
  listAudit: (params?: {
    entityType?: string | undefined;
    entityId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
  }): Promise<AuditListResponse> =>
    apiClient.get<AuditListResponse>('/audit', { params }).then((r) => r.data),

  listActivity: (params?: {
    page?: number | undefined;
    pageSize?: number | undefined;
  }): Promise<{ data: ActivityLogEntry[]; page: number; pageSize: number }> =>
    apiClient
      .get<{ data: ActivityLogEntry[]; page: number; pageSize: number }>('/activity', { params })
      .then((r) => r.data),
};
