import type { DTOPopularityTrackingAgreement } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

export async function reqLegalPopularityTracking(
  api: ApiRequestService
): Promise<DTOPopularityTrackingAgreement> {
  return api.apiRequest<DTOPopularityTrackingAgreement>({
    path: '/legal/popularity-tracking',
    method: 'GET',
    config: {
      withCredentials: true,
    },
  });
}
