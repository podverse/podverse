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

export const fetchLnurlDetails = async ({
  lnurlOrAddress,
}: FetchLnurlDetailsParams): Promise<AlbyLnurlDetailsResponse | null> => {
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
