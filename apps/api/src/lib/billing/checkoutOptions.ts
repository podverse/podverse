import type { BillingAdapterRegistry } from '@podverse/billing';
import type {
  BillingPlatform,
  DTOBillingCheckoutOptions,
  DTOBillingCheckoutProduct,
  PaymentProcessorId,
} from '@podverse/helpers';
import { isOfferedAtCheckout, isPaymentProcessorId } from '@podverse/helpers';
import type { BillingCheckoutChannel } from '@podverse/orm';
import { BillingCheckoutChannelService, BillingProcessorProductService } from '@podverse/orm';

/** Channel toggles made in management reach clients within this window. */
export const BILLING_CHANNEL_CACHE_TTL_MS = 60_000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const checkoutOptionsCache = new Map<string, CacheEntry<DTOBillingCheckoutOptions>>();
const channelCache = new Map<string, CacheEntry<BillingCheckoutChannel | null>>();

function readCache<T>(cache: Map<string, CacheEntry<T>>, key: string, now: number): T | undefined {
  const entry = cache.get(key);
  if (entry === undefined || entry.expiresAt <= now) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function writeCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, now: number) {
  cache.set(key, { value, expiresAt: now + BILLING_CHANNEL_CACHE_TTL_MS });
}

/** Drops cached channels and checkout options, for tests that change channel rows. */
export function clearBillingChannelCache(): void {
  checkoutOptionsCache.clear();
  channelCache.clear();
}

/** A storefront is an ISO 3166-1 alpha-2 country code; anything else is ignored. */
export function normalizeStorefront(value: string | undefined): string | null {
  const normalized = value?.trim().toUpperCase() ?? '';
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

/**
 * Enabled channels for the platform and storefront, limited to processors this deployment has an
 * adapter for, each with its active products.
 */
export async function getCheckoutOptions(params: {
  registry: BillingAdapterRegistry;
  platform: BillingPlatform;
  storefront: string | null;
  clientVersion: string | null;
  now?: number;
}): Promise<DTOBillingCheckoutOptions> {
  const now = params.now ?? Date.now();
  const cacheKey = `${params.platform}|${params.storefront ?? ''}|${params.clientVersion ?? ''}`;
  const cached = readCache(checkoutOptionsCache, cacheKey, now);
  if (cached !== undefined) {
    return cached;
  }

  const channels = await new BillingCheckoutChannelService().listEnabledChannels({
    platform: params.platform,
    storefront: params.storefront,
  });
  const offered = channels.filter(
    (channel): channel is BillingCheckoutChannel & { processor_id: PaymentProcessorId } =>
      isPaymentProcessorId(channel.processor_id) && params.registry.has(channel.processor_id)
  );
  const products = await new BillingProcessorProductService().listActiveForProcessors(
    offered.map((channel) => channel.processor_id)
  );

  const options: DTOBillingCheckoutOptions = {
    platform: params.platform,
    storefront: params.storefront,
    processors: offered.map((channel) => ({
      processor_id: channel.processor_id,
      min_client_version: channel.min_client_version,
      products: products
        .filter(
          (product) =>
            product.processor_id === channel.processor_id &&
            isOfferedAtCheckout({
              channel: {
                enabled: channel.enabled,
                minClientVersion: channel.min_client_version,
                storefrontAllowlist: channel.storefront_allowlist,
              },
              product: { isActive: product.is_active },
              storefront: params.storefront,
              clientVersion: params.clientVersion,
            })
        )
        .map((product): DTOBillingCheckoutProduct => ({
          id: product.id,
          product_code: product.billing_product.product_code,
          cadence: product.billing_cadence,
          external_product_id: product.external_product_id,
          external_base_plan_id: product.external_base_plan_id,
        })),
    })),
  };
  writeCache(checkoutOptionsCache, cacheKey, options, now);
  return options;
}

/** The channel row for a purchase route's client version check. */
export async function getCheckoutChannel(
  processorId: PaymentProcessorId,
  platform: BillingPlatform,
  now: number = Date.now()
): Promise<BillingCheckoutChannel | null> {
  const cacheKey = `${processorId}|${platform}`;
  const cached = readCache(channelCache, cacheKey, now);
  if (cached !== undefined) {
    return cached;
  }
  const channel = await new BillingCheckoutChannelService().getChannel(processorId, platform);
  writeCache(channelCache, cacheKey, channel, now);
  return channel;
}
