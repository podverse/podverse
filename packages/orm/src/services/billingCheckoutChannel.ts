import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { BillingCheckoutChannel } from '@orm/entities/billingCheckoutChannel.js';
import type { DataSource } from 'typeorm';

import type { BillingPlatform } from '@podverse/helpers';

type BillingCheckoutChannelServiceParams = {
  dataSourceRead?: DataSource;
  dataSourceReadWrite?: DataSource;
};

type UpdateBillingCheckoutChannelParams = {
  enabled?: boolean;
  minClientVersion?: string | null;
  storefrontAllowlist?: string[];
};

type ListEnabledCheckoutChannelsParams = {
  platform: BillingPlatform;
  storefront?: string | null;
};

export class BillingCheckoutChannelService {
  private dataSourceRead: DataSource;
  private dataSourceReadWrite: DataSource;

  constructor(params?: BillingCheckoutChannelServiceParams) {
    this.dataSourceRead = params?.dataSourceRead ?? getDataSourceRead();
    this.dataSourceReadWrite = params?.dataSourceReadWrite ?? getDataSourceReadWrite();
  }

  async listAll(): Promise<BillingCheckoutChannel[]> {
    return this.dataSourceRead.getRepository(BillingCheckoutChannel).find({
      order: { processor_id: 'ASC', platform: 'ASC' },
    });
  }

  async getById(id: number): Promise<BillingCheckoutChannel | null> {
    return this.dataSourceRead.getRepository(BillingCheckoutChannel).findOne({ where: { id } });
  }

  /** Null when no channel has this id. Omitted fields keep their stored value. */
  async updateById(
    id: number,
    params: UpdateBillingCheckoutChannelParams
  ): Promise<BillingCheckoutChannel | null> {
    const repository = this.dataSourceReadWrite.getRepository(BillingCheckoutChannel);
    const channel = await repository.findOne({ where: { id } });
    if (channel === null) {
      return null;
    }
    if (params.enabled !== undefined) {
      channel.enabled = params.enabled;
    }
    if (params.minClientVersion !== undefined) {
      channel.min_client_version = params.minClientVersion;
    }
    if (params.storefrontAllowlist !== undefined) {
      channel.storefront_allowlist = params.storefrontAllowlist;
    }
    return repository.save(channel);
  }

  async listEnabledChannels(
    params: ListEnabledCheckoutChannelsParams
  ): Promise<BillingCheckoutChannel[]> {
    const normalizedStorefront = params.storefront?.trim().toUpperCase() ?? null;
    const queryBuilder = this.dataSourceRead
      .getRepository(BillingCheckoutChannel)
      .createQueryBuilder('channel')
      .innerJoin('channel.billing_processor', 'processor')
      .where('channel.platform = :platform', { platform: params.platform })
      .andWhere('channel.enabled = true')
      .andWhere('processor.is_active = true');

    if (normalizedStorefront !== null && normalizedStorefront !== '') {
      queryBuilder.andWhere(
        '(cardinality(channel.storefront_allowlist) = 0 OR :storefront = ANY(channel.storefront_allowlist))',
        {
          storefront: normalizedStorefront,
        }
      );
    }

    return queryBuilder.orderBy('channel.id', 'ASC').getMany();
  }

  /** The channel row whether or not it is enabled; purchase routes read its client version floor. */
  async getChannel(
    processorId: string,
    platform: BillingPlatform
  ): Promise<BillingCheckoutChannel | null> {
    return this.dataSourceRead.getRepository(BillingCheckoutChannel).findOne({
      where: { processor_id: processorId, platform },
    });
  }
}

export type { ListEnabledCheckoutChannelsParams, UpdateBillingCheckoutChannelParams };
