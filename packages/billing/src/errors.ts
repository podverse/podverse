export const BILLING_EVENT_ERROR_CODES = [
  'account_unresolved',
  'account_conflict',
  'subscription_not_found',
  'transaction_not_found',
  'product_unmapped',
  'invalid_timestamp',
  'invalid_payload',
] as const;

export type BillingEventErrorCode = (typeof BILLING_EVENT_ERROR_CODES)[number];

/**
 * An event that cannot be applied yet or at all. The inbox row is marked failed with the message
 * and stays retryable: `subscription_not_found` usually clears once the event that creates the
 * subscription arrives, and `product_unmapped` once the processor product is seeded.
 */
export class BillingEventError extends Error {
  readonly code: BillingEventErrorCode;

  constructor(code: BillingEventErrorCode, message: string) {
    super(message);
    this.name = 'BillingEventError';
    this.code = code;
  }
}

export class BillingAdapterNotRegisteredError extends Error {
  readonly processorId: string;

  constructor(processorId: string) {
    super(`No billing adapter is registered for ${processorId}`);
    this.name = 'BillingAdapterNotRegisteredError';
    this.processorId = processorId;
  }
}

export class BillingTestAdapterRefusedError extends Error {
  constructor() {
    super(
      'The test billing adapter is refused in production unless BILLING_ALLOW_TEST_ADAPTER=true'
    );
    this.name = 'BillingTestAdapterRefusedError';
  }
}
