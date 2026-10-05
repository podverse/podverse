import type { DTOBillingStatus } from './billingStatus.js';

/** How the server recorded one billing event from a purchase, restore, or simulation. */
export interface DTOBillingEventOutcome {
  status: 'processed' | 'duplicate' | 'ignored_sandbox' | 'failed';
  /** A `BillingEventErrorCode` when `status` is `failed`. */
  error_code: string | null;
}

/** The result of confirming a store purchase, capturing a PayPal order, or restoring purchases. */
export interface DTOBillingPurchaseResult {
  /**
   * Every event was recorded (processed or already recorded), so the client may finish the store
   * transaction. When false, keep the transaction unfinished and retry later.
   */
  confirmed: boolean;
  outcomes: DTOBillingEventOutcome[];
  status: DTOBillingStatus;
}

/** A PayPal order waiting for the buyer's approval. */
export interface DTOBillingPayPalOrder {
  order_id: string;
  status: string | null;
  /** Where to send the buyer to approve the order; null when PayPal returned no approval link. */
  approve_url: string | null;
}

/** A PayPal auto-renew subscription waiting for the buyer's approval. */
export interface DTOBillingPayPalSubscription {
  subscription_id: string;
  status: string | null;
  approve_url: string | null;
  /**
   * When PayPal first charges. Set to the current membership expiry when the account still has
   * time left, so the subscription starts after it instead of overlapping it.
   */
  start_time: string | null;
}

export interface DTOBillingCancelSubscriptionResult {
  /**
   * `manage_in_store`: the store owns the subscription, so send the user to the App Store or Play
   * subscription settings. Status updates when the store notifies the server.
   */
  outcome: 'cancelled' | 'manage_in_store';
  status: DTOBillingStatus;
}

/** The result of a non-production test-processor event. */
export interface DTOBillingSimulationResult {
  outcome: DTOBillingEventOutcome;
  status: DTOBillingStatus;
}
