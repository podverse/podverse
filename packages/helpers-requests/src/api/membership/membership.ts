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
    path: '/product/membership/pricing',
    method: 'GET',
  });
}

/** Prices and the annual savings percent from the public product catalog. */
type ProductMembershipCatalog = {
  annuallySavingsPercent: number;
  premiumMembershipCostAnnually: number;
  premiumMembershipCostMonthly: number;
};

export async function reqProductMembershipGet(api: ApiRequestService) {
  return api.apiRequest<{ data: ProductMembershipCatalog }>({
    path: '/product/membership',
    method: 'GET',
  });
}
