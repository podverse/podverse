import { getSharableStatusIdsForProfileType } from '@podverse/helpers';
import { FindManyOptions, In, Not, IsNull } from 'typeorm';
import { StatsAggregatedAccount } from '@orm/entities/stats/statsAggregatedAccount';
import { StatsTrackEventAccountService } from './statsTrackEventAccount';
import { BaseStatsAggregatedService, UpdateHistoricalOptions } from './baseStatsAggregated';

export class StatsAggregatedAccountService extends BaseStatsAggregatedService<StatsAggregatedAccount, number> {
  private statsTrackEventAccountService: StatsTrackEventAccountService;

  constructor() {
    super(StatsAggregatedAccount);
    this.statsTrackEventAccountService = new StatsTrackEventAccountService();
  }

  protected getIdFieldName(): string {
    return 'tracked_account_id';
  }

  private mergeWhere(profileWhere: object | undefined, configWhere: object | undefined) {
    return { ...(profileWhere || {}), ...(configWhere || {}) };
  }

  async getMany(
    config: FindManyOptions<StatsAggregatedAccount>,
    profileType: 'global' | 'subscribed',
  ): Promise<StatsAggregatedAccount[]> {
    const sharableStatusIds = getSharableStatusIdsForProfileType(profileType);
    const profileWhere = {
      tracked_account: {
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
    config: FindManyOptions<StatsAggregatedAccount>,
    profileType: 'global' | 'subscribed',
  ): Promise<[StatsAggregatedAccount[], number]> {
    const sharableStatusIds = getSharableStatusIdsForProfileType(profileType);
    const profileWhere = {
      tracked_account_id: In(account_ids),
      tracked_account: {
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

  async updateAggregatedStats(account_id: number, updateAllTime: boolean = false): Promise<void> {
    await this._updateAggregatedStats(account_id, this.statsTrackEventAccountService, updateAllTime);
  }

  async updateAggregatedStatsRolling(account_id: number, updateHistoricalOptions: UpdateHistoricalOptions): Promise<void> {
    await this._updateAggregatedStatsRolling(account_id, this.statsTrackEventAccountService, updateHistoricalOptions);
  }
}