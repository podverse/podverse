import { ManagementApiRequestService } from './apiRequestService';

export type FeedOperationsLookup = {
  id: number;
  url: string;
  podcast_index_id: number;
  spam_item_limit_override: number | null;
  max_response_body_bytes_override: number | null;
  lifecycle_state_key: string;
  lifecycle_reason: string | null;
  updated_source: string;
  active_condition_keys: string[];
  parse_allowed: boolean;
  public_visible: boolean;
  add_allowed: boolean;
  primary_block_reason: string | null;
  policy_overrides: {
    parse_allowed_override: boolean | null;
    public_visible_override: boolean | null;
    add_allowed_override: boolean | null;
  } | null;
  channel_title: string | null;
};

export type FeedOperationsOptionsResponse = {
  lifecycle_states: { state_key: string }[];
  condition_types: { condition_key: string }[];
  takedown_reasons: { reason: string }[];
};

export type LookupResponse = { feed: FeedOperationsLookup };

export type ApplyFeedOperationsPolicyStateBody = {
  feed_id: number;
  lifecycle_state_key?: string;
  active_condition_keys?: string[];
  lifecycle_reason_key?: string | null;
  condition_note?: string | null;
  transition_note?: string | null;
  spam_item_limit_override?: number | null;
  max_response_body_bytes_override?: number | null;
  policy_overrides?: {
    parse_allowed_override?: boolean | null;
    public_visible_override?: boolean | null;
    add_allowed_override?: boolean | null;
  } | null;
  /** When true, allows takedown without activating `takedown_active` (transitional). */
  takedown_transitional?: boolean;
};

export type ApplyFeedOperationsPolicyStateResponse = {
  feed: FeedOperationsLookup;
};

export async function getFeedOperationOptions(): Promise<FeedOperationsOptionsResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<FeedOperationsOptionsResponse>({
    path: '/feed-operations/options',
    method: 'GET',
  });
}

export async function lookupFeed(params: {
  podcast_index_id?: number;
  feed_id?: number;
  url?: string;
}): Promise<LookupResponse> {
  const service = new ManagementApiRequestService();
  const q = new URLSearchParams();
  if (params.podcast_index_id !== undefined) {
    q.set('podcast_index_id', String(params.podcast_index_id));
  } else if (params.feed_id !== undefined) {
    q.set('feed_id', String(params.feed_id));
  } else if (params.url !== undefined) {
    q.set('url', params.url);
  }
  return service.apiRequest<LookupResponse>({
    path: `/feed-operations/lookup?${q.toString()}`,
    method: 'GET',
  });
}

export async function applyFeedOperationsPolicyState(
  body: ApplyFeedOperationsPolicyStateBody
): Promise<ApplyFeedOperationsPolicyStateResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<ApplyFeedOperationsPolicyStateResponse>({
    path: '/feed-operations/update-policy-state',
    method: 'POST',
    data: body,
  });
}
