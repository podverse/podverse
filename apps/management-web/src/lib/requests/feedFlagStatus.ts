import { ManagementApiRequestService } from './apiRequestService';

export type FeedFlagLookup = {
  id: number;
  url: string;
  podcast_index_id: number;
  feed_flag_status_id: number;
  feed_flag_status_key: string;
  feed_flag_status_reason_id: number | null;
  feed_flag_status_reason_key: string | null;
  feed_flag_status_reason_note: string | null;
  channel_title: string | null;
};

export type FeedFlagStatusOption = { id: number; status: string };
export type FeedFlagStatusReasonOption = { id: number; reason: string };

export type FeedOptionsResponse = {
  feed_flag_statuses: FeedFlagStatusOption[];
  feed_flag_status_reasons: FeedFlagStatusReasonOption[];
};

export type LookupResponse = { feed: FeedFlagLookup };

export type ApplyFlagStatusBody = {
  feed_id: number;
  feed_flag_status_id: number;
  feed_flag_status_reason_id: number | null;
  feed_flag_status_reason_note: string | null;
};

export type ApplyFlagStatusResponse = {
  feed: Record<string, unknown>;
};

export async function getFeedOperationOptions(): Promise<FeedOptionsResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<FeedOptionsResponse>({
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

export async function applyFeedFlagStatus(
  body: ApplyFlagStatusBody
): Promise<ApplyFlagStatusResponse> {
  const service = new ManagementApiRequestService();
  return service.apiRequest<ApplyFlagStatusResponse>({
    path: '/feed-operations/flag-status',
    method: 'POST',
    data: {
      feed_id: body.feed_id,
      feed_flag_status_id: body.feed_flag_status_id,
      feed_flag_status_reason_id: body.feed_flag_status_reason_id,
      feed_flag_status_reason_note: body.feed_flag_status_reason_note,
    },
  });
}
