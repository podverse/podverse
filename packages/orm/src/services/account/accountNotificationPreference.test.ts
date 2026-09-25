import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_NOTIFICATION_CATEGORY_PREFERENCES,
  NOTIFICATION_CATEGORY_VALUES,
  NotificationCategoryEnum,
} from '@podverse/helpers';

const { createMock, findOneMock, findReadMock, findWriteMock, saveMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findOneMock: vi.fn(),
  findReadMock: vi.fn(),
  findWriteMock: vi.fn(),
  saveMock: vi.fn(),
}));

const { AccountNotificationPreferenceEntity } = vi.hoisted(() => ({
  AccountNotificationPreferenceEntity: class AccountNotificationPreference {},
}));

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceRead: {
    getRepository: () => ({
      find: findReadMock,
    }),
  },
  AppDataSourceReadWrite: {
    getRepository: () => ({
      create: createMock,
      find: findWriteMock,
      findOne: findOneMock,
      save: saveMock,
    }),
  },
}));

vi.mock('@orm/entities/account/accountNotificationPreference.js', () => ({
  AccountNotificationPreference: AccountNotificationPreferenceEntity,
}));

import { AccountNotificationPreferenceService } from './accountNotificationPreference.js';

const readPreferenceFindWhere = (
  findOptions: unknown
): { account_id: { type: string; value: unknown }; category: string } => {
  if (typeof findOptions !== 'object' || findOptions === null || !('where' in findOptions)) {
    throw new Error('Expected a find options object');
  }
  const where = findOptions.where;
  if (typeof where !== 'object' || where === null) {
    throw new Error('Expected a find where clause');
  }
  if (!('account_id' in where) || !('category' in where) || typeof where.category !== 'string') {
    throw new Error('Expected account_id and category in the where clause');
  }
  const accountId = where.account_id;
  if (
    typeof accountId !== 'object' ||
    accountId === null ||
    !('type' in accountId) ||
    !('value' in accountId) ||
    typeof accountId.type !== 'string'
  ) {
    throw new Error('Expected an In() operator for account_id');
  }
  return {
    account_id: { type: accountId.type, value: accountId.value },
    category: where.category,
  };
};

describe('AccountNotificationPreferenceService', () => {
  beforeEach(() => {
    createMock.mockReset();
    findOneMock.mockReset();
    findReadMock.mockReset();
    findWriteMock.mockReset();
    saveMock.mockReset();
  });

  it('upsert creates a row when category is missing', async () => {
    findOneMock.mockResolvedValue(null);
    createMock.mockImplementation((row) => row);
    saveMock.mockImplementation(async (row) => ({ id: 101, ...row }));

    const service = new AccountNotificationPreferenceService();
    const result = await service.upsert({
      account_id: 77,
      category: NotificationCategoryEnum.NewContent,
      in_app_enabled: true,
      push_enabled: false,
    });

    expect(createMock).toHaveBeenCalledWith({
      account_id: 77,
      category: NotificationCategoryEnum.NewContent,
      in_app_enabled: true,
      push_enabled: false,
    });
    expect(result).toMatchObject({
      id: 101,
      account_id: 77,
      category: NotificationCategoryEnum.NewContent,
    });
  });

  it('seedDefaultsForAccount inserts only missing category rows', async () => {
    findReadMock
      .mockResolvedValueOnce([
        {
          id: 1,
          account_id: 88,
          category: NotificationCategoryEnum.NewContent,
          in_app_enabled: true,
          push_enabled: true,
        },
      ])
      .mockResolvedValueOnce(
        NOTIFICATION_CATEGORY_VALUES.map((category, index) => ({
          account_id: 88,
          category,
          id: index + 1,
          in_app_enabled: DEFAULT_NOTIFICATION_CATEGORY_PREFERENCES[category].in_app_enabled,
          push_enabled: DEFAULT_NOTIFICATION_CATEGORY_PREFERENCES[category].push_enabled,
        }))
      );

    createMock.mockImplementation((row) => row);
    saveMock.mockImplementation(async (rows) => rows);

    const service = new AccountNotificationPreferenceService();
    const seeded = await service.seedDefaultsForAccount(88);

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          account_id: 88,
          category: NotificationCategoryEnum.General,
        }),
      ])
    );
    expect(seeded).toHaveLength(NOTIFICATION_CATEGORY_VALUES.length);
  });

  it('loads one category for many accounts in a single read', async () => {
    const rows = [
      {
        account_id: 1,
        category: NotificationCategoryEnum.Livestream,
        in_app_enabled: true,
        push_enabled: false,
      },
      {
        account_id: 2,
        category: NotificationCategoryEnum.Livestream,
        in_app_enabled: false,
        push_enabled: true,
      },
    ];
    findReadMock.mockResolvedValue(rows);

    const service = new AccountNotificationPreferenceService();
    const result = await service.getForAccountsAndCategory(
      [1, 2],
      NotificationCategoryEnum.Livestream
    );

    expect(findReadMock).toHaveBeenCalledTimes(1);
    const where = readPreferenceFindWhere(findReadMock.mock.calls[0]?.[0]);
    expect(where.category).toBe(NotificationCategoryEnum.Livestream);
    expect(where.account_id.type).toBe('in');
    expect(where.account_id.value).toEqual([1, 2]);
    expect(result).toEqual(rows);
  });

  it('skips the preference read when no account ids are provided', async () => {
    const service = new AccountNotificationPreferenceService();
    const result = await service.getForAccountsAndCategory(
      [],
      NotificationCategoryEnum.NewContent
    );

    expect(result).toEqual([]);
    expect(findReadMock).not.toHaveBeenCalled();
  });
});
