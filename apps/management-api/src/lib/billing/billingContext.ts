import type {
  BillingAdapterRegistry,
  BillingEventProcessor,
  ConfiguredBillingAdapters,
} from '@podverse/billing';
import {
  BillingAdapterRegistry as BillingAdapterRegistryClass,
  BillingEventProcessor as BillingEventProcessorClass,
  createOrmBillingLedgerStore,
  parseSandboxAllowedAccountIds,
  registerConfiguredBillingAdapters,
} from '@podverse/billing';

export interface ManagementBillingContextConfig extends ConfiguredBillingAdapters {
  /** Raw `BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS`. */
  sandboxAllowedAccountIds: string | undefined;
}

export interface ManagementBillingContext {
  registry: BillingAdapterRegistry;
  processor: BillingEventProcessor;
}

let billingContext: ManagementBillingContext | null = null;

/**
 * Builds the adapters and the event processor once at startup; calling again replaces them.
 * Resync and replay run through this process, which needs the same processor credentials the
 * API and workers hold.
 */
export function initManagementBillingContext(
  config: ManagementBillingContextConfig
): ManagementBillingContext {
  const registry = new BillingAdapterRegistryClass();
  registerConfiguredBillingAdapters(registry, config);
  const processor = new BillingEventProcessorClass({
    store: createOrmBillingLedgerStore(),
    sandboxPolicy: {
      isProduction: config.nodeEnv === 'production',
      allowedAccountIds: parseSandboxAllowedAccountIds(config.sandboxAllowedAccountIds),
    },
  });
  billingContext = { registry, processor };
  return billingContext;
}

export function getManagementBillingContext(): ManagementBillingContext {
  if (billingContext === null) {
    throw new Error(
      'Billing context not initialized; call initManagementBillingContext from startup first'
    );
  }
  return billingContext;
}
