import { attachProviderFailure, buildProviderErrorMessage } from '@podverse/v4v-helpers';

import type { BoostPaymentProvider } from './boostPaymentProvider.js';
import type { LnurlpDetailsResponse } from './lnurlp.js';
import { fetchLnurlDetails, fetchLnurlInvoice } from './lnurlp.js';

export type SendLnaddressPaymentParams = {
  recipientAddress: string;
  amountMsat: number;
  desc: string | null;
  provider: BoostPaymentProvider;
  /** Called after each failed invoice attempt (1-based) with the error message for that attempt. */
  onAttemptFailed?: (attemptNumber: number, message: string) => void;
};

export type SendKeysendPaymentParams = {
  destination: string;
  amountSats: number;
  customRecords?: Record<string, string>;
  provider: BoostPaymentProvider;
};

export const getLnurlComment = (
  details: LnurlpDetailsResponse,
  desc: string | null
): string | undefined => {
  if (!desc) {
    return undefined;
  }
  if (details.commentAllowed === undefined) {
    return undefined;
  }
  return desc.length <= details.commentAllowed ? desc : undefined;
};

const stepLabelFor = (step: 'details' | 'invoice'): string =>
  step === 'details' ? 'LNURL details' : 'LNURL invoice';

export const sendLnaddressPayment = async ({
  recipientAddress,
  amountMsat,
  desc,
  provider,
  onAttemptFailed,
}: SendLnaddressPaymentParams): Promise<void> => {
  const detailsResult = await fetchLnurlDetails({ lnurlOrAddress: recipientAddress });
  if (!detailsResult.ok) {
    const msg = buildProviderErrorMessage(detailsResult.failure, stepLabelFor('details'));
    const err = new Error(msg);
    attachProviderFailure(err, detailsResult.failure);
    throw err;
  }
  const lnurlDetails = detailsResult.data;
  if (amountMsat < lnurlDetails.minSendable || amountMsat > lnurlDetails.maxSendable) {
    throw new Error('Payment amount outside LNURL limits.');
  }
  const comment = getLnurlComment(lnurlDetails, desc);
  const invoiceResult = await fetchLnurlInvoice(
    { lnurlOrAddress: recipientAddress, amountMsat, comment, onAttemptFailed },
    lnurlDetails
  );
  if (!invoiceResult.ok) {
    const msg = buildProviderErrorMessage(invoiceResult.failure, stepLabelFor('invoice'));
    const err = new Error(msg);
    attachProviderFailure(err, invoiceResult.failure);
    throw err;
  }
  const invoice = invoiceResult.data;
  if (!invoice?.pr) {
    throw new Error('Unable to fetch LNURL invoice.');
  }
  await provider.payInvoice(invoice.pr);
};

export const sendKeysendPayment = async ({
  destination,
  amountSats,
  customRecords,
  provider,
}: SendKeysendPaymentParams): Promise<void> => {
  await provider.keysend({
    destination,
    amountSats,
    customRecords,
  });
};
