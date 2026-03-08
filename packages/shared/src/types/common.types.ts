export type UUID = string;
export type ISODateString = string;
export type CPF = string; // Brazilian government ID

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationParams {
  page?: number | undefined;
  pageSize?: number | undefined;
  search?: string | undefined;
}

export interface AuditFields {
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt: ISODateString | null;
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode: number;
}
