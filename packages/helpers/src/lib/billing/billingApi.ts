/** The installed app's version; purchase routes compare it with the channel's minimum. */
export const BILLING_CLIENT_VERSION_HEADER = 'X-Podverse-Client-Version';

/** A `BillingPlatform`; requests without a valid value are treated as `web`. */
export const BILLING_CLIENT_PLATFORM_HEADER = 'X-Podverse-Client-Platform';

/**
 * Error codes the billing routes return in the `code` field. Each doubles as the i18n key a client
 * uses to explain the failure.
 */
export const BILLING_API_ERROR_CODES = {
  accountUnresolved: 'billing.account_unresolved',
  clientUpdateRequired: 'billing.client_update_required',
  eventRejected: 'billing.event_rejected',
  processorUnavailable: 'billing.processor_unavailable',
  productUnavailable: 'billing.product_unavailable',
  purchaseNotFound: 'billing.purchase_not_found',
  subscriptionAlreadyActive: 'billing.subscription_already_active',
  subscriptionNotFound: 'billing.subscription_not_found',
  testAdapterUnavailable: 'billing.test_adapter_unavailable',
  webhookVerificationFailed: 'billing.webhook_verification_failed',
} as const;

export type BillingApiErrorCode =
  (typeof BILLING_API_ERROR_CODES)[keyof typeof BILLING_API_ERROR_CODES];

/** Body of a billing route error response. */
export interface BillingApiErrorBody {
  message: string;
  code: BillingApiErrorCode;
  i18nKey: BillingApiErrorCode;
  /** Present on `billing.client_update_required`. */
  min_client_version?: string;
}
