import type { ResolvedProductMembership } from '@podverse/helpers';

import { ManagementApiRequestService } from './apiRequestService.js';

export type ResolvedProductMembershipResponse = {
  data: ResolvedProductMembership;
};

export type UpdateProductMembershipSettingsRequest = {
  freeTrialExpirationSeconds?: number;
  maxAddByRSSFeeds?: number;
  trialMaxManualRefreshesPerHour?: number;
  premiumMaxManualRefreshesPerHour?: number;
};

export async function getResolvedProductMembership(
  jwt?: string
): Promise<ResolvedProductMembershipResponse> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<ResolvedProductMembershipResponse>({
    path: '/products/membership',
  });
}

export async function updateProductMembershipSettings(
  payload: UpdateProductMembershipSettingsRequest,
  jwt?: string
): Promise<ResolvedProductMembershipResponse> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<ResolvedProductMembershipResponse>({
    path: '/products/membership',
    method: 'PATCH',
    data: payload,
  });
}
