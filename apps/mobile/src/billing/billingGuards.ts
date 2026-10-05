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
