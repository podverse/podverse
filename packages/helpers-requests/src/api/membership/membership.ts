import type { DTOMembershipComparison } from '@podverse/helpers';

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

/** Prices, the annual savings percent, and the default Add by RSS feed limit. */
type ProductMembershipCatalog = {
  annuallySavingsPercent: number;
  maxAddByRSSFeeds: number;
  premiumMembershipCostAnnually: number;
  premiumMembershipCostMonthly: number;
};

export async function reqProductMembershipGet(api: ApiRequestService) {
  return api.apiRequest<{ data: ProductMembershipCatalog }>({
    path: '/product/membership',
    method: 'GET',
  });
}

/** Localized feature table and Trial limitations for the caller's Accept-Language. */
export async function reqMembershipComparisonGet(
  api: ApiRequestService,
  options?: { locale?: string }
) {
  const locale = options?.locale?.trim() ?? '';
  return api.apiRequest<{ data: DTOMembershipComparison }>({
    path: '/product/membership/comparison',
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
