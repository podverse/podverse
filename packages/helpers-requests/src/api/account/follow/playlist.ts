import type { ApiRequestService } from '../../_request.js';
import type { DTOAccount } from '@podverse/helpers';
import { reqAuthMe } from '../../auth/auth.js';

type ReqAuthLoginParams = {
  playlist_id_text: string;
};

export async function reqAccountFollowPlaylist(
  api: ApiRequestService,
  params: ReqAuthLoginParams
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account/follow/playlist',
    method: 'POST',
    data: {
      playlist_id_text: params.playlist_id_text,
    },
    config: { withCredentials: true },
  });

  return reqAuthMe(api);
}

export async function reqAccountUnfollowPlaylist(
  api: ApiRequestService,
  params: ReqAuthLoginParams
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account/unfollow/playlist',
    method: 'POST',
    data: {
      playlist_id_text: params.playlist_id_text,
    },
    config: { withCredentials: true },
  });

  return reqAuthMe(api);
}
