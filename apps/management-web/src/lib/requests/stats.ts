import { ManagementApiRequestService } from './apiRequestService';

export type StatsRange = 'day' | '7day' | '30day' | '1year' | 'all-time';

export type EntityType = 'channel' | 'item' | 'clip' | 'playlist' | 'account';

export type StatsRow = {
  id: number;
  title: string | null;
  day_current_count: number;
  day_1_count: number;
  day_2_count: number;
  day_3_count: number;
  day_4_count: number;
  day_5_count: number;
  day_6_count: number;
  day_7_count: number;
  day_8_count: number;
  week_current_count: number;
  week_1_count: number;
  week_2_count: number;
  week_3_count: number;
  week_4_count: number;
  month_current_count: number;
  month_1_count: number;
  all_time_count: number;
  range_count: number;
};

export type StatsTopResponse = {
  rows: StatsRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function reqStatsTop(
  entityType: EntityType,
  range: StatsRange,
  page: number = 1,
  limit: number = 25
): Promise<StatsTopResponse> {
  const service = new ManagementApiRequestService();
  const params = new URLSearchParams({
    range,
    page: String(page),
    limit: String(limit),
  });
  return service.apiRequest<StatsTopResponse>({
    path: `/stats/top/${entityType}?${params.toString()}`,
    method: 'GET',
  });
}

export async function reqStatsDetail(entityType: EntityType, id: number): Promise<StatsRow> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<StatsRow>({
    path: `/stats/detail/${entityType}/${id}`,
    method: 'GET',
  });
}

export async function reqStatsSearch(
  entityType: EntityType,
  query: string,
  range: StatsRange,
  page: number = 1,
  limit: number = 25
): Promise<StatsTopResponse> {
  const service = new ManagementApiRequestService();
  const params = new URLSearchParams({
    q: query,
    range,
    page: String(page),
    limit: String(limit),
  });
  return service.apiRequest<StatsTopResponse>({
    path: `/stats/search/${entityType}?${params.toString()}`,
    method: 'GET',
  });
}
