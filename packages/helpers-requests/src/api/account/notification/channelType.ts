import type { DTOAccount } from '@podverse/helpers';
import type { ApiRequestService } from '../../_request.js';
import { reqAuthMe } from '../../auth/auth.js';

type ReqAccountNotificationChannelTypeParams = {
  channel_id_text: string;
  type: string;
};

export async function reqAccountNotificationChannelTypeCreate(
  api: ApiRequestService,
  params: ReqAccountNotificationChannelTypeParams
): Promise<DTOAccount> {
  await api.apiRequest({
    path: '/account/notification/channel/type',
    method: 'POST',
    data: {
      channel_id_text: params.channel_id_text,
      type: params.type,
    },
    config: {
      withCredentials: true,
    },
  });

  return reqAuthMe(api);
}

export async function reqAccountNotificationChannelTypeDelete(
  api: ApiRequestService,
  params: ReqAccountNotificationChannelTypeParams
): Promise<DTOAccount> {
  await api.apiRequest({
    path: `/account/notification/channel/${params.channel_id_text}/type/${params.type}`,
    method: 'DELETE',
    config: {
      withCredentials: true,
    },
  });

  return reqAuthMe(api);
}
