import type { DTOManagedCopy, ManagedCopySlug } from '@podverse/helpers';

import type { ApiRequestService } from '../_request.js';

export async function reqManagedCopyGet(
  api: ApiRequestService,
  slug: ManagedCopySlug
): Promise<DTOManagedCopy> {
  return api.apiRequest<DTOManagedCopy>({
    path: `/managed-copy/${slug}`,
    method: 'GET',
  });
}
