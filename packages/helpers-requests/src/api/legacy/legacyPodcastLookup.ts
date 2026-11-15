import type { DTOLegacyPodcastLookupResponse } from '@podverse/helpers';
import { LEGACY_INSTALL_ID_HEADER } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

export async function reqLegacyPodcastLookup(
  api: ApiRequestService,
  body: { podcast_ids: string[]; install_id: string | null }
): Promise<DTOLegacyPodcastLookupResponse> {
  const headers: Record<string, string> = {};
  if (body.install_id !== null && body.install_id.length > 0) {
    headers[LEGACY_INSTALL_ID_HEADER] = body.install_id;
  }
  return api.apiRequest<DTOLegacyPodcastLookupResponse>({
    path: '/legacy/podcast/lookup',
    method: 'POST',
    data: { podcast_ids: body.podcast_ids },
    config: { headers },
  });
}
