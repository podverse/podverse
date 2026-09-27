import type { NormalizedBillingEvent, NormalizedBillingEventType } from '@podverse/helpers';
import { isPaymentProcessorId } from '@podverse/helpers';

const NORMALIZED_BILLING_EVENT_TYPES: readonly NormalizedBillingEventType[] = [
  'payment_settled',
  'subscription_activated',
  'subscription_renewed',
  'subscription_renewal_failed',
  'grace_entered',
  'grace_exited',
  'subscription_cancelled',
  'subscription_expired',
  'refund_or_revoke',
];

/**
 * Checks the fields every event carries. The inbox only holds events this package wrote, so the
 * type-specific fields are trusted once the envelope matches.
 */
export function isNormalizedBillingEvent(value: unknown): value is NormalizedBillingEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const type = Reflect.get(value, 'type');
  const processor = Reflect.get(value, 'processor');
  const accountBillingCustomerRef = Reflect.get(value, 'accountBillingCustomerRef');
  const accountId = Reflect.get(value, 'accountId');
  return (
    NORMALIZED_BILLING_EVENT_TYPES.some((eventType) => eventType === type) &&
    typeof processor === 'string' &&
    isPaymentProcessorId(processor) &&
    typeof Reflect.get(value, 'processorEventId') === 'string' &&
    typeof Reflect.get(value, 'occurredAt') === 'string' &&
    typeof Reflect.get(value, 'isSandbox') === 'boolean' &&
    (accountBillingCustomerRef === null || typeof accountBillingCustomerRef === 'string') &&
    (accountId === null || typeof accountId === 'number')
  );
}
