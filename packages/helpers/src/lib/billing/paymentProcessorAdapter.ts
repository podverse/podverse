import type {
  BillingAmount,
  BillingRevocationReason,
  NormalizedBillingEvent,
} from './normalizedEvents.js';
import type { PaymentProcessorId } from './paymentProcessorId.js';

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
  /**
   * Apple transaction id, Google Play purchase token, or PayPal capture id.
   */
  externalId: string;
  externalProductId: string | null;
  /**
   * The store-signed transaction the device holds. Only Apple's Xcode StoreKit Testing mode reads
   * it, because Apple's servers have no record of those purchases. Every other mode looks the
   * record up by id and ignores this.
   */
  signedTransaction?: string | null;
  /**
   * Google Play order id when the client already has it. The purchase token stays in `externalId`.
   * The snapshot is keyed by the order id Play reports, which has to match this value when it is
   * set. Other processors ignore it.
   */
  externalTransactionId?: string | null;
}

/** The processor's current view of one payment, used to verify a purchase a client posts. */
export interface NormalizedTransactionSnapshot {
  processor: PaymentProcessorId;
  externalTransactionId: string;
  accountBillingCustomerRef: string | null;
  externalProductId: string | null;
  externalBasePlanId: string | null;
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

export interface BillingPurchaseAcknowledgement {
  purchaseToken: string;
  externalProductId: string;
}

export interface PaymentProcessorAdapter {
  readonly id: PaymentProcessorId;
  /** Throws `BillingWebhookVerificationError` when the request is not authentic. */
  verifyAndParseWebhook(request: BillingWebhookRequest): Promise<BillingWebhookParseResult>;
  /** Throws `BillingProcessorRecordNotFoundError` when the processor has no such payment. */
  fetchTransaction(ref: BillingProcessorRecordRef): Promise<NormalizedTransactionSnapshot>;
  /** Processors that refund unacknowledged purchases (Google Play) implement this. */
  acknowledgePurchase?(purchase: BillingPurchaseAcknowledgement): Promise<void>;
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
