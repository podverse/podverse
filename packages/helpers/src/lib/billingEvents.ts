export const BILLING_EVENT_TYPES = {
  PAYMENT_SETTLED: 'payment_settled',
  RENEWAL_SUCCEEDED: 'renewal_succeeded',
  RENEWAL_FAILED: 'renewal_failed',
  PAY_ON_DEMAND_EXTENSION_REQUESTED: 'pay_on_demand_extension_requested',
} as const;

export type BillingEventType = (typeof BILLING_EVENT_TYPES)[keyof typeof BILLING_EVENT_TYPES];
