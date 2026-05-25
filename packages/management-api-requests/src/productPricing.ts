import type { BillingCadence } from '@podverse/helpers';

import { ManagementApiRequestService } from './apiRequestService.js';

export type ProductPricingRow = {
  id: number;
  product_code: string;
  currency_code: string;
  billing_cadence: BillingCadence;
  amount_cents: number;
  effective_from: string;
  effective_to: string | null;
  source: string;
};

export type ProductPricingActiveResponse = {
  data: ProductPricingRow[];
};

export async function getActiveProductPricing(jwt?: string): Promise<ProductPricingActiveResponse> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<ProductPricingActiveResponse>({
    path: '/products/pricing/active',
  });
}

export type ScheduleProductPricingRequest = {
  productCode?: string;
  currencyCode?: string;
  cadence: BillingCadence;
  amountCents: number;
  effectiveFrom?: string;
  changeReason?: string | null;
};

export type ScheduleProductPricingResponse = {
  data: { id: number };
};

export async function scheduleProductPricing(
  payload: ScheduleProductPricingRequest,
  jwt?: string
): Promise<ScheduleProductPricingResponse> {
  const service = new ManagementApiRequestService({ jwt });
  return service.apiRequest<ScheduleProductPricingResponse>({
    path: '/products/pricing/schedule',
    method: 'POST',
    data: {
      productCode: payload.productCode ?? 'membership_premium',
      currencyCode: payload.currencyCode ?? 'USD',
      cadence: payload.cadence,
      amountCents: payload.amountCents,
      effectiveFrom: payload.effectiveFrom,
      changeReason: payload.changeReason,
    },
  });
}
