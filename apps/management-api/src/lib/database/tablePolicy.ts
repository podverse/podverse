import type { PermissionResource } from '@mgmt-api/lib/authz/requireCrud.js';

export type TableFieldDefinition = {
  name: string;
  type: 'integer' | 'text' | 'boolean' | 'timestamp';
  nullable: boolean;
  updatable: boolean;
};

export type TablePolicyDefinition = {
  tableName: string;
  permissionResource: PermissionResource;
  primaryKeyField: string;
  fields: TableFieldDefinition[];
  defaultSortField: string;
  defaultSortDirection: 'ASC' | 'DESC';
  maxPageSize: number;
  maxFilters: number;
  maxSorts: number;
  maxInValues: number;
  readOnly: boolean;
};

const ALLOWED_WRITE_TABLES =
  process.env.MGMT_DB_ALLOWED_WRITE_TABLES?.split(',').map((s) => s.trim()) ?? [];

export const TABLE_POLICIES: TablePolicyDefinition[] = [
  {
    tableName: 'feed_flag_status',
    permissionResource: 'feed_flag_statuses',
    primaryKeyField: 'id',
    fields: [
      { name: 'id', type: 'integer', nullable: false, updatable: false },
      { name: 'status', type: 'text', nullable: false, updatable: false },
      { name: 'created_at', type: 'timestamp', nullable: false, updatable: false },
      { name: 'updated_at', type: 'timestamp', nullable: false, updatable: false },
    ],
    defaultSortField: 'id',
    defaultSortDirection: 'ASC',
    maxPageSize: 100,
    maxFilters: 10,
    maxSorts: 3,
    maxInValues: 50,
    readOnly: false,
  },
  {
    tableName: 'feed_flag_status_reason',
    permissionResource: 'feed_flag_status_reasons',
    primaryKeyField: 'id',
    fields: [
      { name: 'id', type: 'integer', nullable: false, updatable: false },
      { name: 'reason', type: 'text', nullable: false, updatable: true },
      { name: 'created_at', type: 'timestamp', nullable: false, updatable: false },
      { name: 'updated_at', type: 'timestamp', nullable: false, updatable: false },
    ],
    defaultSortField: 'id',
    defaultSortDirection: 'ASC',
    maxPageSize: 100,
    maxFilters: 10,
    maxSorts: 3,
    maxInValues: 50,
    readOnly: false,
  },
  {
    tableName: 'feed',
    permissionResource: 'feeds',
    primaryKeyField: 'id',
    fields: [
      { name: 'id', type: 'integer', nullable: false, updatable: false },
      { name: 'url', type: 'text', nullable: false, updatable: false },
      { name: 'podcast_index_id', type: 'integer', nullable: false, updatable: false },
      { name: 'feed_flag_status_id', type: 'integer', nullable: false, updatable: true },
      { name: 'feed_flag_status_reason_id', type: 'integer', nullable: true, updatable: true },
      { name: 'feed_flag_status_reason_note', type: 'text', nullable: true, updatable: true },
      { name: 'last_parsed_file_hash', type: 'text', nullable: true, updatable: false },
      { name: 'is_parsing', type: 'timestamp', nullable: true, updatable: false },
      { name: 'parsing_priority', type: 'integer', nullable: false, updatable: true },
      { name: 'container_id', type: 'text', nullable: true, updatable: false },
      { name: 'created_at', type: 'timestamp', nullable: false, updatable: false },
      { name: 'updated_at', type: 'timestamp', nullable: false, updatable: false },
    ],
    defaultSortField: 'id',
    defaultSortDirection: 'ASC',
    maxPageSize: 100,
    maxFilters: 10,
    maxSorts: 3,
    maxInValues: 50,
    readOnly: !ALLOWED_WRITE_TABLES.includes('feed'),
  },
  {
    tableName: 'stats_aggregated_channel',
    permissionResource: 'stats',
    primaryKeyField: 'id',
    fields: [
      { name: 'id', type: 'integer', nullable: false, updatable: false },
      { name: 'channel_id', type: 'integer', nullable: false, updatable: false },
      { name: 'day_current_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_1_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_2_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_3_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_4_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_5_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_6_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_7_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_8_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_current_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_1_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_2_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_3_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_4_count', type: 'integer', nullable: false, updatable: false },
      { name: 'month_current_count', type: 'integer', nullable: false, updatable: false },
      { name: 'month_1_count', type: 'integer', nullable: false, updatable: false },
      { name: 'all_time_count', type: 'integer', nullable: false, updatable: false },
    ],
    defaultSortField: 'all_time_count',
    defaultSortDirection: 'DESC',
    maxPageSize: 100,
    maxFilters: 10,
    maxSorts: 3,
    maxInValues: 50,
    readOnly: true,
  },
  {
    tableName: 'stats_aggregated_item',
    permissionResource: 'stats',
    primaryKeyField: 'id',
    fields: [
      { name: 'id', type: 'integer', nullable: false, updatable: false },
      { name: 'item_id', type: 'integer', nullable: false, updatable: false },
      { name: 'day_current_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_1_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_2_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_3_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_4_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_5_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_6_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_7_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_8_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_current_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_1_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_2_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_3_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_4_count', type: 'integer', nullable: false, updatable: false },
      { name: 'month_current_count', type: 'integer', nullable: false, updatable: false },
      { name: 'month_1_count', type: 'integer', nullable: false, updatable: false },
      { name: 'all_time_count', type: 'integer', nullable: false, updatable: false },
    ],
    defaultSortField: 'all_time_count',
    defaultSortDirection: 'DESC',
    maxPageSize: 100,
    maxFilters: 10,
    maxSorts: 3,
    maxInValues: 50,
    readOnly: true,
  },
  {
    tableName: 'stats_aggregated_clip',
    permissionResource: 'stats',
    primaryKeyField: 'id',
    fields: [
      { name: 'id', type: 'integer', nullable: false, updatable: false },
      { name: 'clip_id', type: 'integer', nullable: false, updatable: false },
      { name: 'day_current_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_1_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_2_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_3_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_4_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_5_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_6_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_7_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_8_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_current_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_1_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_2_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_3_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_4_count', type: 'integer', nullable: false, updatable: false },
      { name: 'month_current_count', type: 'integer', nullable: false, updatable: false },
      { name: 'month_1_count', type: 'integer', nullable: false, updatable: false },
      { name: 'all_time_count', type: 'integer', nullable: false, updatable: false },
    ],
    defaultSortField: 'all_time_count',
    defaultSortDirection: 'DESC',
    maxPageSize: 100,
    maxFilters: 10,
    maxSorts: 3,
    maxInValues: 50,
    readOnly: true,
  },
  {
    tableName: 'stats_aggregated_playlist',
    permissionResource: 'stats',
    primaryKeyField: 'id',
    fields: [
      { name: 'id', type: 'integer', nullable: false, updatable: false },
      { name: 'playlist_id', type: 'integer', nullable: false, updatable: false },
      { name: 'day_current_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_1_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_2_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_3_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_4_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_5_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_6_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_7_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_8_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_current_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_1_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_2_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_3_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_4_count', type: 'integer', nullable: false, updatable: false },
      { name: 'month_current_count', type: 'integer', nullable: false, updatable: false },
      { name: 'month_1_count', type: 'integer', nullable: false, updatable: false },
      { name: 'all_time_count', type: 'integer', nullable: false, updatable: false },
    ],
    defaultSortField: 'all_time_count',
    defaultSortDirection: 'DESC',
    maxPageSize: 100,
    maxFilters: 10,
    maxSorts: 3,
    maxInValues: 50,
    readOnly: true,
  },
  {
    tableName: 'stats_aggregated_account',
    permissionResource: 'stats',
    primaryKeyField: 'id',
    fields: [
      { name: 'id', type: 'integer', nullable: false, updatable: false },
      { name: 'tracked_account_id', type: 'integer', nullable: false, updatable: false },
      { name: 'day_current_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_1_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_2_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_3_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_4_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_5_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_6_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_7_count', type: 'integer', nullable: false, updatable: false },
      { name: 'day_8_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_current_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_1_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_2_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_3_count', type: 'integer', nullable: false, updatable: false },
      { name: 'week_4_count', type: 'integer', nullable: false, updatable: false },
      { name: 'month_current_count', type: 'integer', nullable: false, updatable: false },
      { name: 'month_1_count', type: 'integer', nullable: false, updatable: false },
      { name: 'all_time_count', type: 'integer', nullable: false, updatable: false },
    ],
    defaultSortField: 'all_time_count',
    defaultSortDirection: 'DESC',
    maxPageSize: 100,
    maxFilters: 10,
    maxSorts: 3,
    maxInValues: 50,
    readOnly: true,
  },
];

export function getTablePolicy(tableName: string): TablePolicyDefinition | undefined {
  return TABLE_POLICIES.find((p) => p.tableName === tableName);
}

export function isTableAllowlisted(tableName: string): boolean {
  return TABLE_POLICIES.some((p) => p.tableName === tableName);
}

export function isTableReadOnly(tableName: string): boolean {
  const policy = getTablePolicy(tableName);
  return policy?.readOnly ?? true;
}
