import { DTOFeedFlagStatus } from './feedFlagStatus';

export interface DTOFeed {
  id: number;
  url: string;
  podcast_index_id: number;
  feed_flag_status_id: number;
  feed_flag_status: DTOFeedFlagStatus;
  is_parsing: string | null; // ISO string
  parsing_priority: number;
  last_parsed_file_hash: string | null;
  container_id: string | null;
  channel_id: number;
  created_at: string;
  updated_at: string;
}
