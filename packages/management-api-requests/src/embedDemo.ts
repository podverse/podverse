import type { EmbedDemoShowcaseAdminResponse, EmbedDemoShowcaseAdminSlot } from '@podverse/helpers';

import { ManagementApiRequestService } from './apiRequestService.js';

export type { EmbedDemoShowcaseAdminSlot };

export async function listEmbedDemoShowcaseSlots(
  jwt?: string
): Promise<EmbedDemoShowcaseAdminResponse> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<EmbedDemoShowcaseAdminResponse>({
    path: '/web/embed-demo/showcase',
  });
}

export async function upsertEmbedDemoShowcaseSlot(
  showcaseId: string,
  resourceIdText: string,
  jwt?: string
): Promise<{ data: { showcaseId: string; resourceIdText: string } }> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<{ data: { showcaseId: string; resourceIdText: string } }>({
    path: `/web/embed-demo/showcase/${encodeURIComponent(showcaseId)}`,
    method: 'PUT',
    data: { resourceIdText },
  });
}

export async function deleteEmbedDemoShowcaseSlot(showcaseId: string, jwt?: string): Promise<void> {
  const service = new ManagementApiRequestService({ jwt });
  await service.apiRequest<void>({
    path: `/web/embed-demo/showcase/${encodeURIComponent(showcaseId)}`,
    method: 'DELETE',
  });
}
