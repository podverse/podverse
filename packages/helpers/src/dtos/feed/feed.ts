import type { DTOFeedLog } from './feedLog.js';
import type { DTOFeedPolicy } from './feedPolicy.js';

/** Serialized from API (`feed_lifecycle_state` + nested type). */
export type DTOFeedLifecycleStateType = {
  state_key: string;
};

export type DTOFeedLifecycleState = {
  feed_lifecycle_state_type?: DTOFeedLifecycleStateType | null;
  reason_key?: string | null;
};

export interface DTOFeed {
  id: number;
  url: string;
  podcast_index_id: number;
  feed_lifecycle_state?: DTOFeedLifecycleState | null;
  feed_policy?: DTOFeedPolicy | null;
  feed_log?: DTOFeedLog;
  is_parsing: string | null; // ISO string
  parsing_priority: number;
  spam_item_limit_override?: number | null;
  max_response_body_bytes_override?: number | null;
  last_parsed_file_hash: string | null;
  container_id: string | null;
  channel_id: number;
  created_at: string;
  updated_at: string;
}
