import type { PaymentProcessorAdapter, PaymentProcessorId } from '@podverse/helpers';

import { BillingAdapterNotRegisteredError } from './errors.js';

/**
 * The processors this deployment takes payment through. Apps register an adapter for each
 * processor they have enabled; a processor with no adapter is simply not offered, so a
 * build can leave any vendor package out.
 */
export class BillingAdapterRegistry {
  private readonly adapters = new Map<PaymentProcessorId, PaymentProcessorAdapter>();

  /** Throws when the processor already has an adapter, so a wiring mistake fails at startup. */
  register(adapter: PaymentProcessorAdapter): void {
    if (this.adapters.has(adapter.id)) {
      throw new Error(`A billing adapter is already registered for ${adapter.id}`);
    }
    this.adapters.set(adapter.id, adapter);
  }

  get(processorId: PaymentProcessorId): PaymentProcessorAdapter | null {
    return this.adapters.get(processorId) ?? null;
  }

  /** Throws `BillingAdapterNotRegisteredError` when the processor has no adapter. */
  require(processorId: PaymentProcessorId): PaymentProcessorAdapter {
    const adapter = this.adapters.get(processorId);
    if (adapter === undefined) {
      throw new BillingAdapterNotRegisteredError(processorId);
    }
    return adapter;
  }

  has(processorId: PaymentProcessorId): boolean {
    return this.adapters.has(processorId);
  }

  list(): PaymentProcessorAdapter[] {
    return [...this.adapters.values()];
  }
}
