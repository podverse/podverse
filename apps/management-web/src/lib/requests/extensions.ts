import type { ExtensionKind } from '@podverse/extensions-sdk';

import { ManagementApiRequestService } from './apiRequestService';

function createService(jwt?: string): ManagementApiRequestService {
  return new ManagementApiRequestService(jwt);
}

export type ExtensionListItem = {
  id: string;
  name: string;
  description: string;
  kind: ExtensionKind;
  enabled: boolean;
  updatedAt: string | null;
  updatedByAdminId: number | null;
};

export type ExtensionDetail = {
  id: string;
  name: string;
  description: string;
  kind: ExtensionKind;
  enabled: boolean;
  resolved: {
    enabled: boolean;
    config: Record<string, unknown>;
  };
  config: Record<string, unknown> | null;
  updatedAt: string | null;
  updatedByAdminId: number | null;
};

export type ExtensionsUpdateBody = {
  enabled: boolean;
  config: Record<string, unknown>;
};

export async function reqExtensionsList(jwt?: string): Promise<ExtensionListItem[]> {
  const service = createService(jwt);
  const response = await service.apiRequest<{ extensions: ExtensionListItem[] }>({
    path: '/extensions',
    method: 'GET',
  });
  return response.extensions;
}

export async function reqExtensionsGet(id: string, jwt?: string): Promise<ExtensionDetail> {
  const service = createService(jwt);
  return service.apiRequest<ExtensionDetail>({
    path: `/extensions/${encodeURIComponent(id)}`,
    method: 'GET',
  });
}

export async function reqExtensionsUpdate(
  id: string,
  body: ExtensionsUpdateBody,
  jwt?: string
): Promise<ExtensionDetail> {
  const service = createService(jwt);
  await service.apiRequest({
    path: `/extensions/${encodeURIComponent(id)}`,
    method: 'PUT',
    data: body,
  });

  return reqExtensionsGet(id, jwt);
}
