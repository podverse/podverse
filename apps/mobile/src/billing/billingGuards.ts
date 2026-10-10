import { getErrorCode, getErrorResponseBodyCode } from '@podverse/helpers/error';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const billingErrorCode = (error: unknown): string | null =>
  getErrorResponseBodyCode(error) ?? getErrorCode(error) ?? null;

/** StoreKit Ask to Buy and Play pending both leave the transaction unfinished. */
export const isWaitingStoreError = (error: unknown): boolean => {
  const code = billingErrorCode(error);
  return code === 'E_PENDING' || code === 'E_DEFERRED_PAYMENT';
};

export const isCancelledStoreError = (error: unknown): boolean =>
  billingErrorCode(error) === 'E_USER_CANCELLED';

/**
 * Play returns one of these when the same prepaid product is still owned. A top-up is a new
 * purchase token; this error means the store did not start one, so the caller restores once.
 */
const ALREADY_OWNED_STORE_CODES = new Set([
  '7',
  'already-owned',
  'E_ALREADY_OWNED',
  'E_ITEM_ALREADY_OWNED',
  'ITEM_ALREADY_OWNED',
]);

export const isAlreadyOwnedStoreError = (error: unknown): boolean => {
  const code = billingErrorCode(error);
  return code !== null && ALREADY_OWNED_STORE_CODES.has(code);
};
