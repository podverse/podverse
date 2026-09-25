import type { ApiRequestService } from '../../_request.js';

export type PutAccountAutoDownloadChannelsParams = {
  installation_id: string;
  channel_id_texts: string[];
};

export type PutAccountAutoDownloadChannelsResponse = {
  channel_id_texts: string[];
};

export async function reqAccountAutoDownloadChannelsPut(
  api: ApiRequestService,
  params: PutAccountAutoDownloadChannelsParams
) {
  return api.apiRequest<PutAccountAutoDownloadChannelsResponse>({
    path: '/account/auto-download/channels',
    method: 'PUT',
    data: params,
    config: { withCredentials: true },
  });
}
