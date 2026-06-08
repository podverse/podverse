import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const readFindOne = vi.fn();
const readWriteFindOne = vi.fn();
const readWriteSave = vi.fn();
const readWriteRemove = vi.fn();
const readWriteCreateQueryBuilder = vi.fn();
const readWriteQbInsert = vi.fn();
const readWriteQbInto = vi.fn();
const readWriteQbValues = vi.fn();
const readWriteQbOrIgnore = vi.fn();
const readWriteQbExecute = vi.fn();

const accountGet = vi.fn();

function mockReadWriteInsertChain(): void {
  readWriteQbInsert.mockReturnValue({
    into: readWriteQbInto,
  });
  readWriteQbInto.mockReturnValue({
    values: readWriteQbValues,
  });
  readWriteQbValues.mockReturnValue({
    orIgnore: readWriteQbOrIgnore,
  });
  readWriteQbOrIgnore.mockReturnValue({
    execute: readWriteQbExecute,
  });
  readWriteCreateQueryBuilder.mockReturnValue({
    insert: readWriteQbInsert,
  });
}

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceRead: {
    getRepository: () => ({ findOne: readFindOne }),
  },
  AppDataSourceReadWrite: {
    getRepository: () => ({
      findOne: readWriteFindOne,
      save: readWriteSave,
      createQueryBuilder: readWriteCreateQueryBuilder,
      remove: readWriteRemove,
    }),
  },
}));

vi.mock('@orm/services/account/account.js', () => ({
  AccountService: class {
    get = accountGet;
  },
}));

vi.mock('@podverse/helpers', () => ({
  generateGuidV4: () => '00000000-0000-4000-8000-000000000001',
}));

import { StatsTrackAccountGuidService } from './statsTrackAccountGuid.js';

describe('StatsTrackAccountGuidService', () => {
  beforeEach(() => {
    mockReadWriteInsertChain();
    readFindOne.mockReset();
    readWriteFindOne.mockReset();
    readWriteSave.mockReset();
    readWriteCreateQueryBuilder.mockReset();
    readWriteQbInsert.mockReset();
    readWriteQbInto.mockReset();
    readWriteQbValues.mockReset();
    readWriteQbOrIgnore.mockReset();
    readWriteQbExecute.mockReset();
    accountGet.mockReset();
    mockReadWriteInsertChain();
  });

  afterEach(() => {
    readFindOne.mockReset();
    readWriteFindOne.mockReset();
    readWriteSave.mockReset();
    readWriteCreateQueryBuilder.mockReset();
    readWriteQbInsert.mockReset();
    readWriteQbInto.mockReset();
    readWriteQbValues.mockReset();
    readWriteQbOrIgnore.mockReset();
    readWriteQbExecute.mockReset();
    accountGet.mockReset();
  });

  it('getByAccountId returns read-write row when the read connection missed it', async () => {
    const fromRw = { id: 1, account_guid: 'a', updated_at: new Date() } as {
      id: number;
      account_guid: string;
      updated_at: Date;
    };
    readFindOne.mockResolvedValue(null);
    readWriteFindOne.mockResolvedValue(fromRw);

    const s = new StatsTrackAccountGuidService();
    const got = await s.getByAccountId(9);

    expect(got).toBe(fromRw);
    expect(readWriteQbExecute).not.toHaveBeenCalled();
  });

  it('create performs conflict-safe insert and then reads canonical row', async () => {
    accountGet.mockResolvedValue({ id: 1 });
    const existing = {
      id: 1,
      account_id: 1,
      account_guid: 'b',
      updated_at: new Date(),
    } as { id: number; account_id: number; account_guid: string; updated_at: Date };

    readWriteQbExecute.mockResolvedValue({});
    readWriteFindOne.mockResolvedValue(existing);

    const s = new StatsTrackAccountGuidService();
    const got = await s.create(1);

    expect(got).toBe(existing);
    expect(readWriteQbValues).toHaveBeenCalledWith({
      account: { id: 1 },
      account_guid: '00000000-0000-4000-8000-000000000001',
    });
    expect(readWriteQbExecute).toHaveBeenCalledTimes(1);
    expect(readWriteFindOne).toHaveBeenCalledWith({ where: { account: { id: 1 } } });
  });

  it('getByAccountId rotates account_guid when the row is older than seven days', async () => {
    const staleUpdatedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const staleRow = {
      id: 3,
      account_guid: 'old-guid',
      updated_at: staleUpdatedAt,
    } as { id: number; account_guid: string; updated_at: Date };
    const rotatedRow = {
      ...staleRow,
      account_guid: '00000000-0000-4000-8000-000000000001',
      updated_at: new Date(),
    };

    readFindOne.mockResolvedValue(staleRow);
    readWriteSave.mockResolvedValue(rotatedRow);

    const s = new StatsTrackAccountGuidService();
    const got = await s.getByAccountId(4);

    expect(readWriteSave).toHaveBeenCalledTimes(1);
    expect(got).toEqual(rotatedRow);
  });

  it('getByAccountId skips rotation when rotate is false', async () => {
    const staleUpdatedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const staleRow = {
      id: 3,
      account_guid: 'old-guid',
      updated_at: staleUpdatedAt,
    } as { id: number; account_guid: string; updated_at: Date };

    readFindOne.mockResolvedValue(staleRow);

    const s = new StatsTrackAccountGuidService();
    const got = await s.getByAccountId(4, { rotate: false });

    expect(readWriteSave).not.toHaveBeenCalled();
    expect(got).toBe(staleRow);
  });
});
