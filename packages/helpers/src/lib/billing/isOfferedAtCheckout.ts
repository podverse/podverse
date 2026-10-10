import { compareClientVersion } from './compareClientVersion.js';

export interface CheckoutChannelOfferability {
  enabled: boolean;
  minClientVersion: string | null;
  storefrontAllowlist: readonly string[];
}

export interface CheckoutProductOfferability {
  isActive: boolean;
}

function includesStorefront(allowlist: readonly string[], storefront: string | null): boolean {
  if (allowlist.length === 0) {
    return true;
  }
  if (storefront === null) {
    return false;
  }
  const requested = storefront.trim().toUpperCase();
  if (requested === '') {
    return false;
  }
  return allowlist.some((value) => value.trim().toUpperCase() === requested);
}

export function isOfferedAtCheckout(params: {
  channel: CheckoutChannelOfferability;
  product: CheckoutProductOfferability;
  storefront: string | null;
  clientVersion: string | null;
}): boolean {
  if (!params.channel.enabled || !params.product.isActive) {
    return false;
  }

  if (!includesStorefront(params.channel.storefrontAllowlist, params.storefront)) {
    return false;
  }

  if (params.channel.minClientVersion === null) {
    return true;
  }

  return compareClientVersion(params.clientVersion, params.channel.minClientVersion) >= 0;
}
