import { ApiRequestService } from '../../_request';
import { DTOAccount } from '@podverse/helpers';
import { reqAuthMe } from '../../auth/auth';

type ReqAccountFollowParams = {
  following_account_id_text: string;
};

export async function reqAccountFollowAccount(
  api: ApiRequestService,
  params: ReqAccountFollowParams
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account/follow/account',
    method: 'POST',
    data: {
      following_account_id_text: params.following_account_id_text,
    },
    config: { withCredentials: true },
  });

  return reqAuthMe(api);
}

export async function reqAccountUnfollowAccount(
  api: ApiRequestService,
  params: ReqAccountFollowParams
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account/unfollow/account',
    method: 'POST',
    data: {
      following_account_id_text: params.following_account_id_text,
    },
    config: { withCredentials: true },
  });

  return reqAuthMe(api);
}
