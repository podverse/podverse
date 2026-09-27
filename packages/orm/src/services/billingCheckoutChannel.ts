import { getDataSourceRead } from '@orm/context.js';
import { BillingCheckoutChannel } from '@orm/entities/billingCheckoutChannel.js';
import type { DataSource } from 'typeorm';

import type { BillingPlatform } from '@podverse/helpers';

type BillingCheckoutChannelServiceParams = {
  dataSourceRead?: DataSource;
};

type ListEnabledCheckoutChannelsParams = {
  platform: BillingPlatform;
  storefront?: string | null;
};

export class BillingCheckoutChannelService {
  private dataSourceRead: DataSource;

  constructor(params?: BillingCheckoutChannelServiceParams) {
    this.dataSourceRead = params?.dataSourceRead ?? getDataSourceRead();
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
}

export type { ListEnabledCheckoutChannelsParams };
