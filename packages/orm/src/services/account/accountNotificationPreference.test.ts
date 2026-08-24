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
});
