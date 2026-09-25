import { AccountDeviceAutoDownloadChannel } from '@orm/entities/account/accountDeviceAutoDownloadChannel.js';
import { AccountService } from '@orm/services/account/account.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import { ChannelService } from '@orm/services/channel/channel.js';
import { In } from 'typeorm';

import { hasValidMembership } from '@podverse/helpers';

/**
 * Device registration of channels that should receive silent-push wakes for auto download.
 * Replaced wholesale per installation so the phone remains the source of truth.
 */
export class AccountDeviceAutoDownloadChannelService extends BaseManyService<
  AccountDeviceAutoDownloadChannel,
  'account'
> {
  private accountService = new AccountService();
  private channelService = new ChannelService();

  constructor() {
    super(AccountDeviceAutoDownloadChannel, 'account');
  }

  /**
   * Replace every channel registration for this installation with `channel_id_texts`.
   * Unknown or unavailable channels are skipped rather than failing the whole replace.
   */
  async replaceForInstallation(
    account_id: number,
    installation_id: string,
    channel_id_texts: readonly string[]
  ): Promise<{ channel_id_texts: string[] }> {
    const account = await this.accountService.get(account_id, {
      relations: {
        account_membership_status: true,
      },
    });
    if (!account) {
      throw new Error('Account not found.');
    }
    if (!hasValidMembership(account.account_membership_status)) {
      throw new Error('Membership required.');
    }

    const uniqueTexts = [...new Set(channel_id_texts.filter((text) => text.trim().length > 0))];
    const channels =
      uniqueTexts.length === 0 ? [] : await this.channelService.getManyByIdTexts(uniqueTexts);

    const channelIds = channels.map((channel) => channel.id);
    const resolvedTexts = channels.map((channel) => channel.id_text);

    await this.repositoryReadWrite.manager.transaction(async (manager) => {
      const repo = manager.getRepository(AccountDeviceAutoDownloadChannel);
      await repo.delete({ account_id, installation_id });
      if (channelIds.length === 0) {
        return;
      }
      await repo.insert(
        channelIds.map((channel_id) => ({
          account_id,
          channel_id,
          installation_id,
        }))
      );
    });

    return { channel_id_texts: resolvedTexts };
  }

  async clearForInstallation(account_id: number, installation_id: string): Promise<void> {
    await this.repositoryReadWrite.delete({ account_id, installation_id });
  }

  /**
   * FCM devices registered for auto download on this channel, for accounts that still hold a
   * valid membership.
   */
  async getFcmDevicesForChannel(channel_id: number): Promise<
    Array<{
      account_id: number;
      fcm_token: string;
      installation_id: string;
      platform: string;
    }>
  > {
    const rows = await this.repositoryRead
      .createQueryBuilder('reg')
      .innerJoin(
        'account_fcm_device',
        'fcm',
        'fcm.account_id = reg.account_id AND fcm.installation_id = reg.installation_id'
      )
      .innerJoin('account_membership_status', 'status', 'status.account_id = reg.account_id')
      .where('reg.channel_id = :channel_id', { channel_id })
      .andWhere('status.membership_expires_at IS NOT NULL')
      .andWhere('status.membership_expires_at >= NOW()')
      .select([
        'reg.account_id AS account_id',
        'fcm.fcm_token AS fcm_token',
        'fcm.installation_id AS installation_id',
        'fcm.platform AS platform',
      ])
      .getRawMany<{
        account_id: number;
        fcm_token: string;
        installation_id: string;
        platform: string;
      }>();

    return rows;
  }

  /**
   * UnifiedPush endpoints for accounts that have any auto-download registration on this channel
   * and still hold a valid membership. UP is account-scoped (one endpoint per account).
   */
  async getUpDevicesForChannel(channel_id: number): Promise<
    Array<{
      account_id: number;
      up_auth_key: string | null;
      up_endpoint: string;
    }>
  > {
    const rows = await this.repositoryRead
      .createQueryBuilder('reg')
      .innerJoin('account_up_device', 'up', 'up.account_id = reg.account_id')
      .innerJoin('account_membership_status', 'status', 'status.account_id = reg.account_id')
      .where('reg.channel_id = :channel_id', { channel_id })
      .andWhere('status.membership_expires_at IS NOT NULL')
      .andWhere('status.membership_expires_at >= NOW()')
      .distinct(true)
      .select([
        'reg.account_id AS account_id',
        'up.up_endpoint AS up_endpoint',
        'up.up_auth_key AS up_auth_key',
      ])
      .getRawMany<{
        account_id: number;
        up_auth_key: string | null;
        up_endpoint: string;
      }>();

    return rows;
  }

  async listChannelIdTextsForInstallation(
    account_id: number,
    installation_id: string
  ): Promise<string[]> {
    const rows = await this.repositoryRead.find({
      where: { account_id, installation_id },
      relations: { channel: true },
    });
    return rows
      .map((row) => row.channel?.id_text)
      .filter((text): text is string => typeof text === 'string' && text.length > 0);
  }

  async deleteByChannelIds(channelIds: number[]): Promise<void> {
    if (channelIds.length === 0) {
      return;
    }
    await this.repositoryReadWrite.delete({ channel_id: In(channelIds) });
  }
}
