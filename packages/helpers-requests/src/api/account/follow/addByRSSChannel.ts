import type {
  DTOAccount,
  DTOAccountFollowingAddByRSSChannel,
  DTOAddByRSSConvertResponse,
  DTOChannelDirectoryMatch,
} from '@podverse/helpers';

import type { ApiRequestService } from '../../_request.js';
import { reqAuthMe } from '../../auth/auth.js';

type ReqAccountFollowAddByRSSChannelParams = {
  feed_url: string;
  title?: string | null;
  image_url?: string | null;
  /** Mark the feed as needing Basic Auth. Credentials themselves never go to this endpoint. */
  requires_credentials?: boolean;
};

type ReqAccountUnfollowAddByRSSChannelParams = {
  feed_url: string;
};

type ReqAccountGetFollowedAddByRSSChannelsParams = {
  account_id_text: string;
};

export async function reqAccountFollowAddByRSSChannel(
  api: ApiRequestService,
  params: ReqAccountFollowAddByRSSChannelParams
): Promise<{ account: DTOAccount; directory_channel: DTOChannelDirectoryMatch | null }> {
  const posted = await api.apiRequest<{
    message: string;
    directory_channel?: DTOChannelDirectoryMatch | null;
  }>({
    path: '/account/follow/add-by-rss-channel',
    method: 'POST',
    data: {
      feed_url: params.feed_url,
      title: params.title ?? null,
      image_url: params.image_url ?? null,
      ...(params.requires_credentials !== undefined
        ? { requires_credentials: params.requires_credentials }
        : {}),
    },
    config: { withCredentials: true },
  });

  const account = await reqAuthMe(api);
  return { account, directory_channel: posted.directory_channel ?? null };
}

export async function reqAccountAddByRSSConvertToChannel(
  api: ApiRequestService,
  params: { feed_url: string; feed_guid?: string | null }
): Promise<DTOAddByRSSConvertResponse> {
  return api.apiRequest<DTOAddByRSSConvertResponse>({
    path: '/account/add-by-rss/convert-to-channel',
    method: 'POST',
    data: {
      feed_url: params.feed_url,
      feed_guid: params.feed_guid ?? null,
    },
    config: { withCredentials: true },
  });
}

export async function reqAccountUnfollowAddByRSSChannel(
  api: ApiRequestService,
  params: ReqAccountUnfollowAddByRSSChannelParams
): Promise<DTOAccount> {
  await api.apiRequest<void>({
    path: '/account/unfollow/add-by-rss-channel',
    method: 'POST',
    data: {
      feed_url: params.feed_url,
    },
    config: { withCredentials: true },
  });

  return reqAuthMe(api);
}

export async function reqAccountGetFollowedAddByRSSChannels(
  api: ApiRequestService,
  params: ReqAccountGetFollowedAddByRSSChannelsParams
): Promise<DTOAccountFollowingAddByRSSChannel[]> {
  return api.apiRequest<DTOAccountFollowingAddByRSSChannel[]>({
    path: `/account/follow/add-by-rss-channel/${params.account_id_text}`,
    method: 'GET',
    config: { withCredentials: true },
  });
}
