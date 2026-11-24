/** Keysend of a whole number of sats. `customRecords` values are strings, keyed by TLV type. */
export type BoostKeysendPayment = {
  destination: string;
  amountSats: number;
  customRecords?: Record<string, string>;
};

/**
 * Pays one Lightning recipient. `payInvoice` pays a BOLT11 invoice string.
 * `keysend` sends sats to a node pubkey. Both methods are required.
 * A wallet that cannot keysend rejects `keysend` with an Error.
 * There is no enable, login, or connect method here. The app does that
 * before it calls `sendManualBoost`, and it does not call `sendManualBoost`
 * when it has no provider.
 */
export type BoostPaymentProvider = {
  payInvoice: (invoice: string) => Promise<void>;
  keysend: (payment: BoostKeysendPayment) => Promise<void>;
};
