import type { DTOAccount } from '@podverse/helpers';
import type { ApiRequestService } from '../../_request.js';
import { reqAuthMe } from '../../auth/auth.js';

type ReqGetByAccountAndChannelParams = {
  channel_id_text: string;
};

export async function reqAccountNotificationChannelCreate(
  api: ApiRequestService,
  params: ReqGetByAccountAndChannelParams
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account/notification/channel',
    method: 'POST',
    data: {
      channel_id_text: params.channel_id_text,
    },
    config: {
      withCredentials: true,
    },
  });

  return reqAuthMe(api);
}

export async function reqAccountNotificationChannelDelete(
  api: ApiRequestService,
  params: ReqGetByAccountAndChannelParams
): Promise<DTOAccount> {
  await api.apiRequest({
    path: `/account/notification/channel/${params.channel_id_text}`,
    method: 'DELETE',
    config: {
      withCredentials: true,
    },
  });

  return reqAuthMe(api);
}
