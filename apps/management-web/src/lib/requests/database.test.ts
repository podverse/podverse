import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiRequestMock = vi.fn();

vi.mock('../requests/apiRequestService', () => ({
  ManagementApiRequestService: vi.fn().mockImplementation(() => ({
    apiRequest: apiRequestMock,
  })),
}));

import {
  createTableRow,
  deleteTableRow,
  getDatabaseTables,
  getTableMeta,
  getTableRow,
  queryTable,
  updateTableRow,
} from '../requests/database';

describe('database request helpers', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({ tables: [] });
  });

  it('getDatabaseTables calls /database/tables', async () => {
    apiRequestMock.mockResolvedValue({ tables: [{ tableName: 'feed' }] });

    const result = await getDatabaseTables();

    expect(apiRequestMock).toHaveBeenCalledWith({
      path: '/database/tables',
      method: 'GET',
    });
    expect(result.tables).toHaveLength(1);
  });

  it('getTableMeta calls /database/:table/meta', async () => {
    apiRequestMock.mockResolvedValue({ tableName: 'feed', fields: [] });

    await getTableMeta('feed');

    expect(apiRequestMock).toHaveBeenCalledWith({
      path: '/database/feed/meta',
      method: 'GET',
    });
  });

  it('queryTable calls /database/:table/query with POST', async () => {
    apiRequestMock.mockResolvedValue({ rows: [], total: 0 });

    await queryTable('feed', { page: 1, pageSize: 25 });

    expect(apiRequestMock).toHaveBeenCalledWith({
      path: '/database/feed/query',
      method: 'POST',
      data: { page: 1, pageSize: 25 },
    });
  });

  it('getTableRow calls /database/:table/:id with GET', async () => {
    apiRequestMock.mockResolvedValue({ id: 1 });

    await getTableRow('feed', 1);

    expect(apiRequestMock).toHaveBeenCalledWith({
      path: '/database/feed/1',
      method: 'GET',
    });
  });

  it('createTableRow calls /database/:table with POST', async () => {
    apiRequestMock.mockResolvedValue({ id: 5 });

    await createTableRow('feed_flag_status_reason', { reason: 'spam' });

    expect(apiRequestMock).toHaveBeenCalledWith({
      path: '/database/feed_flag_status_reason',
      method: 'POST',
      data: { reason: 'spam' },
    });
  });

  it('updateTableRow calls /database/:table/:id with PATCH', async () => {
    apiRequestMock.mockResolvedValue({ id: 1, reason: 'updated' });

    await updateTableRow('feed_flag_status_reason', 1, { reason: 'updated' });

    expect(apiRequestMock).toHaveBeenCalledWith({
      path: '/database/feed_flag_status_reason/1',
      method: 'PATCH',
      data: { reason: 'updated' },
    });
  });

  it('deleteTableRow calls /database/:table/:id with DELETE', async () => {
    apiRequestMock.mockResolvedValue(undefined);

    await deleteTableRow('feed_flag_status_reason', 7);

    expect(apiRequestMock).toHaveBeenCalledWith({
      path: '/database/feed_flag_status_reason/7',
      method: 'DELETE',
    });
  });
});
