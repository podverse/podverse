import type { BulkFollowChannelsResponse, DTOAccount } from '@podverse/helpers';

import type { ApiRequestService } from '../../_request.js';
import { reqAuthMe } from '../../auth/auth.js';

type ReqAuthLoginParams = {
  channel_id_text: string;
};

export async function reqAccountFollowChannel(
  api: ApiRequestService,
  params: ReqAuthLoginParams
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account/follow/channel',
    method: 'POST',
    data: {
      channel_id_text: params.channel_id_text,
    },
    config: { withCredentials: true },
  });

  return reqAuthMe(api);
}

/**
 * Follow many channels in one request, for mobile's sign-up merge.
 *
 * Unlike the single-follow helpers this returns the per-channel outcomes rather than refetching the
 * account: the caller needs to know which channels were actually followed and which no longer exist,
 * and a merge of hundreds should not also pay for a full account hydration it may not use.
 */
export async function reqAccountFollowChannelsBulk(
  api: ApiRequestService,
  params: { channel_id_texts: string[] }
): Promise<BulkFollowChannelsResponse> {
  const response = await api.apiRequest({
    path: '/account/follow/channel/bulk',
    method: 'POST',
    data: {
      channel_id_texts: params.channel_id_texts,
    },
    config: { withCredentials: true },
  });

  return response.data;
}

export async function reqAccountUnfollowChannel(
  api: ApiRequestService,
  params: ReqAuthLoginParams
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account/unfollow/channel',
    method: 'POST',
    data: {
      channel_id_text: params.channel_id_text,
    },
    config: { withCredentials: true },
  });

  return reqAuthMe(api);
}
