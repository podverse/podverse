/**
 * Processors Podverse can take payment through. `test` is a server-side sandbox processor and is
 * refused in production.
 *
 * The set grows when an adapter is added, so wire payloads carry the id as a plain string. Clients
 * narrow it with `isPaymentProcessorId` and skip ids they do not recognize instead of failing,
 * which lets the server offer a new processor before every installed app knows about it.
 */
export const PAYMENT_PROCESSOR_IDS = ['paypal', 'apple', 'google_play', 'test'] as const;

export type PaymentProcessorId = (typeof PAYMENT_PROCESSOR_IDS)[number];

export function isPaymentProcessorId(value: string): value is PaymentProcessorId {
  return PAYMENT_PROCESSOR_IDS.some((id) => id === value);
}
