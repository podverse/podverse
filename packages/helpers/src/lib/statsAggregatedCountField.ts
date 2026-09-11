export const STATS_AGGREGATED_RANGE_COUNT_FIELDS = [
  'day_current_count',
  'week_current_count',
  'month_current_count',
  'all_time_count',
] as const;

export type StatsAggregatedRangeCountField = (typeof STATS_AGGREGATED_RANGE_COUNT_FIELDS)[number];
