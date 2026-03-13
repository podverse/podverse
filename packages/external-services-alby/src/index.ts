import { request } from '@podverse/helpers-requests';

export const ALBY_SANDBOX_BASE_URL = 'https://sandbox.albylabs.com';
export const ALBY_LNURL_DETAILS_URL = 'https://api.getalby.com/lnurl/lightning-address-details';
export const ALBY_LNURL_INVOICE_URL = 'https://api.getalby.com/lnurl/generate-invoice';

// TODO: Support production Alby config and remote overrides.

export type AlbyLnurlDetailsResponse = {
  callback: string;
  maxSendable: number;
  minSendable: number;
  metadata: string;
  tag: string;
  commentAllowed?: number;
  allowsNostr?: boolean;
  nostrPubkey?: string;
};

export type AlbyLnurlInvoiceResponse = {
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
};

const getRecordValue = (value: unknown, key: string): unknown => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  return Object.getOwnPropertyDescriptor(value, key)?.value;
};

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value);

const isAlbyLnurlDetailsResponse = (value: unknown): value is AlbyLnurlDetailsResponse => {
  const callback = getRecordValue(value, 'callback');
  const maxSendable = getRecordValue(value, 'maxSendable');
  const minSendable = getRecordValue(value, 'minSendable');
  const metadata = getRecordValue(value, 'metadata');
  const tag = getRecordValue(value, 'tag');
  const commentAllowed = getRecordValue(value, 'commentAllowed');

  return (
    typeof callback === 'string' &&
    typeof metadata === 'string' &&
    typeof tag === 'string' &&
    isNumber(maxSendable) &&
    isNumber(minSendable) &&
    (commentAllowed === undefined || isNumber(commentAllowed))
  );
};

const isAlbyLnurlInvoiceResponse = (value: unknown): value is AlbyLnurlInvoiceResponse => {
  const pr = getRecordValue(value, 'pr');
  const routes = getRecordValue(value, 'routes');
  return typeof pr === 'string' && Array.isArray(routes);
};

/**
 * Returns true when the lightning address domain is localhost or 127.0.0.1,
 * indicating a local dev environment where the Alby proxy cannot be used.
 */
const isLocalhostAddress = (lnurlOrAddress: string): boolean => {
  const atIndex = lnurlOrAddress.indexOf('@');
  if (atIndex === -1) return false;
  const domain = lnurlOrAddress.slice(atIndex + 1);
  return domain.startsWith('localhost') || domain.startsWith('127.0.0.1');
};

/**
 * Constructs a direct LNURL-pay well-known URL for a lightning address.
 * Uses http (not https) for localhost per the LNURL spec (LUD-06).
 */
const buildLocalLnurlpUrl = (lnurlOrAddress: string): string | null => {
  const atIndex = lnurlOrAddress.indexOf('@');
  if (atIndex === -1) return null;
  const username = lnurlOrAddress.slice(0, atIndex);
  const domain = lnurlOrAddress.slice(atIndex + 1);
  if (!username || !domain) return null;
  return `http://${domain}/.well-known/lnurlp/${encodeURIComponent(username)}`;
};

export const fetchLnurlDetails = async ({
  lnurlOrAddress,
}: FetchLnurlDetailsParams): Promise<AlbyLnurlDetailsResponse | null> => {
  if (isLocalhostAddress(lnurlOrAddress)) {
    // Bypass Alby proxy: resolve directly from the local LNURL server
    const url = buildLocalLnurlpUrl(lnurlOrAddress);
    if (!url) return null;
    const { status, data } = await request<unknown>(url);
    if (status < 200 || status >= 300) return null;
    return isAlbyLnurlDetailsResponse(data) ? data : null;
  }

  const url = `${ALBY_LNURL_DETAILS_URL}?lnurl_or_address=${encodeURIComponent(lnurlOrAddress)}`;
  const { status, data } = await request<unknown>(url);
  if (status < 200 || status >= 300) {
    return null;
  }
  return isAlbyLnurlDetailsResponse(data) ? data : null;
};

export const fetchLnurlInvoice = async ({
  lnurlOrAddress,
  amountMsat,
  comment,
  zapRequest,
}: FetchLnurlInvoiceParams): Promise<AlbyLnurlInvoiceResponse | null> => {
  if (isLocalhostAddress(lnurlOrAddress)) {
    // Bypass Alby proxy: first get the LNURL details to obtain the callback URL,
    // then GET the callback directly with amount + optional comment (LUD-06 flow).
    const details = await fetchLnurlDetails({ lnurlOrAddress });
    if (!details?.callback) return null;
    const callbackUrl = new URL(details.callback);
    // Use the same host as the lightning address so the browser doesn't abort when
    // the server returns a callback with 127.0.0.1 while the page is on localhost (or vice versa).
    const atIndex = lnurlOrAddress.indexOf('@');
    const authorityFromAddress =
      atIndex !== -1 ? lnurlOrAddress.slice(atIndex + 1) : callbackUrl.host;
    callbackUrl.host = authorityFromAddress;
    callbackUrl.searchParams.set('amount', String(amountMsat));
    if (comment) {
      callbackUrl.searchParams.set('comment', comment);
    }
    const callbackUrlStr = callbackUrl.toString();
    const controller = new AbortController();
    const timeoutMs = 20_000;
    const { status, data } = await request<unknown>(callbackUrlStr, undefined, {
      controller,
      timeoutMs,
    });
    if (status < 200 || status >= 300) return null;
    return isAlbyLnurlInvoiceResponse(data) ? data : null;
  }

  const { status, data } = await request<unknown>(ALBY_LNURL_INVOICE_URL, {
    data: {
      amount: amountMsat,
      lnurl_or_address: lnurlOrAddress,
      ...(comment ? { comment } : undefined),
      ...(zapRequest ? { zapRequest } : undefined),
    },
    method: 'POST',
  });
  if (status < 200 || status >= 300) {
    return null;
  }
  return isAlbyLnurlInvoiceResponse(data) ? data : null;
};
