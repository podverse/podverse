import type { PopularityListenResult, PopularityOpenResult } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';
import type { ApiMessageResponse } from '../_response.js';

/**
 * One report of a listening session. Send exactly one of `item_id_text` and `clip_id_text`. The
 * server's receive time dates the listen, so the body carries no device time.
 */
export type StatsListenRequestBody = {
  item_id_text?: string;
  clip_id_text?: string;
  /** One random uuid per listening session; every report for the session reuses it. */
  client_listen_id: string;
  /** Media seconds actually played in this session so far. */
  seconds_heard: number;
  completed?: boolean;
  /**
   * Length of the file the player loaded for this play. The server uses it when it is the only
   * length, or when it sits between half and double the RSS duration.
   */
  media_duration_seconds?: number;
};

export type StatsOpenRequestBody = { account_id_text: string } | { playlist_id_text: string };

export type StatsListenResponse = ApiMessageResponse & { result: PopularityListenResult };

export type StatsOpenResponse = ApiMessageResponse & { result: PopularityOpenResult };

export async function reqStatsListen(api: ApiRequestService, body: StatsListenRequestBody) {
  return api.apiRequest<StatsListenResponse>({
    path: '/stats/listen',
    method: 'POST',
    data: body,
    config: { withCredentials: true },
  });
}

export async function reqStatsOpen(api: ApiRequestService, body: StatsOpenRequestBody) {
  return api.apiRequest<StatsOpenResponse>({
    path: '/stats/open',
    method: 'POST',
    data: body,
    config: { withCredentials: true },
  });
}
