import type { BillingLocalizedPrice } from './BillingClient';
import { isRecord } from './billingGuards';

/** Loads product and subscription rows and keeps the first localized price for each id. */
export const listStorePrices = async (
  productIds: readonly string[],
  loadProducts: (skus: string[]) => Promise<readonly unknown[]>,
  loadSubscriptions: (skus: string[]) => Promise<readonly unknown[]>
): Promise<readonly BillingLocalizedPrice[]> => {
  if (productIds.length === 0) {
    return [];
  }
  const skus = [...productIds];
  const settled = await Promise.allSettled([loadProducts(skus), loadSubscriptions(skus)]);
  const products = settled.flatMap((result) =>
    result.status === 'fulfilled' ? [...result.value] : []
  );
  return localizedPricesFromStoreProducts(products);
};

/**
 * Reads `id` and `displayPrice` off store product objects. Ids without a price string are omitted,
 * and a later row for the same id does not replace the first.
 */
export const localizedPricesFromStoreProducts = (
  products: readonly unknown[]
): readonly BillingLocalizedPrice[] => {
  const seen = new Set<string>();
  const prices: BillingLocalizedPrice[] = [];

  for (const product of products) {
    if (!isRecord(product)) {
      continue;
    }
    const productId = product.id;
    const displayPrice = product.displayPrice;
    if (typeof productId !== 'string' || productId === '') {
      continue;
    }
    if (typeof displayPrice !== 'string' || displayPrice === '') {
      continue;
    }
    if (seen.has(productId)) {
      continue;
    }
    seen.add(productId);
    prices.push({ displayPrice, productId });
  }

  return prices;
};
