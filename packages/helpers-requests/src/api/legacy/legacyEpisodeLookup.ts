import type { DTOLegacyEpisodeLookupRef, DTOLegacyEpisodeLookupResponse } from '@podverse/helpers';
import { LEGACY_INSTALL_ID_HEADER } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

export async function reqLegacyEpisodeLookup(
  api: ApiRequestService,
  body: { episodes: DTOLegacyEpisodeLookupRef[]; install_id: string | null }
): Promise<DTOLegacyEpisodeLookupResponse> {
  const headers: Record<string, string> = {};
  if (body.install_id !== null && body.install_id.length > 0) {
    headers[LEGACY_INSTALL_ID_HEADER] = body.install_id;
  }
  return api.apiRequest<DTOLegacyEpisodeLookupResponse>({
    path: '/legacy/episode/lookup',
    method: 'POST',
    data: { episodes: body.episodes },
    config: { headers },
  });
}
