import type {
  BillingAmount,
  BillingRevocationReason,
  NormalizedBillingEvent,
} from './normalizedEvents.js';
import type { PaymentProcessorId } from './paymentProcessorId.js';
import type { PurchaseKind } from './purchaseKind.js';
import type { BillingSubscriptionStatus } from './subscriptionStatus.js';

/**
 * The contract every payment processor implements. Vendor packages export a factory returning
 * this interface, apps register the adapters they have credentials for, and `@podverse/billing`
 * drives them without knowing which vendor is behind an id. It lives here, below the vendor
 * packages, so a vendor package depends on nothing but `@podverse/helpers`.
 *
 * Timestamps are ISO-8601 UTC strings, matching the normalized events.
 */

/** Header names in lower case, as Node's `IncomingHttpHeaders` delivers them. */
export type BillingWebhookHeaders = Readonly<Record<string, string | string[] | undefined>>;

export interface BillingWebhookRequest {
  /**
   * The body exactly as received. Signatures are computed over these bytes, so the route must pass
   * the raw body and never re-serialized JSON.
   */
  rawBody: Uint8Array | string;
  headers: BillingWebhookHeaders;
}

export interface BillingWebhookParseResult {
  /**
   * The processor payload format (for example `asn-v2`), stored on every inbox row the webhook
   * produces so a payload can be re-read after the vendor changes its format.
   */
  schemaVersion: string;
  /** The decoded vendor payload, kept beside each event so a mapping fix can be replayed. */
  rawPayload: Record<string, unknown>;
  /**
   * Empty when the notification is authentic but carries nothing billing acts on (test pings,
   * unhandled types). Each event needs its own `processorEventId`: when one notification maps to
   * two events, suffix the vendor id so both reach the inbox.
   */
  events: NormalizedBillingEvent[];
}

/**
 * Identifies a processor record. Google Play reads a purchase by token and product id together,
 * so the product id travels with the external id; other processors ignore it.
 */
export interface BillingProcessorRecordRef {
  externalId: string;
  externalProductId: string | null;
  /**
   * The store-signed transaction the device holds. Only Apple's Xcode StoreKit Testing mode reads
   * it, because Apple's servers have no record of those purchases. Every other mode looks the
   * record up by id and ignores this.
   */
  signedTransaction?: string | null;
}

/** The processor's current view of a subscription, used by reconciliation and restore. */
export interface NormalizedSubscriptionSnapshot {
  processor: PaymentProcessorId;
  externalSubscriptionId: string;
  accountBillingCustomerRef: string | null;
  externalProductId: string | null;
  externalBasePlanId: string | null;
  status: BillingSubscriptionStatus;
  purchaseKind: PurchaseKind;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  isSandbox: boolean;
  /** When the processor was asked. A snapshot overrides any event that occurred before it. */
  fetchedAt: string;
  schemaVersion: string;
  rawPayload: Record<string, unknown>;
}

/** The processor's current view of one payment, used to verify a purchase a client posts. */
export interface NormalizedTransactionSnapshot {
  processor: PaymentProcessorId;
  externalTransactionId: string;
  /** Set when the payment belongs to a subscription. */
  externalSubscriptionId: string | null;
  accountBillingCustomerRef: string | null;
  externalProductId: string | null;
  externalBasePlanId: string | null;
  purchaseKind: PurchaseKind;
  settledAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  amount: BillingAmount | null;
  revokedAt: string | null;
  revocationReason: BillingRevocationReason | null;
  isSandbox: boolean;
  fetchedAt: string;
  schemaVersion: string;
  rawPayload: Record<string, unknown>;
}

/**
 * `manage_in_store`: the processor does not let a server turn off auto-renew, so the client sends
 * the member to the store's subscription settings.
 */
export type BillingCancelAutoRenewResult =
  { outcome: 'cancelled' } | { outcome: 'manage_in_store' };

export interface BillingPurchaseAcknowledgement {
  purchaseToken: string;
  externalProductId: string;
  purchaseKind: PurchaseKind;
}

export interface PaymentProcessorAdapter {
  readonly id: PaymentProcessorId;
  /** Throws `BillingWebhookVerificationError` when the request is not authentic. */
  verifyAndParseWebhook(request: BillingWebhookRequest): Promise<BillingWebhookParseResult>;
  /** Throws `BillingProcessorRecordNotFoundError` when the processor has no such subscription. */
  fetchSubscription(ref: BillingProcessorRecordRef): Promise<NormalizedSubscriptionSnapshot>;
  /** Throws `BillingProcessorRecordNotFoundError` when the processor has no such payment. */
  fetchTransaction(ref: BillingProcessorRecordRef): Promise<NormalizedTransactionSnapshot>;
  /** Processors that refund unacknowledged purchases (Google Play) implement this. */
  acknowledgePurchase?(purchase: BillingPurchaseAcknowledgement): Promise<void>;
  /** When absent, turning off auto-renew is `manage_in_store`. */
  cancelAutoRenew?(externalSubscriptionId: string): Promise<BillingCancelAutoRenewResult>;
}

/** The webhook signature, token, or certificate chain did not verify. Answer 400 and store nothing. */
export class BillingWebhookVerificationError extends Error {
  readonly processor: PaymentProcessorId;

  constructor(processor: PaymentProcessorId, message: string) {
    super(message);
    this.name = 'BillingWebhookVerificationError';
    this.processor = processor;
  }
}

export class BillingProcessorRecordNotFoundError extends Error {
  readonly processor: PaymentProcessorId;
  readonly externalId: string;

  constructor(processor: PaymentProcessorId, externalId: string) {
    super(`${processor} has no record of ${externalId}`);
    this.name = 'BillingProcessorRecordNotFoundError';
    this.processor = processor;
    this.externalId = externalId;
  }
}
