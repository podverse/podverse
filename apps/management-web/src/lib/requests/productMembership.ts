import type { ResolvedProductMembership } from '@podverse/helpers';

import { ManagementApiRequestService } from './apiRequestService';

export type ResolvedProductMembershipResponse = {
  data: ResolvedProductMembership;
};

export type UpdateProductMembershipTrialRequest = {
  freeTrialExpirationSeconds: number;
};

export async function getResolvedProductMembership(
  jwt?: string
): Promise<ResolvedProductMembershipResponse> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<ResolvedProductMembershipResponse>({
    path: '/product/membership',
  });
}

export async function updateProductMembershipTrial(
  payload: UpdateProductMembershipTrialRequest,
  jwt?: string
): Promise<ResolvedProductMembershipResponse> {
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<ResolvedProductMembershipResponse>({
    path: '/product/membership',
    method: 'PATCH',
    data: payload,
  });
}
