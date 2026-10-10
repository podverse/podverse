import type { DTOTermsAgreement } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

export async function reqLegalTerms(
  api: ApiRequestService,
  options?: { locale?: string }
): Promise<DTOTermsAgreement> {
  const locale = options?.locale?.trim() ?? '';
  return api.apiRequest<DTOTermsAgreement>({
    path: '/legal/terms',
    method: 'GET',
    ...(locale !== ''
      ? {
          config: {
            headers: {
              'Accept-Language': locale,
            },
          },
        }
      : {}),
  });
}
