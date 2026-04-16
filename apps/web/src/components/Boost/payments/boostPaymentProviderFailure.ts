import { getOwnPropertyValue, isObjectLike } from '@podverse/helpers';

/** V4vProviderFailure shape (reason = provider response body message when present). */
export type ProviderFailureLike = { status?: number; reason?: string; retries?: number };

export const getProviderFailure = (
  error: unknown,
  failureProp: string
): ProviderFailureLike | null => {
  if (!isObjectLike(error)) {
    return null;
  }
  const providerFailure = getOwnPropertyValue(error, failureProp);
  if (!isObjectLike(providerFailure)) {
    return null;
  }
  const status = getOwnPropertyValue(providerFailure, 'status');
  const reason = getOwnPropertyValue(providerFailure, 'reason');
  const retries = getOwnPropertyValue(providerFailure, 'retries');
  return {
    status: typeof status === 'number' ? status : undefined,
    reason: typeof reason === 'string' ? reason : undefined,
    retries: typeof retries === 'number' ? retries : undefined,
  };
};
