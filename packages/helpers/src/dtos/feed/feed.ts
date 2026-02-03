import type { DTOFeedFlagStatus } from './feedFlagStatus.js';
import type { DTOFeedLog } from './feedLog.js';

export interface DTOFeed {
  id: number;
  url: string;
  podcast_index_id: number;
  feed_flag_status_id: number;
  feed_flag_status: DTOFeedFlagStatus;
  feed_log?: DTOFeedLog;
  is_parsing: string | null; // ISO string
  parsing_priority: number;
  last_parsed_file_hash: string | null;
  container_id: string | null;
  channel_id: number;
  created_at: string;
  updated_at: string;
}
