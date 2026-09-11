import type { StatsAggregatedRangeCountField } from '@podverse/helpers';
import type { QueryParamsStatsRange } from '@podverse/helpers-requests';

export const getStatsOrder = (range?: QueryParamsStatsRange): StatsAggregatedRangeCountField => {
  switch (range) {
    case 'day':
      return 'day_current_count';
    case 'week':
      return 'week_current_count';
    case 'month':
      return 'month_current_count';
    case 'all-time':
      return 'all_time_count';
    default:
      return 'day_current_count';
  }
};
