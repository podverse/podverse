import type { DTOManagedCopy, ManagedCopySlug } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

export async function reqManagedCopyGet(
  api: ApiRequestService,
  slug: ManagedCopySlug,
  options?: { locale?: string }
): Promise<DTOManagedCopy> {
  const locale = options?.locale?.trim() ?? '';
  return api.apiRequest<DTOManagedCopy>({
    path: `/managed-copy/${slug}`,
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
