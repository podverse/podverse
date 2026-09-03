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
import { AccountSettingsPlayback } from '@orm/entities/account/accountSettings/accountSettingsPlayback.js';
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
  DEFAULT_MEDIA_TYPE_PREFERENCE,
  ERROR_MESSAGES,
  getSharableStatusIdsForProfileType,
  SharableStatusEnum,
} from '@podverse/helpers';
import { validateEmail, validatePassword, validateUsername } from '@podverse/helpers-validation';

import { BillingPriceCatalogService } from '../billingPriceCatalog.js';
import { AccountCredentialsService } from './accountCredentials.js';
import { AccountMembershipStatusService } from './accountMembershipStatus.js';
import { AccountNotificationPreferenceService } from './accountNotificationPreference.js';
import { AccountProfileService } from './accountProfile.js';
import { AccountResetPasswordService } from './accountResetPassword.js';
import { AccountTermsAcceptanceService } from './accountTermsAcceptance.js';
import { AccountVerificationService } from './accountVerification.js';

type CreateAccountDto = {
  email?: string;
  username?: string;
  password: string;
  locale: string;
  terms_version?: string;
  allow_listen_stats?: boolean;
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
  'account_settings.account_settings_playback',
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
        sharable_status_id: In(sharableStatusIds),
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
        sharable_status_id: In(sharableStatusIds),
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
      sharable_status_id: SharableStatusEnum.Private,
      verified: qaVerified ?? false,
    });
    const account = await this.repositoryReadWrite.save(accountObj);

    await this.ensureAccountSettings(account, {
      alwaysCreate: true,
      locale: dto.locale,
      allow_listen_stats: dto.allow_listen_stats,
    });

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

    if (dto.terms_version !== undefined && dto.terms_version.trim() !== '') {
      const accountTermsAcceptanceService = new AccountTermsAcceptanceService();
      await accountTermsAcceptanceService.upsert(account.id, dto.terms_version);
    }
  }

  async update(account_id: number, dto: UpdateAccountDto): Promise<Account | null> {
    const account = await this.repositoryReadWrite.findOne({
      where: { id: account_id },
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

    account.sharable_status_id = dto.sharable_status;
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

  async updateNotificationsLastReadAt(account_id: number, readAt: Date): Promise<Date> {
    const account = await this.repositoryReadWrite.findOne({
      where: { id: account_id },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    account.notifications_last_read_at = readAt;
    await this.repositoryReadWrite.save(account);

    return readAt;
  }

  private async ensureAccountSettings(
    account: Account,
    params: { alwaysCreate: boolean; locale: string; allow_listen_stats?: boolean }
  ): Promise<void> {
    const accountSettingsRepo = AppDataSourceReadWrite.getRepository(AccountSettings);
    const localeRepo = AppDataSourceReadWrite.getRepository(AccountSettingsLocale);
    const notificationRepo = AppDataSourceReadWrite.getRepository(AccountSettingsNotification);
    const notificationPreferenceService = new AccountNotificationPreferenceService();
    const playbackRepo = AppDataSourceReadWrite.getRepository(AccountSettingsPlayback);

    // If alwaysCreate (used by create), always create new AccountSettings row linked to the account
    if (params.alwaysCreate) {
      // First, create and save AccountSettings
      const accountSettings = new AccountSettings();
      accountSettings.account_id = account.id;
      accountSettings.allow_listen_stats = params.allow_listen_stats ?? true;
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

      // Then create and save the playback settings with the default preferred media type
      const playback = new AccountSettingsPlayback();
      playback.account_settings_id = savedAccountSettings.id;
      playback.preferred_media_type = DEFAULT_MEDIA_TYPE_PREFERENCE;
      await playbackRepo.save(playback);

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

      await notificationPreferenceService.seedDefaultsForAccount(account.id);

      return;
    }

    let existingSettings = account.account_settings;
    if (!existingSettings) {
      // Initialize a missing settings row idempotently; the unique account_id constraint lets
      // concurrent first reads converge on one row without overwriting existing settings.
      await accountSettingsRepo
        .createQueryBuilder()
        .insert()
        .into(AccountSettings)
        .values({
          account_id: account.id,
          allow_listen_stats: params.allow_listen_stats ?? true,
        })
        .orIgnore()
        .execute();

      const ensuredSettings = await accountSettingsRepo.findOne({
        where: { account_id: account.id },
      });
      if (!ensuredSettings) {
        throw new Error('AccountSettings could not be created for account');
      }
      existingSettings = ensuredSettings;
    }

    // Otherwise (used by get) ensure sub-rows exist, create only if missing
    if (!existingSettings.account_settings_locale) {
      await localeRepo
        .createQueryBuilder()
        .insert()
        .into(AccountSettingsLocale)
        .values({
          account_settings_id: existingSettings.id,
          locale: params.locale,
        })
        .orIgnore()
        .execute();
    }

    if (!existingSettings.account_settings_playback) {
      // Idempotent insert: concurrent get() calls for an account that predates
      // the playback table can race here. ON CONFLICT DO NOTHING avoids the
      // unique-constraint crash and never overwrites an existing preference.
      await playbackRepo
        .createQueryBuilder()
        .insert()
        .into(AccountSettingsPlayback)
        .values({
          account_settings_id: existingSettings.id,
          preferred_media_type: DEFAULT_MEDIA_TYPE_PREFERENCE,
        })
        .orIgnore()
        .execute();
    }

    if (!existingSettings.account_settings_notification) {
      await notificationRepo
        .createQueryBuilder()
        .insert()
        .into(AccountSettingsNotification)
        .values({ account_settings_id: existingSettings.id })
        .orIgnore()
        .execute();
    }

    const notification = await notificationRepo.findOne({
      where: { account_settings_id: existingSettings.id },
      relations: { account_settings_notification_types: true },
    });
    if (!notification) {
      throw new Error('AccountSettingsNotification could not be created for account');
    }

    if (
      !notification.account_settings_notification_types ||
      notification.account_settings_notification_types.length === 0
    ) {
      // add default types if missing
      const notificationTypeRepo = AppDataSourceReadWrite.getRepository(
        AccountSettingsNotificationType
      );
      await notificationTypeRepo
        .createQueryBuilder()
        .insert()
        .into(AccountSettingsNotificationType)
        .values([
          {
            account_settings_notification_id: notification.id,
            type: AccountNotificationTypeEnum.NewItem,
          },
          {
            account_settings_notification_id: notification.id,
            type: AccountNotificationTypeEnum.LivestreamStarting,
          },
        ])
        .orIgnore()
        .execute();
    }

    await notificationPreferenceService.seedDefaultsForAccount(account.id);
  }
}
