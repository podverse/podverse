import { beforeEach, describe, expect, it, vi } from 'vitest';

const { countMock, createMock, deleteMock, findMock, saveMock } = vi.hoisted(() => ({
  countMock: vi.fn(),
  createMock: vi.fn(),
  deleteMock: vi.fn(),
  findMock: vi.fn(),
  saveMock: vi.fn(),
}));

const { AccountNotificationEntity } = vi.hoisted(() => ({
  AccountNotificationEntity: class AccountNotification {},
}));

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceRead: {
    getRepository: () => ({
      count: countMock,
      find: findMock,
    }),
  },
  AppDataSourceReadWrite: {
    getRepository: () => ({
      create: createMock,
      delete: deleteMock,
      save: saveMock,
    }),
  },
}));

vi.mock('@orm/entities/account/accountNotification.js', () => ({
  AccountNotification: AccountNotificationEntity,
}));

import { AccountNotificationService } from './accountNotification.js';

describe('AccountNotificationService', () => {
  beforeEach(() => {
    countMock.mockReset();
    createMock.mockReset();
    deleteMock.mockReset();
    findMock.mockReset();
    saveMock.mockReset();
  });

  it('countUnread counts all rows when last_read_at is null', async () => {
    countMock.mockResolvedValue(12);

    const service = new AccountNotificationService();
    const count = await service.countUnread(41, null);

    expect(count).toBe(12);
    expect(countMock).toHaveBeenCalledWith({
      where: {
        account_id: 41,
      },
    });
  });

  it('countUnread applies created_at filter when last_read_at is set', async () => {
    countMock.mockResolvedValue(4);

    const service = new AccountNotificationService();
    const count = await service.countUnread(41, new Date('2026-04-01T00:00:00.000Z'));

    expect(count).toBe(4);
    expect(countMock).toHaveBeenCalledWith({
      where: expect.objectContaining({
        account_id: 41,
        created_at: expect.any(Object),
      }),
    });
  });

  it('deleteCreatedBefore reports how many rows the retention window removed', async () => {
    deleteMock.mockResolvedValue({ affected: 7 });

    const service = new AccountNotificationService();
    const deleted = await service.deleteCreatedBefore(new Date('2026-04-01T00:00:00.000Z'));

    expect(deleted).toBe(7);
    expect(deleteMock).toHaveBeenCalledWith({
      created_at: expect.any(Object),
    });
  });

  it('a second purge over the same window finds nothing left to delete', async () => {
    deleteMock.mockResolvedValueOnce({ affected: 7 }).mockResolvedValueOnce({ affected: 0 });

    const service = new AccountNotificationService();
    const cutoff = new Date('2026-04-01T00:00:00.000Z');

    expect(await service.deleteCreatedBefore(cutoff)).toBe(7);
    expect(await service.deleteCreatedBefore(cutoff)).toBe(0);
  });
});
