import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { AccountNotificationPreference } from '@orm/entities/account/accountNotificationPreference.js';
import type { FindOptionsWhere, Repository } from 'typeorm';

import type { NotificationCategoryValues } from '@podverse/helpers';
import {
  DEFAULT_NOTIFICATION_CATEGORY_PREFERENCES,
  NOTIFICATION_CATEGORY_VALUES,
} from '@podverse/helpers';

type UpsertAccountNotificationPreferenceDto = {
  account_id: number;
  category: NotificationCategoryValues;
  in_app_enabled: boolean;
  push_enabled: boolean;
};

export class AccountNotificationPreferenceService {
  protected repositoryRead: Repository<AccountNotificationPreference>;
  protected repositoryReadWrite: Repository<AccountNotificationPreference>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(AccountNotificationPreference);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(AccountNotificationPreference);
  }

  async getForAccount(account_id: number): Promise<AccountNotificationPreference[]> {
    const rows = await this.repositoryRead.find({
      order: {
        category: 'ASC',
      },
      where: {
        account_id,
      },
    });

    return rows;
  }

  async upsert(
    dto: UpsertAccountNotificationPreferenceDto
  ): Promise<AccountNotificationPreference> {
    const existing = await this.repositoryReadWrite.findOne({
      where: {
        account_id: dto.account_id,
        category: dto.category,
      },
    });

    if (!existing) {
      const row = this.repositoryReadWrite.create({
        account_id: dto.account_id,
        category: dto.category,
        in_app_enabled: dto.in_app_enabled,
        push_enabled: dto.push_enabled,
      });
      return this.repositoryReadWrite.save(row);
    }

    existing.in_app_enabled = dto.in_app_enabled;
    existing.push_enabled = dto.push_enabled;
    return this.repositoryReadWrite.save(existing);
  }

  async seedDefaultsForAccount(account_id: number): Promise<AccountNotificationPreference[]> {
    const existingRows = await this.repositoryRead.find({
      where: {
        account_id,
      },
    });
    const existingByCategory = new Map<NotificationCategoryValues, AccountNotificationPreference>(
      existingRows.map((row) => [row.category, row])
    );

    const rowsToCreate = NOTIFICATION_CATEGORY_VALUES.flatMap((category) => {
      const existingRow = existingByCategory.get(category);
      if (existingRow !== undefined) {
        return [];
      }

      const defaults = DEFAULT_NOTIFICATION_CATEGORY_PREFERENCES[category];
      const newRow = this.repositoryReadWrite.create({
        account_id,
        category,
        in_app_enabled: defaults.in_app_enabled,
        push_enabled: defaults.push_enabled,
      });
      return [newRow];
    });

    if (rowsToCreate.length > 0) {
      await this.repositoryReadWrite.save(rowsToCreate);
    }

    const where: FindOptionsWhere<AccountNotificationPreference> = {
      account_id,
    };
    const seededRows = await this.repositoryRead.find({ where });

    return seededRows.sort(
      (a, b) =>
        NOTIFICATION_CATEGORY_VALUES.indexOf(a.category) -
        NOTIFICATION_CATEGORY_VALUES.indexOf(b.category)
    );
  }
}
