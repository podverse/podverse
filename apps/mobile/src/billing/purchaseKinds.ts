import type { BillingApi, BillingCheckoutCatalog } from './billingApi';
import type { BillingPurchaseKind } from './BillingClient';

export const mergeCatalogKinds = (
  kinds: Map<string, BillingPurchaseKind>,
  catalog: BillingCheckoutCatalog
): void => {
  for (const processor of catalog.processors) {
    for (const product of processor.products) {
      if (!kinds.has(product.external_product_id)) {
        kinds.set(product.external_product_id, product.purchase_kind);
      }
    }
  }
};

export const resolvePurchaseKind = async (params: {
  api: BillingApi;
  kinds: Map<string, BillingPurchaseKind>;
  platform: 'android' | 'ios';
  productId: string;
  storefront: string | null;
}): Promise<BillingPurchaseKind | null> => {
  const known = params.kinds.get(params.productId);
  if (known !== undefined) {
    return known;
  }
  const catalog = await params.api.getCheckoutOptions({
    platform: params.platform,
    storefront: params.storefront,
  });
  mergeCatalogKinds(params.kinds, catalog);
  return params.kinds.get(params.productId) ?? null;
};
