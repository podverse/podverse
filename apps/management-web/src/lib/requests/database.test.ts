import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getDatabaseTablesMock,
  getTableMetaMock,
  queryTableMock,
  getTableRowMock,
  createTableRowMock,
  updateTableRowMock,
  deleteTableRowMock,
} = vi.hoisted(() => ({
  getDatabaseTablesMock: vi.fn(),
  getTableMetaMock: vi.fn(),
  queryTableMock: vi.fn(),
  getTableRowMock: vi.fn(),
  createTableRowMock: vi.fn(),
  updateTableRowMock: vi.fn(),
  deleteTableRowMock: vi.fn(),
}));

vi.mock('@podverse/management-api-requests', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/management-api-requests')>();

  return {
    ...actual,
    getDatabaseTables: getDatabaseTablesMock,
    getTableMeta: getTableMetaMock,
    queryTable: queryTableMock,
    getTableRow: getTableRowMock,
    createTableRow: createTableRowMock,
    updateTableRow: updateTableRowMock,
    deleteTableRow: deleteTableRowMock,
  };
});

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
    getDatabaseTablesMock.mockReset();
    getTableMetaMock.mockReset();
    queryTableMock.mockReset();
    getTableRowMock.mockReset();
    createTableRowMock.mockReset();
    updateTableRowMock.mockReset();
    deleteTableRowMock.mockReset();
  });

  it('getDatabaseTables calls /database/tables', async () => {
    getDatabaseTablesMock.mockResolvedValue({ tables: [{ tableName: 'feed' }] });

    const result = await getDatabaseTables();

    expect(getDatabaseTablesMock).toHaveBeenCalled();
    expect(result.tables).toHaveLength(1);
  });

  it('getTableMeta calls /database/:table/meta', async () => {
    getTableMetaMock.mockResolvedValue({ tableName: 'feed', fields: [] });

    await getTableMeta('feed');

    expect(getTableMetaMock).toHaveBeenCalledWith('feed');
  });

  it('queryTable calls /database/:table/query with POST', async () => {
    queryTableMock.mockResolvedValue({ rows: [], total: 0 });

    await queryTable('feed', { page: 1, pageSize: 25 });

    expect(queryTableMock).toHaveBeenCalledWith('feed', { page: 1, pageSize: 25 });
  });

  it('getTableRow calls /database/:table/:id with GET', async () => {
    getTableRowMock.mockResolvedValue({ id: 1 });

    await getTableRow('feed', 1);

    expect(getTableRowMock).toHaveBeenCalledWith('feed', 1);
  });

  it('createTableRow calls /database/:table with POST', async () => {
    createTableRowMock.mockResolvedValue({ id: 5 });

    await createTableRow('feed_takedown_reason', { reason: 'spam' });

    expect(createTableRowMock).toHaveBeenCalledWith('feed_takedown_reason', { reason: 'spam' });
  });

  it('updateTableRow calls /database/:table/:id with PATCH', async () => {
    updateTableRowMock.mockResolvedValue({ id: 1, reason: 'updated' });

    await updateTableRow('feed_takedown_reason', 1, { reason: 'updated' });

    expect(updateTableRowMock).toHaveBeenCalledWith('feed_takedown_reason', 1, {
      reason: 'updated',
    });
  });

  it('deleteTableRow calls /database/:table/:id with DELETE', async () => {
    deleteTableRowMock.mockResolvedValue(undefined);

    await deleteTableRow('feed_takedown_reason', 7);

    expect(deleteTableRowMock).toHaveBeenCalledWith('feed_takedown_reason', 7);
  });
});
