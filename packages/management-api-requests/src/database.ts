import { ManagementApiRequestService } from './apiRequestService.js';

export type TableFieldMeta = {
  name: string;
  type: 'integer' | 'text' | 'boolean' | 'timestamp';
  nullable: boolean;
  updatable: boolean;
};

export type TableMeta = {
  tableName: string;
  primaryKeyField: string;
  fields: TableFieldMeta[];
  defaultSortField: string;
  defaultSortDirection: 'ASC' | 'DESC';
  maxPageSize: number;
  readOnly: boolean;
};

export type QueryResult = {
  rows: Record<string, unknown>[];
  total: number;
};

type FilterCondition = {
  field: string;
  operator: string;
  value?: unknown;
};

type SortCondition = {
  field: string;
  direction: 'ASC' | 'DESC';
};

export async function getDatabaseTables(): Promise<{ tables: TableMeta[] }> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<{ tables: TableMeta[] }>({
    path: '/database/tables',
    method: 'GET',
  });
}

export async function getTableMeta(tableName: string): Promise<TableMeta> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<TableMeta>({
    path: `/database/${tableName}/meta`,
    method: 'GET',
  });
}

export async function queryTable(
  tableName: string,
  options?: {
    filters?: FilterCondition[];
    sorts?: SortCondition[];
    page?: number;
    pageSize?: number;
  }
): Promise<QueryResult> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<QueryResult>({
    path: `/database/${tableName}/query`,
    method: 'POST',
    data: options ?? {},
  });
}

export async function getTableRow(tableName: string, id: number): Promise<Record<string, unknown>> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<Record<string, unknown>>({
    path: `/database/${tableName}/${id}`,
    method: 'GET',
  });
}

export async function createTableRow(
  tableName: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<Record<string, unknown>>({
    path: `/database/${tableName}`,
    method: 'POST',
    data,
  });
}

export async function updateTableRow(
  tableName: string,
  id: number,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<Record<string, unknown>>({
    path: `/database/${tableName}/${id}`,
    method: 'PATCH',
    data,
  });
}

export async function deleteTableRow(tableName: string, id: number): Promise<void> {
  const service = new ManagementApiRequestService();
  await service.apiRequest<void>({
    path: `/database/${tableName}/${id}`,
    method: 'DELETE',
  });
}
