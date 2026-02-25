import type { ApiRequestService } from '../../_request.js';
import type { DTOAccount } from '@podverse/helpers';
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
