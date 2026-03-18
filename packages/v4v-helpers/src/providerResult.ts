/**
 * Shared structured result and failure types for V4V provider requests
 * (e.g. Lightning Address/LNURL, future ETH or other chains).
 * Lets the frontend handle success/failure and UI rendering consistently
 * across value types.
 */

/** Failure info when a provider request fails (e.g. after retries). step is provider-specific (e.g. 'details' | 'invoice' for LN, 'quote' for ETH). */
export type V4VProviderFailure = {
  step: string;
  status: number;
  reason?: string;
  retries: number;
};

/** Discriminated result: success with data or failure with structured failure info. */
export type V4VResult<T, F = V4VProviderFailure> =
  | { ok: true; data: T }
  | { ok: false; failure: F };

/**
 * Builds a user-facing error message from a provider failure.
 * Use the same shape for all V4V types so the UI can display consistently.
 * @param failure - The structured failure from the provider layer
 * @param stepLabel - Human-readable step name (e.g. "LNURL details", "invoice", "quote")
 */
export function buildProviderErrorMessage(failure: V4VProviderFailure, stepLabel: string): string {
  const after =
    failure.retries > 0
      ? ` after ${failure.retries} retr${failure.retries === 1 ? 'y' : 'ies'}`
      : '';
  const providerPart =
    failure.status > 0
      ? failure.reason !== undefined && failure.reason !== ''
        ? ` (provider returned ${failure.status}: ${failure.reason})`
        : ` (provider returned ${failure.status})`
      : failure.reason !== undefined && failure.reason !== ''
        ? ` (${failure.reason})`
        : '';
  return `Unable to fetch ${stepLabel}${after}${providerPart}.`;
}

/** Property name on Error objects for attached provider failure (so UI can read retries/step without parsing message). */
export const PROVIDER_FAILURE_PROP = 'providerFailure';

/**
 * Attaches structured failure to an Error so the frontend can read retries and render consistently.
 * The UI should read error[PROVIDER_FAILURE_PROP] or error.providerFailure for the same shape across LN, ETH, etc.
 */
export function attachProviderFailure(error: Error, failure: V4VProviderFailure): void {
  (error as Error & { [PROVIDER_FAILURE_PROP]: V4VProviderFailure })[PROVIDER_FAILURE_PROP] =
    failure;
}
