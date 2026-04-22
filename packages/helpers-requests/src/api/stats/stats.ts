import type { ApiRequestService } from '../_request.js';
import type { ApiMessageResponse } from '../_response.js';

type StatsTrackResponse = ApiMessageResponse & { message?: string };

export async function reqStatsTrackAccount(api: ApiRequestService, account_id_text: string) {
  return api.apiRequest<StatsTrackResponse>({
    path: '/stats/account',
    method: 'POST',
    data: { account_id_text },
    config: { withCredentials: true },
  });
}

export async function reqStatsTrackChannel(api: ApiRequestService, channel_id_text: string) {
  return api.apiRequest<StatsTrackResponse>({
    path: '/stats/channel',
    method: 'POST',
    data: { channel_id_text },
    config: { withCredentials: true },
  });
}

export async function reqStatsTrackClip(api: ApiRequestService, clip_id_text: string) {
  return api.apiRequest<StatsTrackResponse>({
    path: '/stats/clip',
    method: 'POST',
    data: { clip_id_text },
    config: { withCredentials: true },
  });
}

export async function reqStatsTrackItem(api: ApiRequestService, item_id_text: string) {
  return api.apiRequest<StatsTrackResponse>({
    path: '/stats/item',
    method: 'POST',
    data: { item_id_text },
    config: { withCredentials: true },
  });
}

export async function reqStatsTrackPlaylist(api: ApiRequestService, playlist_id_text: string) {
  return api.apiRequest<StatsTrackResponse>({
    path: '/stats/playlist',
    method: 'POST',
    data: { playlist_id_text },
    config: { withCredentials: true },
  });
}
