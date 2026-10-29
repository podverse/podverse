import type { DescriptionLengthTierEnum } from '@podverse/helpers';

import { ManagementApiRequestService } from './apiRequestService.js';

export type FeedOperationsLookup = {
  id: number;
  url: string;
  podcast_index_id: number;
  spam_item_limit_override: number | null;
  max_response_body_bytes_override: number | null;
  description_length_tier_override: DescriptionLengthTierEnum | null;
  description_length_tier_effective: DescriptionLengthTierEnum;
  /** Smallest tier that fits the longest source; null when unknown or beyond every tier. */
  description_length_tier_suggested: DescriptionLengthTierEnum | null;
  description_truncated_count: number;
  description_longest_source_length: number | null;
  /** ISO timestamp of the last parse that shortened a description. */
  description_truncated_at: string | null;
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

export type FeedOperationsListSortKey =
  | 'id'
  | 'podcast_index_id'
  | 'channel_title'
  | 'lifecycle_state_key'
  | 'url'
  | 'description_longest_source_length';

export type ListFeedOperationsParams = {
  page?: number;
  limit?: number;
  sort?: FeedOperationsListSortKey;
  order?: 'asc' | 'desc';
  q?: string;
  lifecycle?: string;
  /** True keeps only feeds whose last successful parse shortened a description. */
  description_truncated?: boolean;
};

export type ListFeedOperationsResponse = {
  feeds: FeedOperationsLookup[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ApplyFeedOperationsPolicyStateBody = {
  feed_id: number;
  lifecycle_state_key?: string;
  active_condition_keys?: string[];
  lifecycle_reason_key?: string | null;
  condition_note?: string | null;
  transition_note?: string | null;
  spam_item_limit_override?: number | null;
  max_response_body_bytes_override?: number | null;
  /** Null resets to the default tier. A changed tier schedules a forced reparse. */
  description_length_tier_override?: DescriptionLengthTierEnum | null;
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
    path: '/feeds/options',
    method: 'GET',
  });
}

/** Whether any feeds exist for directory listing (ignores search/lifecycle filters). */
export async function probeFeedOperationsDirectoryHasFeeds(
  params: Pick<ListFeedOperationsParams, 'sort' | 'order'>
): Promise<boolean> {
  const res = await listFeedOperations({
    limit: 1,
    order: params.order,
    page: 1,
    sort: params.sort,
  });
  return res.pagination.total > 0;
}

export async function listFeedOperations(
  params: ListFeedOperationsParams
): Promise<ListFeedOperationsResponse> {
  const service = new ManagementApiRequestService();
  const q = new URLSearchParams();
  if (params.page !== undefined) {
    q.set('page', String(params.page));
  }
  if (params.limit !== undefined) {
    q.set('limit', String(params.limit));
  }
  if (params.sort !== undefined) {
    q.set('sort', params.sort);
  }
  if (params.order !== undefined) {
    q.set('order', params.order);
  }
  if (params.q !== undefined && params.q.trim() !== '') {
    q.set('q', params.q.trim());
  }
  if (params.lifecycle !== undefined && params.lifecycle.trim() !== '') {
    q.set('lifecycle', params.lifecycle.trim());
  }
  if (params.description_truncated === true) {
    q.set('description_truncated', 'true');
  }
  const qs = q.toString();
  return service.apiRequest<ListFeedOperationsResponse>({
    path: `/feeds${qs ? `?${qs}` : ''}`,
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
    path: `/feeds/lookup?${q.toString()}`,
    method: 'GET',
  });
}

export type FeedMergeStatus =
  'detected' | 'verified' | 'needs_review' | 'applied' | 'rejected' | 'reverted';

export type FeedMergeStatusFilter = FeedMergeStatus | 'all';

export type FeedMergeMode = 'repoint' | 'absorb';

export type FeedMergeItemTier = 'guid' | 'enclosure' | 'fuzzy';

export type FeedMergeListRow = {
  id: number;
  from_podcast_index_id: number;
  to_podcast_index_id: number;
  from_channel_title: string | null;
  to_channel_title: string | null;
  confidence: string | null;
  mode: FeedMergeMode | null;
  status: FeedMergeStatus;
};

export type FeedMergeItemPair = {
  from_title: string | null;
  to_title: string | null;
  match_tier: FeedMergeItemTier | null;
};

export type FeedMergeDetail = FeedMergeListRow & {
  note: string | null;
  from_feed_lifecycle_state_key: string | null;
  match_stats: Record<string, unknown>;
  item_pairs: FeedMergeItemPair[];
};

export type FeedMergeListResponse = {
  merges: FeedMergeListRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type FeedMergeDetailResponse = {
  merge: FeedMergeDetail;
};

export type FeedMergeNoteBody = {
  note?: string | null;
};

export async function listFeedMerges(params: {
  page?: number;
  limit?: number;
  status?: FeedMergeStatusFilter;
}): Promise<FeedMergeListResponse> {
  const service = new ManagementApiRequestService();
  const q = new URLSearchParams();
  if (params.page !== undefined) {
    q.set('page', String(params.page));
  }
  if (params.limit !== undefined) {
    q.set('limit', String(params.limit));
  }
  if (params.status !== undefined) {
    q.set('status', params.status);
  }
  const qs = q.toString();
  return service.apiRequest<FeedMergeListResponse>({
    path: `/feeds/merges${qs !== '' ? `?${qs}` : ''}`,
    method: 'GET',
  });
}

export async function getFeedMerge(id: number): Promise<FeedMergeDetailResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<FeedMergeDetailResponse>({
    path: `/feeds/merges/${id}`,
    method: 'GET',
  });
}

async function postFeedMerge(
  id: number,
  action: 'approve' | 'reject' | 'revert',
  body: FeedMergeNoteBody
): Promise<FeedMergeDetailResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<FeedMergeDetailResponse>({
    path: `/feeds/merges/${id}/${action}`,
    method: 'POST',
    data: body,
  });
}

export async function approveFeedMerge(
  id: number,
  body: FeedMergeNoteBody
): Promise<FeedMergeDetailResponse> {
  return postFeedMerge(id, 'approve', body);
}

export async function rejectFeedMerge(
  id: number,
  body: FeedMergeNoteBody
): Promise<FeedMergeDetailResponse> {
  return postFeedMerge(id, 'reject', body);
}

export async function revertFeedMerge(
  id: number,
  body: FeedMergeNoteBody
): Promise<FeedMergeDetailResponse> {
  return postFeedMerge(id, 'revert', body);
}

export type RemoteStubPendingAction = 'recheck' | 'repoint' | 'promote';

export type RemoteStubListSort =
  'title' | 'provider_feed_id' | 'item_stub_count' | 'resolved_at' | 'created_at';

export type RemoteStubListOrder = 'asc' | 'desc';

export type RemoteStubListRow = {
  id: number;
  index_provider: string;
  provider_feed_id: string;
  title: string | null;
  author: string | null;
  feed_url: string | null;
  feed_guid: string | null;
  medium_value: string | null;
  alias_count: number;
  item_stub_count: number;
  pending_action: RemoteStubPendingAction | null;
  resolved_at: string;
  created_at: string;
};

export type RemoteStubAlias = {
  key_kind: 'feed_guid' | 'feed_url';
  key_value: string;
};

export type RemoteStubItemStub = {
  item_guid: string;
  title: string | null;
  pub_date: string | null;
  duration_seconds: number | null;
  resolved_at: string;
};

export type RemoteStubHistoryJob = {
  job_type: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  run_after: string;
  updated_at: string;
};

export type RemoteStubDetail = RemoteStubListRow & {
  image_url: string | null;
  aliases: RemoteStubAlias[];
  item_stubs: RemoteStubItemStub[];
  jobs: RemoteStubHistoryJob[];
};

export type RemoteStubListResponse = {
  remote_stubs: RemoteStubListRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type RemoteStubDetailResponse = {
  remote_stub: RemoteStubDetail;
};

export type RemoteStubJob = {
  id: number;
  job_type: string;
  status: string;
  run_after: string;
};

export type RemoteStubJobResponse = {
  job: RemoteStubJob;
};

export type RemoteStubRepointBody = {
  provider_feed_id: string;
};

export async function listRemoteStubs(params: {
  page?: number;
  limit?: number;
  q?: string;
  sort?: RemoteStubListSort;
  order?: RemoteStubListOrder;
}): Promise<RemoteStubListResponse> {
  const service = new ManagementApiRequestService();
  const q = new URLSearchParams();
  if (params.page !== undefined) {
    q.set('page', String(params.page));
  }
  if (params.limit !== undefined) {
    q.set('limit', String(params.limit));
  }
  if (params.q !== undefined && params.q !== '') {
    q.set('q', params.q);
  }
  if (params.sort !== undefined) {
    q.set('sort', params.sort);
  }
  if (params.order !== undefined) {
    q.set('order', params.order);
  }
  const qs = q.toString();
  return service.apiRequest<RemoteStubListResponse>({
    path: `/feeds/remote-stubs${qs !== '' ? `?${qs}` : ''}`,
    method: 'GET',
  });
}

export async function getRemoteStub(id: number): Promise<RemoteStubDetailResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<RemoteStubDetailResponse>({
    path: `/feeds/remote-stubs/${id}`,
    method: 'GET',
  });
}

export async function recheckRemoteStub(id: number): Promise<RemoteStubJobResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<RemoteStubJobResponse>({
    path: `/feeds/remote-stubs/${id}/recheck`,
    method: 'POST',
  });
}

export async function repointRemoteStub(
  id: number,
  body: RemoteStubRepointBody
): Promise<RemoteStubJobResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<RemoteStubJobResponse>({
    path: `/feeds/remote-stubs/${id}/repoint`,
    method: 'POST',
    data: body,
  });
}

export async function promoteRemoteStub(id: number): Promise<RemoteStubJobResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<RemoteStubJobResponse>({
    path: `/feeds/remote-stubs/${id}/promote`,
    method: 'POST',
  });
}

export async function deleteRemoteStub(id: number): Promise<void> {
  const service = new ManagementApiRequestService();
  await service.apiRequest<void>({
    path: `/feeds/remote-stubs/${id}`,
    method: 'DELETE',
  });
}

export async function applyFeedPolicyState(
  body: ApplyFeedOperationsPolicyStateBody
): Promise<ApplyFeedOperationsPolicyStateResponse> {
  const { feed_id, ...rest } = body;
  const service = new ManagementApiRequestService();
  return service.apiRequest<ApplyFeedOperationsPolicyStateResponse>({
    path: `/feeds/${feed_id}/policy-state`,
    method: 'PATCH',
    data: rest,
  });
}
