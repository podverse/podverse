import {
  getOwnPropertyValue,
  isFiniteNumber,
  isObjectLike,
  sleep,
  toNonEmptyTrimmedString,
} from '@podverse/helpers';
import { request } from '@podverse/helpers-requests';
import type { V4VProviderFailure, V4VResult } from '@podverse/v4v-helpers';
import { attachProviderFailure, buildProviderErrorMessage } from '@podverse/v4v-helpers';

export type LnurlpDetailsResponse = {
  callback: string;
  maxSendable: number;
  minSendable: number;
  metadata: string;
  tag: string;
  commentAllowed?: number;
  allowsNostr?: boolean;
  nostrPubkey?: string;
};

export type LnurlpInvoiceResponse = {
  pr: string;
  routes: string[];
  successAction?: {
    tag: string;
    message?: string;
    url?: string;
    description?: string;
  };
};

export type FetchLnurlDetailsParams = {
  lnurlOrAddress: string;
};

export type FetchLnurlInvoiceParams = {
  lnurlOrAddress: string;
  amountMsat: number;
  comment?: string;
  zapRequest?: string;
  /** Called after each failed attempt (1-based) with the error message for that attempt. */
  onAttemptFailed?: (attemptNumber: number, message: string) => void;
};

/** LN-specific failure (step is either details or invoice). Reuses shared V4VProviderFailure shape for consistent UI handling. */
export type LnurlpFailure = V4VProviderFailure & {
  step: 'details' | 'invoice';
};

export type FetchLnurlDetailsResult = V4VResult<LnurlpDetailsResponse, LnurlpFailure>;
export type FetchLnurlInvoiceResult = V4VResult<LnurlpInvoiceResponse, LnurlpFailure>;

/** LNURL details step (well-known URL): max retries before giving up. 1 retry = 2 total attempts. Retries only on 429 or 5xx. */
const MAX_RETRIES_DETAILS = 1;
/** LNURL invoice step (callback URL): max retries before giving up. 1 retry = 2 total attempts. Retries on 400, 429, or 5xx. */
const MAX_RETRIES_INVOICE = 1;
const RETRY_DELAY_MS = 500;

const isRetryableStatus = (status: number): boolean =>
  status === 429 || (status >= 500 && status < 600);

/** Invoice step only: also retry on 400 (e.g. "Recipient wallet error" may be transient). */
const isRetryableStatusForInvoice = (status: number): boolean =>
  status === 400 || isRetryableStatus(status);

const extractReason = (data: unknown): string | undefined => {
  if (!isObjectLike(data)) return undefined;
  const toOptionalNonEmpty = (value: unknown): string | undefined =>
    toNonEmptyTrimmedString(value) ?? undefined;
  return (
    toOptionalNonEmpty(data.reason) ??
    toOptionalNonEmpty(data.message) ??
    toOptionalNonEmpty(data.detail) ??
    toOptionalNonEmpty(data.error)
  );
};

const isLnurlpDetailsResponse = (value: unknown): value is LnurlpDetailsResponse => {
  const callback = getOwnPropertyValue(value, 'callback');
  const maxSendable = getOwnPropertyValue(value, 'maxSendable');
  const minSendable = getOwnPropertyValue(value, 'minSendable');
  const metadata = getOwnPropertyValue(value, 'metadata');
  const tag = getOwnPropertyValue(value, 'tag');
  const commentAllowed = getOwnPropertyValue(value, 'commentAllowed');

  return (
    typeof callback === 'string' &&
    typeof metadata === 'string' &&
    typeof tag === 'string' &&
    isFiniteNumber(maxSendable) &&
    isFiniteNumber(minSendable) &&
    (commentAllowed === undefined || isFiniteNumber(commentAllowed))
  );
};

const isLnurlpInvoiceResponse = (value: unknown): value is LnurlpInvoiceResponse => {
  const pr = getOwnPropertyValue(value, 'pr');
  const routes = getOwnPropertyValue(value, 'routes');
  return typeof pr === 'string' && Array.isArray(routes);
};

/**
 * Returns true when the lightning address domain is localhost or 127.0.0.1,
 * for local dev where LUD-16 is served locally.
 */
const isLocalhostAddress = (lnurlOrAddress: string): boolean => {
  const atIndex = lnurlOrAddress.indexOf('@');
  if (atIndex === -1) return false;
  const domain = lnurlOrAddress.slice(atIndex + 1);
  return domain.startsWith('localhost') || domain.startsWith('127.0.0.1');
};

/**
 * Constructs the LUD-16 well-known URL for a lightning address.
 * Uses http for localhost, https for remote domains.
 */
const buildWellKnownLnurlpUrl = (lnurlOrAddress: string): string | null => {
  const atIndex = lnurlOrAddress.indexOf('@');
  if (atIndex === -1) return null;
  const username = lnurlOrAddress.slice(0, atIndex);
  const domain = lnurlOrAddress.slice(atIndex + 1);
  if (!username || !domain) return null;
  const scheme = isLocalhostAddress(lnurlOrAddress) ? 'http' : 'https';
  return `${scheme}://${domain}/.well-known/lnurlp/${encodeURIComponent(username)}`;
};

const fetchDetailsFromWellKnown = async (
  wellKnownUrl: string
): Promise<FetchLnurlDetailsResult> => {
  let lastStatus = 0;
  let lastData: unknown;
  let retries = 0;
  for (let attempt = 0; attempt <= MAX_RETRIES_DETAILS; attempt++) {
    const { status, data } = await request<unknown>(wellKnownUrl);
    lastStatus = status;
    lastData = data;
    if (status >= 200 && status < 300 && isLnurlpDetailsResponse(data)) {
      return { ok: true, data };
    }
    if (attempt < MAX_RETRIES_DETAILS && isRetryableStatus(status)) {
      retries++;
      await sleep(RETRY_DELAY_MS);
      continue;
    }
    break;
  }
  return {
    ok: false,
    failure: {
      step: 'details',
      status: lastStatus,
      reason: extractReason(lastData),
      retries,
    },
  };
};

/**
 * Fetches LNURLp details using LUD-16 only (well-known URL).
 * Retries up to MAX_RETRIES_DETAILS on 429 or 5xx. Returns structured success or failure.
 */
export const fetchLnurlDetails = async ({
  lnurlOrAddress,
}: FetchLnurlDetailsParams): Promise<FetchLnurlDetailsResult> => {
  const wellKnownUrl = buildWellKnownLnurlpUrl(lnurlOrAddress);
  if (!wellKnownUrl) {
    return {
      ok: false,
      failure: { step: 'details', status: 0, retries: 0 },
    };
  }
  return fetchDetailsFromWellKnown(wellKnownUrl);
};

/**
 * Requests an invoice from the LNURLp callback URL.
 * Retries up to MAX_RETRIES_INVOICE (1 retry = 2 total attempts) on 400, 429, or 5xx.
 * Calls onAttemptFailed after each failed attempt with 1-based attempt number and message.
 */
const fetchInvoiceFromCallback = async (
  callback: string,
  amountMsat: number,
  lnurlOrAddress: string,
  comment?: string,
  zapRequest?: string,
  onAttemptFailed?: (attemptNumber: number, message: string) => void
): Promise<FetchLnurlInvoiceResult> => {
  const callbackUrl = new URL(callback);
  if (isLocalhostAddress(lnurlOrAddress)) {
    const atIndex = lnurlOrAddress.indexOf('@');
    const authorityFromAddress =
      atIndex !== -1 ? lnurlOrAddress.slice(atIndex + 1) : callbackUrl.host;
    callbackUrl.host = authorityFromAddress;
  }
  callbackUrl.searchParams.set('amount', String(amountMsat));
  if (comment) {
    callbackUrl.searchParams.set('comment', comment);
  }
  if (zapRequest) {
    callbackUrl.searchParams.set('zapRequest', zapRequest);
  }
  const callbackUrlStr = callbackUrl.toString();
  let lastStatus = 0;
  let lastData: unknown;
  let retries = 0;
  for (let attempt = 0; attempt <= MAX_RETRIES_INVOICE; attempt++) {
    const controller = new AbortController();
    const timeoutMs = 20_000;
    const attemptNumber = attempt + 1;
    const reportFailure = (status: number, data: unknown) => {
      const failure: LnurlpFailure = {
        step: 'invoice',
        status,
        reason: extractReason(data),
        retries: 0,
      };
      const message = buildProviderErrorMessage(failure, 'LNURL invoice');
      onAttemptFailed?.(attemptNumber, message);
    };
    try {
      const { status, data } = await request<unknown>(callbackUrlStr, undefined, {
        controller,
        timeoutMs,
      });
      lastStatus = status;
      lastData = data;
      if (status >= 200 && status < 300 && isLnurlpInvoiceResponse(data)) {
        return { ok: true, data };
      }
      reportFailure(lastStatus, lastData);
      if (attempt < MAX_RETRIES_INVOICE && isRetryableStatusForInvoice(status)) {
        retries++;
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      break;
    } catch (err) {
      const response = (err as { response?: { status?: number; data?: unknown } })?.response;
      if (response !== undefined) {
        lastStatus = response.status ?? 0;
        lastData = response.data;
        reportFailure(lastStatus, lastData);
        if (attempt < MAX_RETRIES_INVOICE && isRetryableStatusForInvoice(lastStatus)) {
          retries++;
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        const failure: LnurlpFailure = {
          step: 'invoice',
          status: lastStatus,
          reason: extractReason(lastData),
          retries,
        };
        const msg = buildProviderErrorMessage(failure, 'LNURL invoice');
        const e = new Error(msg);
        attachProviderFailure(e, failure);
        throw e;
      }
      throw err;
    }
  }
  return {
    ok: false,
    failure: {
      step: 'invoice',
      status: lastStatus,
      reason: extractReason(lastData),
      retries,
    },
  };
};

export const fetchLnurlInvoice = async (
  params: FetchLnurlInvoiceParams,
  details: LnurlpDetailsResponse
): Promise<FetchLnurlInvoiceResult> => {
  const { lnurlOrAddress, amountMsat, comment, zapRequest, onAttemptFailed } = params;
  return fetchInvoiceFromCallback(
    details.callback,
    amountMsat,
    lnurlOrAddress,
    comment,
    zapRequest,
    onAttemptFailed
  );
};
