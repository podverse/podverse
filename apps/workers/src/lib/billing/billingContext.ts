import type { ConfiguredBillingAdapters } from '@podverse/billing';
import {
  BillingAdapterRegistry,
  BillingEventProcessor,
  createOrmBillingLedgerStore,
  parseSandboxAllowedAccountIds,
  registerConfiguredBillingAdapters,
} from '@podverse/billing';
import type { GooglePlayClient } from '@podverse/external-services-google-play';

export interface BillingContextConfig extends ConfiguredBillingAdapters {
  /** Raw `BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS`. */
  sandboxAllowedAccountIds: string | undefined;
}

export interface BillingContext {
  registry: BillingAdapterRegistry;
  processor: BillingEventProcessor;
  googlePlayClient: GooglePlayClient | null;
}

let billingContext: BillingContext | null = null;

/**
 * Builds the adapters and the event processor for a Billing-category command. Needs the ORM
 * context, because the ledger store opens its services on creation.
 */
export function initBillingContext(config: BillingContextConfig): BillingContext {
  const registry = new BillingAdapterRegistry();
  const { googlePlayClient } = registerConfiguredBillingAdapters(registry, config);
  const processor = new BillingEventProcessor({
    store: createOrmBillingLedgerStore(),
    sandboxPolicy: {
      isProduction: config.nodeEnv === 'production',
      allowedAccountIds: parseSandboxAllowedAccountIds(config.sandboxAllowedAccountIds),
    },
  });
  billingContext = { registry, processor, googlePlayClient };
  return billingContext;
}

export function getBillingContext(): BillingContext {
  if (billingContext === null) {
    throw new Error(
      'Billing context not initialized; the command needs the Billing startup category'
    );
  }
  return billingContext;
}
