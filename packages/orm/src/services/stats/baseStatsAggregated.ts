import { Repository, ObjectLiteral, FindOptionsWhere, EntityTarget } from 'typeorm';
import { TIME_CONSTANTS } from '@podverse/helpers';
import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db';

export type UpdateHistoricalOptions = {
  daily: boolean;
  weekly: boolean;
  monthly: boolean;
};

interface BaseAggregatedStats extends ObjectLiteral {
  id: number;
  day_current_count: number;
  day_1_count?: number;
  day_2_count?: number;
  day_3_count?: number;
  day_4_count?: number;
  day_5_count?: number;
  day_6_count?: number;
  day_7_count?: number;
  day_8_count?: number;
  week_current_count: number;
  week_1_count?: number;
  week_2_count?: number;
  week_3_count?: number;
  week_4_count?: number;
  month_current_count: number;
  month_1_count?: number;
  all_time_count?: number;
}

export const STATS_AGGREGATED_SELECT_ALL = {
  id: true,
  day_current_count: true,
  day_1_count: true,
  day_2_count: true,
  day_3_count: true,
  day_4_count: true,
  day_5_count: true,
  day_6_count: true,
  day_7_count: true,
  day_8_count: true,
  week_current_count: true,
  week_1_count: true,
  week_2_count: true,
  week_3_count: true,
  week_4_count: true,
  month_current_count: true,
  month_1_count: true,
  all_time_count: true,
};

export abstract class BaseStatsAggregatedService<T extends BaseAggregatedStats, ID> {
  protected repositoryRead: Repository<T>;
  protected repositoryReadWrite: Repository<T>;

  constructor(entity: EntityTarget<T>) {
    this.repositoryRead = AppDataSourceRead.getRepository(entity);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(entity);
  }

  protected abstract getIdFieldName(): string;

  async _updateAggregatedStats(
    entity_id: ID,
    statsTrackEventService: any,
    updateAllTime: boolean = false
  ): Promise<void> {
    const eventCountDay = await statsTrackEventService._getCountWithinTimeFrame(
      entity_id,
      TIME_CONSTANTS.ONE_DAY_IN_MINUTES
    );
    const eventCountWeek = await statsTrackEventService._getCountWithinTimeFrame(
      entity_id,
      TIME_CONSTANTS.ONE_WEEK_IN_MINUTES
    );
    const eventCountMonth = await statsTrackEventService._getCountWithinTimeFrame(
      entity_id,
      TIME_CONSTANTS.ONE_MONTH_IN_MINUTES
    );

    const idFieldName = this.getIdFieldName();
    let aggregatedStats = await this.repositoryRead.findOne({
      where: { [idFieldName]: entity_id } as FindOptionsWhere<T>,
    });

    if (!aggregatedStats) {
      aggregatedStats = this.repositoryReadWrite.create({ [idFieldName]: entity_id } as T);
    }

    aggregatedStats.day_current_count = eventCountDay ?? 0;
    aggregatedStats.week_current_count = eventCountWeek ?? 0;
    aggregatedStats.month_current_count = eventCountMonth ?? 0;

    if (updateAllTime) {
      aggregatedStats.all_time_count =
        (aggregatedStats.all_time_count ?? 0) + (aggregatedStats.day_current_count ?? 0);
    }

    await this.repositoryReadWrite.save(aggregatedStats);
  }

  async _updateAggregatedStatsRolling(
    entity_id: ID,
    statsTrackEventService: any,
    updateHistoricalOptions: UpdateHistoricalOptions
  ): Promise<void> {
    const eventCount = await statsTrackEventService._getCountWithinTimeFrame(
      entity_id,
      TIME_CONSTANTS.ONE_DAY_IN_MINUTES
    );

    const idFieldName = this.getIdFieldName();
    let aggregatedStats = await this.repositoryRead.findOne({
      where: { [idFieldName]: entity_id } as FindOptionsWhere<T>,
    });

    if (!aggregatedStats) {
      aggregatedStats = this.repositoryReadWrite.create({ [idFieldName]: entity_id } as T);
    }

    aggregatedStats.day_current_count = eventCount ?? 0;

    if (
      updateHistoricalOptions.daily ||
      updateHistoricalOptions.weekly ||
      updateHistoricalOptions.monthly
    ) {
      aggregatedStats.day_8_count = aggregatedStats.day_7_count ?? 0;
      aggregatedStats.day_7_count = aggregatedStats.day_6_count ?? 0;
      aggregatedStats.day_6_count = aggregatedStats.day_5_count ?? 0;
      aggregatedStats.day_5_count = aggregatedStats.day_4_count ?? 0;
      aggregatedStats.day_4_count = aggregatedStats.day_3_count ?? 0;
      aggregatedStats.day_3_count = aggregatedStats.day_2_count ?? 0;
      aggregatedStats.day_2_count = aggregatedStats.day_1_count ?? 0;
      aggregatedStats.day_1_count = aggregatedStats.day_current_count ?? 0;

      aggregatedStats.all_time_count =
        (aggregatedStats.all_time_count ?? 0) + (aggregatedStats.day_current_count ?? 0);
    }

    if (updateHistoricalOptions.weekly || updateHistoricalOptions.monthly) {
      aggregatedStats.week_4_count = aggregatedStats.week_3_count ?? 0;
      aggregatedStats.week_3_count = aggregatedStats.week_2_count ?? 0;
      aggregatedStats.week_2_count = aggregatedStats.week_1_count ?? 0;
      aggregatedStats.week_1_count = aggregatedStats.week_current_count ?? 0;
    }

    if (updateHistoricalOptions.monthly) {
      aggregatedStats.month_1_count = aggregatedStats.month_current_count ?? 0;
    }

    aggregatedStats.week_current_count =
      !aggregatedStats.day_1_count &&
      !aggregatedStats.day_2_count &&
      !aggregatedStats.day_3_count &&
      !aggregatedStats.day_4_count &&
      !aggregatedStats.day_5_count &&
      !aggregatedStats.day_6_count &&
      !aggregatedStats.day_7_count
        ? aggregatedStats.day_current_count
        : (aggregatedStats.day_1_count ?? 0) +
          (aggregatedStats.day_2_count ?? 0) +
          (aggregatedStats.day_3_count ?? 0) +
          (aggregatedStats.day_4_count ?? 0) +
          (aggregatedStats.day_5_count ?? 0) +
          (aggregatedStats.day_6_count ?? 0) +
          (aggregatedStats.day_7_count ?? 0);

    aggregatedStats.month_current_count =
      !aggregatedStats.week_1_count &&
      !aggregatedStats.week_2_count &&
      !aggregatedStats.week_3_count &&
      !aggregatedStats.week_4_count
        ? aggregatedStats.week_current_count
        : (aggregatedStats.week_1_count ?? 0) +
          (aggregatedStats.week_2_count ?? 0) +
          (aggregatedStats.week_3_count ?? 0) +
          (aggregatedStats.week_4_count ?? 0);

    await this.repositoryReadWrite.save(aggregatedStats);
  }
}
