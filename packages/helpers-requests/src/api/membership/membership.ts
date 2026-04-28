import type { ApiRequestService } from '../_request.js';

type MembershipPricingData = {
  costMonthly: number;
  costAnnually: number;
  freeTrialExpiration: number;
  freeTrialDays: number;
  annuallySavingsPercent: number;
  monthlyEquivalentAnnually: number;
};

export async function reqMembershipGetPricing(api: ApiRequestService) {
  return api.apiRequest<{ data: MembershipPricingData } | { message: string }>({
    path: '/membership/pricing',
    method: 'GET',
  });
}
