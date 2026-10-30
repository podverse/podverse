import { AppDataSourceRead } from '@orm/db/index.js';
import { StatsPopularityAccount } from '@orm/entities/stats/statsPopularityAccount.js';
import type { FindManyOptions } from 'typeorm';
import { In, IsNull, MoreThan, Not } from 'typeorm';

import type { StatsPopularityCountField } from '@podverse/helpers';
import { getSharableStatusIdsForProfileType } from '@podverse/helpers';

/**
 * Reads the range totals behind public Top lists. Rows are rebuilt from counted events and daily
 * totals by the popularity refresh job; see `docs/features/POPULARITY-AND-TASTE-PROFILE.md`.
 */
export class StatsPopularityAccountService {
  private repositoryRead = AppDataSourceRead.getRepository(StatsPopularityAccount);

  private mergeWhere(profileWhere: object | undefined, configWhere: object | undefined) {
    return { ...(profileWhere || {}), ...(configWhere || {}) };
  }

  async getMany(
    config: FindManyOptions<StatsPopularityAccount>,
    profileType: 'global' | 'subscribed',
    minCountField: StatsPopularityCountField
  ): Promise<StatsPopularityAccount[]> {
    const sharableStatusIds = getSharableStatusIdsForProfileType(profileType);
    const profileWhere = {
      [minCountField]: MoreThan(0),
      account: {
        sharable_status: { id: In(sharableStatusIds) },
        account_profile: {
          display_name: Not(IsNull()),
        },
      },
    };
    return this.repositoryRead.find({
      ...config,
      where: this.mergeWhere(profileWhere, config.where),
    });
  }

  async getManyByAccountsAndCount(
    account_ids: number[],
    config: FindManyOptions<StatsPopularityAccount>,
    profileType: 'global' | 'subscribed'
  ): Promise<[StatsPopularityAccount[], number]> {
    const sharableStatusIds = getSharableStatusIdsForProfileType(profileType);
    const profileWhere = {
      account_id: In(account_ids),
      account: {
        sharable_status: { id: In(sharableStatusIds) },
        account_profile: {
          display_name: Not(IsNull()),
        },
      },
    };
    return this.repositoryRead.findAndCount({
      ...config,
      where: this.mergeWhere(profileWhere, config.where),
    });
  }
}
