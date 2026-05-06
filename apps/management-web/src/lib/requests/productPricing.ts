import type { BillingCadence } from '@podverse/helpers';

import { ManagementApiRequestService } from './apiRequestService';

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
  const service = new ManagementApiRequestService(jwt);
  return service.apiRequest<ProductPricingActiveResponse>({
    path: '/product/pricing/active',
  });
}
