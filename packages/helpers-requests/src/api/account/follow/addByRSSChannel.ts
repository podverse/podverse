import type { ApiRequestService } from '../../_request.js';
import type { DTOAccount, DTOAccountFollowingAddByRSSChannel } from '@podverse/helpers';
import { reqAuthMe } from '../../auth/auth.js';

type ReqAccountFollowAddByRSSChannelParams = {
  feed_url: string;
  title?: string | null;
  image_url?: string | null;
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
): Promise<DTOAccount> {
  await api.apiRequest<{ message: string }>({
    path: '/account/follow/add-by-rss-channel',
    method: 'POST',
    data: {
      feed_url: params.feed_url,
      title: params.title ?? null,
      image_url: params.image_url ?? null,
    },
    config: { withCredentials: true },
  });

  return reqAuthMe(api);
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
