import { randomUUID } from 'node:crypto';

import { getDefaultLocale } from '@orm/config/index.js';
import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { Account } from '@orm/entities/account/account.js';
import { AccountMetaboost } from '@orm/entities/account/accountMetaboost.js';
import { AccountProfile } from '@orm/entities/account/accountProfile.js';
import { AccountSettings } from '@orm/entities/account/accountSettings/accountSettings.js';
import { AccountSettingsLocale } from '@orm/entities/account/accountSettings/accountSettingsLocale.js';
import { AccountSettingsNotification } from '@orm/entities/account/accountSettings/accountSettingsNotification.js';
import { AccountSettingsNotificationType } from '@orm/entities/account/accountSettings/accountSettingsNotificationType.js';
import { SharableStatus } from '@orm/entities/sharableStatus.js';
import {
  findOptionsRelationsFromPaths,
  mergeFindOptionsRelations,
} from '@orm/lib/findOptionsRelationsFromPaths.js';
import { hashPassword } from '@orm/lib/password.js';
import type { FindManyOptions, FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { In, IsNull, Not } from 'typeorm';

import {
  AccountMembershipEnum,
  AccountNotificationTypeEnum,
  ERROR_MESSAGES,
  getSharableStatusIdsForProfileType,
  SharableStatusEnum,
} from '@podverse/helpers';
import { validateEmail, validatePassword, validateUsername } from '@podverse/helpers-validation';

import { BillingPriceCatalogService } from '../billingPriceCatalog.js';
import { AccountCredentialsService } from './accountCredentials.js';
import { AccountMembershipStatusService } from './accountMembershipStatus.js';
import { AccountProfileService } from './accountProfile.js';
import { AccountResetPasswordService } from './accountResetPassword.js';
import { AccountVerificationService } from './accountVerification.js';

type CreateAccountDto = {
  email?: string;
  username?: string;
  password: string;
  locale: string;
};

type UpdateAccountDto = {
  display_name: string | null;
  bio: string | null;
  sharable_status: SharableStatusEnum;
  locale: string;
};

const requiredRelations: FindOptionsRelations<Account> = findOptionsRelationsFromPaths([
  'account_settings',
  'account_settings.account_settings_locale',
  'account_settings.account_settings_notification',
  'account_settings.account_settings_notification.account_settings_notification_types',
]);

export class AccountService {
  protected repositoryRead: Repository<Account>;
  protected repositoryReadWrite: Repository<Account>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(Account);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(Account);
  }

  async get(id: number, config?: FindOneOptions<Account>): Promise<Account | null> {
    if (!id) {
      return null;
    }

    const mergedRelations = mergeFindOptionsRelations(requiredRelations, config?.relations);

    const account = await this.repositoryRead.findOne({
      ...(config || {}),
      where: { id },
      relations: mergedRelations,
    });
    if (!account) {
      return null;
    }

    await this.ensureAccountSettings(account, { alwaysCreate: false, locale: getDefaultLocale() });

    return this.repositoryRead.findOne({ where: { id }, relations: mergedRelations });
  }

  async getByEmail(email: string, config?: FindOneOptions<Account>): Promise<Account | null> {
    const accountCredentialsService = new AccountCredentialsService();
    const accountCredentials = await accountCredentialsService.getByEmail(email);
    if (!accountCredentials) {
      return null;
    }

    return this.get(accountCredentials.account_id, config);
  }

  async getByUsername(username: string, config?: FindOneOptions<Account>): Promise<Account | null> {
    const accountCredentialsService = new AccountCredentialsService();
    const accountCredentials = await accountCredentialsService.getByUsername(username);
    if (!accountCredentials) {
      return null;
    }

    return this.get(accountCredentials.account_id, config);
  }

  async getByIdText(id_text: string, config?: FindOneOptions<Account>): Promise<Account | null> {
    if (!id_text) {
      return null;
    }
    return this.repositoryRead.findOne({ where: { id_text }, ...config });
  }

  async getMany(config: FindManyOptions<Account>): Promise<Account[]> {
    return this.repositoryRead.find(config);
  }

  async getManyPublic(config: FindManyOptions<Account>): Promise<Account[]> {
    const sharableStatusIds = getSharableStatusIdsForProfileType('global');
    return this.repositoryRead.find({
      ...config,
      where: {
        ...config.where,
        sharable_status: { id: In(sharableStatusIds) },
        account_profile: {
          display_name: Not(IsNull()),
        },
      },
    });
  }

  async getManySubscribed(
    accountIds: number[],
    config: FindManyOptions<Account>
  ): Promise<Account[]> {
    if (accountIds.length === 0) {
      return [];
    }

    const sharableStatusIds = getSharableStatusIdsForProfileType('subscribed');
    return this.repositoryRead.find({
      ...config,
      where: {
        ...config.where,
        id: In(accountIds),
        sharable_status: { id: In(sharableStatusIds) },
        account_profile: {
          display_name: Not(IsNull()),
        },
      },
    });
  }

  async create(dto: CreateAccountDto, qaVerified?: boolean) {
    if (!dto.email && !dto.username) {
      throw new Error('At least one of email or username is required');
    }

    if (dto.email && !validateEmail(dto.email)) {
      throw new Error('Invalid email');
    }

    if (dto.username && !validateUsername(dto.username)) {
      throw new Error('Invalid username');
    }

    if (!validatePassword(dto.password)) {
      throw new Error('Invalid password');
    }

    const sharableStatusRepository = AppDataSourceRead.getRepository(SharableStatus);
    const sharableStatus = await sharableStatusRepository.findOne({
      where: { id: SharableStatusEnum.Private },
    });
    if (!sharableStatus) {
      throw new Error('SharableStatus not found');
    }

    const accountCredentialsService = new AccountCredentialsService();

    if (dto.email) {
      const existingByEmail = await accountCredentialsService.getByEmail(dto.email);
      if (existingByEmail) {
        throw new Error(ERROR_MESSAGES.ACCOUNT.ALREADY_EXISTS);
      }
    }

    if (dto.username) {
      const existingByUsername = await accountCredentialsService.getByUsername(dto.username);
      if (existingByUsername) {
        throw new Error(ERROR_MESSAGES.ACCOUNT.ALREADY_EXISTS);
      }
    }

    const accountObj = this.repositoryReadWrite.create({
      sharable_status: sharableStatus,
      verified: qaVerified ?? false,
    });
    const account = await this.repositoryReadWrite.save(accountObj);

    await this.ensureAccountSettings(account, { alwaysCreate: true, locale: dto.locale });

    // Create account_profile row with null display_name and bio
    const accountProfileRepo = AppDataSourceReadWrite.getRepository(AccountProfile);
    const accountProfile = new AccountProfile();
    accountProfile.account = account;
    accountProfile.display_name = null;
    accountProfile.bio = null;
    await accountProfileRepo.save(accountProfile);

    const saltedPassword = await hashPassword(dto.password);

    await accountCredentialsService.update(account, {
      email: dto.email ?? null,
      username: dto.username ?? null,
      password: saltedPassword,
    });

    const billingPriceCatalogService = new BillingPriceCatalogService();
    const resolvedMembership = await billingPriceCatalogService.resolveProductMembership();
    const now = new Date();

    const accountMembershipStatusService = new AccountMembershipStatusService();
    const membership_expires_at = new Date(
      now.getTime() + resolvedMembership.freeTrialExpirationSeconds * 1000
    );
    await accountMembershipStatusService.update(account, {
      account_membership_id: AccountMembershipEnum.Trial,
      membership_expires_at,
    });

    const accountMetaboostRepo = AppDataSourceReadWrite.getRepository(AccountMetaboost);
    const accountMetaboost = accountMetaboostRepo.create({
      account,
      sender_guid: randomUUID(),
    });
    await accountMetaboostRepo.save(accountMetaboost);
  }

  async update(account_id: number, dto: UpdateAccountDto): Promise<Account | null> {
    const account = await this.repositoryReadWrite.findOne({
      where: { id: account_id },
      relations: {
        sharable_status: true,
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    // Always update account profile
    const accountProfileService = new AccountProfileService();
    const accountProfileDto = {
      display_name: dto.display_name,
      bio: dto.bio,
    };
    await accountProfileService.update(account, accountProfileDto);

    // Always update sharable status
    const sharableStatusRepository = AppDataSourceRead.getRepository(SharableStatus);
    const sharableStatus = await sharableStatusRepository.findOne({
      where: { id: dto.sharable_status },
    });
    if (!sharableStatus) {
      throw new Error('SharableStatus not found');
    }
    account.sharable_status = sharableStatus;
    await this.repositoryReadWrite.save(account);

    // Always update locale
    const accountSettings = await AppDataSourceReadWrite.getRepository(AccountSettings).findOne({
      where: { account_id },
      relations: {
        account_settings_locale: true,
      },
    });

    if (accountSettings?.account_settings_locale) {
      const localeRepo = AppDataSourceReadWrite.getRepository(AccountSettingsLocale);
      accountSettings.account_settings_locale.locale = dto.locale;
      await localeRepo.save(accountSettings.account_settings_locale);
    }

    return this.repositoryReadWrite.findOne({
      where: { id: account_id },
      relations: {
        account_profile: true,
        sharable_status: true,
      },
    });
  }

  async verifyEmail(id: number): Promise<void> {
    const account = await this.repositoryReadWrite.findOne({ where: { id } });

    if (!account) {
      throw new Error('Account not found');
    }

    account.verified = true;
    await this.repositoryReadWrite.save(account);

    const accountVerificationService = new AccountVerificationService();
    await accountVerificationService.deleteByAccountId(id);
  }

  async resetPassword(accountId: number, newPassword: string): Promise<void> {
    const account = await this.repositoryReadWrite.findOne({ where: { id: accountId } });

    if (!account) {
      throw new Error('Account not found');
    }

    const saltedPassword = await hashPassword(newPassword);

    const accountCredentialsService = new AccountCredentialsService();
    await accountCredentialsService.update(account, {
      password: saltedPassword,
    });

    const accountResetPasswordService = new AccountResetPasswordService();
    await accountResetPasswordService.deleteByAccountId(account.id);
  }

  async delete(accountId: number): Promise<void> {
    const account = await this.repositoryReadWrite.findOne({ where: { id: accountId } });

    if (!account) {
      throw new Error('Account not found');
    }

    await this.repositoryReadWrite.remove(account);
  }

  private async ensureAccountSettings(
    account: Account,
    params: { alwaysCreate: boolean; locale: string }
  ): Promise<void> {
    const accountSettingsRepo = AppDataSourceReadWrite.getRepository(AccountSettings);
    const localeRepo = AppDataSourceReadWrite.getRepository(AccountSettingsLocale);
    const notificationRepo = AppDataSourceReadWrite.getRepository(AccountSettingsNotification);

    // If alwaysCreate (used by create), always create new AccountSettings row linked to the account
    if (params.alwaysCreate || !account.account_settings) {
      // First, create and save AccountSettings
      const accountSettings = new AccountSettings();
      accountSettings.account_id = account.id;
      const savedAccountSettings = await accountSettingsRepo.save(accountSettings);

      // Then create and save the locale with the proper foreign key
      const locale = new AccountSettingsLocale();
      locale.account_settings_id = savedAccountSettings.id;
      locale.locale = params.locale;
      await localeRepo.save(locale);

      // Then create and save the notification with the proper foreign key
      const notification = new AccountSettingsNotification();
      notification.account_settings_id = savedAccountSettings.id;
      await notificationRepo.save(notification);

      // Finally, create and save the notification types
      const t1 = new AccountSettingsNotificationType();
      t1.account_settings_notification_id = notification.id;
      t1.type = AccountNotificationTypeEnum.NewItem;
      const t2 = new AccountSettingsNotificationType();
      t2.account_settings_notification_id = notification.id;
      t2.type = AccountNotificationTypeEnum.LivestreamStarting;

      const notificationTypeRepo = AppDataSourceReadWrite.getRepository(
        AccountSettingsNotificationType
      );
      await notificationTypeRepo.save([t1, t2]);

      return;
    }

    // Otherwise (used by get) ensure sub-rows exist, create only if missing
    const existingSettings = account.account_settings;

    if (!existingSettings.account_settings_locale) {
      const locale = new AccountSettingsLocale();
      locale.account_settings_id = existingSettings.id;
      locale.locale = params.locale;
      await localeRepo.save(locale);
    }

    if (!existingSettings.account_settings_notification) {
      const notification = new AccountSettingsNotification();
      notification.account_settings_id = existingSettings.id;
      const t1 = new AccountSettingsNotificationType();
      t1.type = AccountNotificationTypeEnum.NewItem;
      const t2 = new AccountSettingsNotificationType();
      t2.type = AccountNotificationTypeEnum.LivestreamStarting;
      notification.account_settings_notification_types = [t1, t2];
      await notificationRepo.save(notification);
    } else if (
      !existingSettings.account_settings_notification.account_settings_notification_types ||
      existingSettings.account_settings_notification.account_settings_notification_types.length ===
        0
    ) {
      // add default types if missing
      const notification = existingSettings.account_settings_notification;
      const t1 = new AccountSettingsNotificationType();
      t1.type = AccountNotificationTypeEnum.NewItem;
      const t2 = new AccountSettingsNotificationType();
      t2.type = AccountNotificationTypeEnum.LivestreamStarting;
      notification.account_settings_notification_types = [t1, t2];
      await notificationRepo.save(notification);
    }
  }
}
