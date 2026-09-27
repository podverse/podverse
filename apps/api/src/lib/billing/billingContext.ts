import type { TestPaymentProcessorAdapter } from '@podverse/billing';
import {
  BillingAdapterRegistry,
  BillingEventProcessor,
  createOrmBillingLedgerStore,
  parseSandboxAllowedAccountIds,
} from '@podverse/billing';
import type { PayPalService } from '@podverse/external-services-paypal';

import type { BillingAdaptersConfig } from './registerBillingAdapters.js';
import { registerBillingAdapters } from './registerBillingAdapters.js';

export interface BillingContextConfig extends BillingAdaptersConfig {
  /** Raw `BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS`. */
  sandboxAllowedAccountIds: string | undefined;
}

export interface BillingContext {
  registry: BillingAdapterRegistry;
  processor: BillingEventProcessor;
  paypalService: PayPalService | null;
  testAdapter: TestPaymentProcessorAdapter | null;
}

let billingContext: BillingContext | null = null;

/** Builds the adapters and the event processor once at startup; calling again replaces them. */
export function initBillingContext(config: BillingContextConfig): BillingContext {
  const registry = new BillingAdapterRegistry();
  const { paypalService, testAdapter } = registerBillingAdapters(registry, config);
  const processor = new BillingEventProcessor({
    store: createOrmBillingLedgerStore(),
    sandboxPolicy: {
      isProduction: config.nodeEnv === 'production',
      allowedAccountIds: parseSandboxAllowedAccountIds(config.sandboxAllowedAccountIds),
    },
  });
  billingContext = { registry, processor, paypalService, testAdapter };
  return billingContext;
}

export function getBillingContext(): BillingContext {
  if (billingContext === null) {
    throw new Error('Billing context not initialized; call initBillingContext from startApp first');
  }
  return billingContext;
}
